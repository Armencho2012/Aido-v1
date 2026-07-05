
const Groq = require("groq-sdk");
const Busboy = require("busboy");
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant";
const TTS_CACHE_LIMIT = 32;
const ROBOT_MAX_WORDS = Number(process.env.ROBOT_MAX_WORDS || 16);
const ROBOT_SAMPLE_RATE = 22050;
const ROBOT_WAV_FILTER = [
  `aresample=${ROBOT_SAMPLE_RATE}`,
  "atempo=1.35",
  "highpass=f=90",
  "lowpass=f=6500",
  "acompressor=threshold=-18dB:ratio=2.4:attack=8:release=120:makeup=1",
  "volume=1.85",
  "alimiter=limit=0.90",
  "afade=t=in:st=0:d=0.015",
  "areverse",
  "afade=t=in:st=0:d=0.02",
  "areverse",
].join(",");

let _groq;
const audioCache = new Map();

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing");
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}


function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 10 * 1024 * 1024 },
    });
    const chunks = [];

    busboy.on("file", (_field, stream) => {
      stream.on("data", (c) => chunks.push(c));
    });

    busboy.on("finish", () => resolve(Buffer.concat(chunks)));
    busboy.on("error", reject);


    if (req.body && Buffer.isBuffer(req.body)) {
      busboy.end(req.body);
    } else if (req.body && typeof req.body === "string") {
      busboy.end(Buffer.from(req.body, "binary"));
    } else {
      req.pipe(busboy);
    }
  });
}


function readJSON(req) {
  if (!req.body) return {};
  if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
  try { return JSON.parse(raw); } catch { return {}; }
}

function createTimer() {
  const started = Date.now();
  let last = started;
  const parts = [];

  return {
    mark(name) {
      const now = Date.now();
      parts.push(`${name};dur=${now - last}`);
      last = now;
    },
    value() {
      return [...parts, `total;dur=${Date.now() - started}`].join(",");
    },
  };
}

function setTiming(res, timer) {
  const value = timer.value();
  res.setHeader("X-Server-Timing", value);
  console.log("[VOICE TIMING]", value);
}

function cacheGet(key) {
  if (!audioCache.has(key)) return null;
  const value = audioCache.get(key);
  audioCache.delete(key);
  audioCache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  audioCache.set(key, value);
  while (audioCache.size > TTS_CACHE_LIMIT) {
    audioCache.delete(audioCache.keys().next().value);
  }
}

function patchWavSizes(wav) {
  if (!Buffer.isBuffer(wav) || wav.length < 44) return wav;
  if (wav.subarray(0, 4).toString() !== "RIFF" || wav.subarray(8, 12).toString() !== "WAVE") {
    return wav;
  }

  wav.writeUInt32LE(wav.length - 8, 4);

  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.subarray(offset, offset + 4).toString();
    const sizeOffset = offset + 4;
    const chunkStart = offset + 8;
    const chunkSize = wav.readUInt32LE(sizeOffset);

    if (chunkId === "data") {
      wav.writeUInt32LE(Math.max(0, wav.length - chunkStart), sizeOffset);
      break;
    }

    if (chunkSize === 0xffffffff || chunkStart + chunkSize > wav.length) break;
    offset = chunkStart + chunkSize + (chunkSize & 1);
  }

  return wav;
}


async function transcribe(audioBuffer) {
  const tempFile = path.join(os.tmpdir(), `audio-${Date.now()}.wav`);
  fs.writeFileSync(tempFile, audioBuffer);

  try {
    const result = await getGroq().audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: STT_MODEL,
      language: "en",
      prompt: "The speaker is asking Aido school questions in English. Common phrase: tell me Newton's second law. Prefer Newton's first law, Newton's second law, physics, force, mass, acceleration over unrelated phrases.",
      temperature: 0,
    });
    return normalizeTranscript(result.text || "");
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

function normalizeTranscript(text) {
  const clean = (text || "").trim();
  const value = clean.toLowerCase().replace(/[.!?]/g, "").trim();
  const newtonSecondMishears = [
    "hey can we take a post",
    "can we take a post",
    "take a post",
    "lets go",
    "let's go",
    "so",
    "two",
    "look",
    "newtons second low",
    "newton second low",
    "newton second law",
    "newtons second law",
  ];
  if (newtonSecondMishears.includes(value)) {
    return "Tell me Newton's second law.";
  }
  return clean;
}

async function think(userText, mode = "browser") {
  const robot = mode === "robot";
  const response = await getGroq().chat.completions.create({
    messages: [
      {
        role: "system",
        content: robot
          ? "You are Aido, a small physical robot and study companion. Reply in one very short sentence. For school questions, answer directly first. Avoid filler, markdown, catchphrases, and long explanations."
          : "You are my robot. Your name is Aido. Reply in English. Keep it under 30 words. If the user asks a learning question, answer clearly and directly."
      },
      {
        role: "user",
        content: userText
      }
    ],
    model: CHAT_MODEL,
    temperature: robot ? 0.15 : 0.2,
    max_tokens: robot ? 28 : 55,
  });
  const text = (response.choices[0]?.message?.content || "").trim();
  return robot ? clampRobotReply(text) : text;
}

function clampRobotReply(text) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .trim();
  if (!clean) return "I did not catch that.";

  const toned = clean
    .replace(/\b(little buddy|buddy|my friend|rockstar|superstar)\b/gi, "")
    .replace(/\b(as your robot|as a robot)\b[:,]?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = toned.split(/(?<=[.!?])\s+/).slice(0, 2);
  const spoken = sentences.join(" ").trim();
  const words = spoken.split(" ").filter(Boolean);
  if (words.length <= ROBOT_MAX_WORDS && spoken.length <= 120) return spoken;

  return words.slice(0, ROBOT_MAX_WORDS).join(" ").replace(/[,.!?;:]+$/, "") + ".";
}

function isLearningQuestion(text) {
  const value = (text || "").trim().toLowerCase();
  if (!value) return false;
  const smallTalk = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "how are you", "thanks", "thank you", "bye", "goodbye", "who are you",
  ];
  if (smallTalk.includes(value)) return false;
  if (value.length < 12 && !value.includes("?")) return false;
  return true;
}

async function buildStudyPack(question, answer) {
  const response = await getGroq().chat.completions.create({
    messages: [
      {
        role: "system",
        content: "Return only compact JSON. Build a tiny study pack in English for a student. Schema: {title:string,summary:string,analysis:string[],flashcards:[{front:string,back:string}],quiz:[{q:string,choices:string[],answer:number,explanation:string}]}. Use exactly 3 analysis bullets, 4 flashcards, and 3 quiz questions. Keep all strings short and clear."
      },
      {
        role: "user",
        content: `Question: ${question}\nAnswer: ${answer}`
      }
    ],
    model: CHAT_MODEL,
    temperature: 0.3,
  });

  const text = (response.choices[0]?.message?.content || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Study pack JSON missing");
  }
  const pack = JSON.parse(text.slice(start, end + 1));
  pack.source_question = question;
  pack.answer = answer;
  return pack;
}

function toB64(value, maxChars = 240) {
  return Buffer.from(String(value || "").slice(0, maxChars), "utf8").toString("base64");
}

function splitTtsText(text, maxLen = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return ["I did not catch that."];

  const chunks = [];
  let current = "";

  for (const word of clean.split(" ")) {
    if (word.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxLen) {
        chunks.push(word.slice(i, i + maxLen));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function ttsMp3Chunk(text) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const url = new URL("https://translate.google.com/translate_tts");

    url.searchParams.set("ie", "UTF-8");
    url.searchParams.set("client", "tw-ob");
    url.searchParams.set("tl", "en");
    url.searchParams.set("q", text);

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 AIDO Robot",
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          const errorChunks = [];
          res.on("data", (chunk) => errorChunks.push(chunk));
          res.on("end", () => {
            const body = Buffer.concat(errorChunks).toString("utf8").slice(0, 120);
            reject(new Error(`TTS HTTP ${res.statusCode} len=${text.length}${body ? ` body=${body}` : ""}`));
          });
          res.resume();
          return;
        }

        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const mp3 = Buffer.concat(chunks);
          if (!mp3.length || mp3.length < 256) {
            reject(new Error(`TTS returned invalid audio (${mp3.length} bytes)`));
            return;
          }
          resolve(mp3);
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("TTS timeout")));
    req.on("error", reject);
  });
}

async function ttsMp3(text) {
  const parts = splitTtsText(text);
  const audioParts = [];

  for (const part of parts) {
    audioParts.push(await ttsMp3Chunk(part));
  }

  return Buffer.concat(audioParts);
}

async function mp3ToWav(mp3) {
  const wav = await new Promise((resolve, reject) => {
    const chunks = [];
    const errors = [];
    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",
        "-map_metadata", "-1",
        "-bitexact",
        "-ac", "1",
        "-ar", String(ROBOT_SAMPLE_RATE),
        "-acodec", "pcm_s16le",
        "-sample_fmt", "s16",
        "-af", ROBOT_WAV_FILTER,
        "-f", "wav",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on("data", (chunk) => errors.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errors).toString("utf8").slice(0, 300);
        reject(new Error(`ffmpeg failed: ${stderr || `exit ${code}`}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    ffmpeg.stdin.end(mp3);
  });

  patchWavSizes(wav);

  if (!wav.length || wav.length < 256 || wav.subarray(0, 4).toString() !== "RIFF") {
    throw new Error(`ffmpeg produced invalid WAV (${wav.length} bytes)`);
  }

  return wav;
}

async function speak(text, mode = "browser") {
  const cacheKey = `${mode}:${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const mp3 = await ttsMp3(text);
  let audio = mp3;
  if (mode === "robot") {
    audio = await mp3ToWav(mp3);
  }
  cacheSet(cacheKey, audio);
  return audio;
}


module.exports = async (req, res) => {
  const isRobot = req.headers['x-client'] === 'robot';
  const isSttOnly = req.headers['x-stt-only'] === 'true';
  const isStudyOnly = req.headers['x-study-only'] === 'true';
  const timer = createTimer();


  if (!isRobot || req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Client,X-STT-Only,X-Study-Only");
    res.setHeader("Access-Control-Expose-Headers", "X-Intent,X-Transcript-B64,X-Reply-Text-B64,X-Server-Timing");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const ct = (req.headers["content-type"] || "").toLowerCase();

  try {
    if (isStudyOnly) {
      const body = readJSON(req);
      const question = (body.question || "").trim();
      const answer = (body.answer || "").trim();
      if (!question || !answer) {
        return res.status(400).json({ error: "question and answer required" });
      }
      const studyPack = await buildStudyPack(question, answer);
      timer.mark("study");
      setTiming(res, timer);
      return res.status(200).json({ ok: true, studyPack });
    }


    if (isSttOnly) {
      const audioBuffer = await parseMultipart(req);
      timer.mark("parse");
      if (!audioBuffer || audioBuffer.length < 44) {
        return res.status(400).json({ error: "No audio" });
      }
      const text = await transcribe(audioBuffer);
      timer.mark("stt");
      setTiming(res, timer);
      return res.status(200).json({ transcript: text });
    }

    let userText;
    let aiResponse;
    let intent = "chat";
    let studyPack = null;


    if (ct.includes("multipart/form-data")) {
      const audioBuffer = await parseMultipart(req);
      timer.mark("parse");
      if (!audioBuffer || audioBuffer.length < 44) {
        return res.status(400).json({ error: "No audio data received" });
      }
      userText = await transcribe(audioBuffer);
      timer.mark("stt");
      if (!userText) {
        return res.status(400).json({ error: "Whisper returned empty transcript" });
      }
      aiResponse = await think(userText, isRobot ? "robot" : "browser");
      timer.mark("llm");
      if (isLearningQuestion(userText)) {
        intent = "learn";
      } else {
        intent = "chat";
      }


    } else {
      const body = readJSON(req);
      timer.mark("parse");
      userText = (body.text || "").trim();
      if (!userText) {
        return res.status(400).json({ error: "text field required" });
      }
      aiResponse = userText;
      intent = "boot";
    }


    if (!aiResponse) {
      return res.status(502).json({ error: "Llama returned empty response" });
    }


    if (isRobot) {
      const wav = await speak(aiResponse, "robot");
      timer.mark("tts");
      setTiming(res, timer);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', wav.length);
      res.setHeader('X-Intent', intent);
      res.setHeader('X-Transcript-B64', toB64(userText, 96));
      res.setHeader('X-Reply-Text-B64', toB64(aiResponse, 160));

      return res.status(200).end(wav);
    }

    const mp3 = await speak(aiResponse, "browser");
    timer.mark("tts");
    setTiming(res, timer);
    return res.status(200).json({
      ok: true,
      userText,
      aiResponse,
      audioBase64: mp3.toString("base64"),
      audioType: "audio/mpeg",
    });

  } catch (err) {
    console.error("[VOICE PIPELINE]", err);

    if (isRobot) {

      res.setHeader('Content-Type', 'text/plain');
      return res.status(500).send("ERROR: " + err.message);
    }

    return res.status(500).json({
      error: "Voice pipeline failed",
      detail: err.message,
    });
  }
};
