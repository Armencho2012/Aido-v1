import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./_shared-index.ts";

// Config Constants
const DAILY_LIMIT_FREE = 1;
const DAILY_LIMIT_PRO = 50;
const KNOWLEDGE_MAP_NODES_COUNT = 6;
const DEFAULT_QUIZ_COUNT = 5;
const DEFAULT_FLASHCARD_COUNT = 10;
const QUIZ_LIMITS = {
  free: { min: 1, max: 5 },
  pro: { min: 1, max: 15 },
  class: { min: 1, max: 50 }
};
const FLASHCARD_LIMITS = {
  free: { min: 1, max: 5 },
  pro: { min: 1, max: 20 },
  class: { min: 1, max: 40 }
};
const BASE_MAX_TOKENS = 4096;
const PRO_MAP_MAX_TOKENS = 6144;
const GEMINI_API_VERSION = Deno.env.get("GEMINI_API_VERSION")?.trim() || "v1beta";
const GEMINI_MODEL = Deno.env.get("GEMINI_TEXT_MODEL")?.trim() || "gemini-flash-latest";
const GEMINI_MAX_ATTEMPTS = Math.max(Number(Deno.env.get("GEMINI_MAX_ATTEMPTS")?.trim() || "2"), 1);
const GEMINI_RETRY_BASE_MS = Math.max(Number(Deno.env.get("GEMINI_RETRY_BASE_MS")?.trim() || "700"), 100);
const GEMINI_REQUEST_TIMEOUT_MS = Math.max(Number(Deno.env.get("GEMINI_REQUEST_TIMEOUT_MS")?.trim() || "25000"), 5000);

const extractGeminiText = (payload: any): string => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("");
};

const parseGeminiJson = (rawText: string): any => {
  const trimmed = rawText.trim();
  if (!trimmed) return {};
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const normalized = cleaned
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'");

  const tryParse = (value: string): any | null => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(normalized);
  if (direct) return direct;

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = normalized.slice(firstBrace, lastBrace + 1);
    const fromBraces = tryParse(candidate);
    if (fromBraces) return fromBraces;
  }

  const firstBracket = normalized.indexOf("[");
  const lastBracket = normalized.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const candidateArray = normalized.slice(firstBracket, lastBracket + 1);
    const fromArray = tryParse(candidateArray);
    if (fromArray) return { items: fromArray };
  }

  return {};
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const parseProviderError = (rawText: string): { message: string; status?: string; code?: number } => {
  const fallbackMessage = rawText?.trim()?.slice(0, 1200) || "Provider returned an unknown error";
  try {
    const parsed = JSON.parse(rawText);
    const candidate = typeof parsed?.error === "object" && parsed.error ? parsed.error : parsed;
    const message = typeof candidate?.message === "string" ? candidate.message : fallbackMessage;
    const status = typeof candidate?.status === "string" ? candidate.status : undefined;
    const code = typeof candidate?.code === "number" ? candidate.code : undefined;
    return { message, status, code };
  } catch {
    return { message: fallbackMessage };
  }
};

const isRetryableProviderFailure = (statusCode: number, providerStatus?: string, providerCode?: number): boolean => {
  if (statusCode === 429 || statusCode >= 500) return true;
  if (providerStatus === "UNAVAILABLE" || providerCode === 503) return true;
  return false;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Auth & Environment Validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey || !apiKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY/LOVABLE_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Parse Request & Check Limits
    const body = await req.json().catch(() => ({}));
    const { text, media, language = 'en', generationOptions, n_questions, n_flashcards } = body;
    const textInput = typeof text === "string" ? text : "";
    if (!text?.trim() && !media) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', user.id)
      .single();

    const userPlan = subscription?.status === 'active' ? (subscription.plan_type || 'free') : 'free';
    const isProOrClass = ['pro', 'class'].includes(userPlan);

    // Daily usage check via RPC
    if (userPlan !== 'class') {
      const { data: usageCount } = await supabase.rpc("get_daily_usage_count", { p_user_id: user.id });
      const dailyLimit = userPlan === 'pro' ? DAILY_LIMIT_PRO : DAILY_LIMIT_FREE;
      if ((usageCount || 0) >= dailyLimit) {
        return new Response(JSON.stringify({ error: "Daily limit reached. Upgrade for more." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Build conditional system prompt based on generation options
    const opts = {
      quiz: true,
      flashcards: true,
      map: false,
      course: false,
      podcast: false,
      ...(generationOptions || {})
    };

    const quizLimits = QUIZ_LIMITS[userPlan] || QUIZ_LIMITS.free;
    const flashcardLimits = FLASHCARD_LIMITS[userPlan] || FLASHCARD_LIMITS.free;
    const parseCount = (value: unknown, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return fallback;
    };
    const requestedQuizCount = parseCount(n_questions, parseCount(generationOptions?.n_questions, DEFAULT_QUIZ_COUNT));
    const requestedFlashcardCount = parseCount(n_flashcards, parseCount(generationOptions?.n_flashcards, DEFAULT_FLASHCARD_COUNT));
    const quizCount = opts.quiz
      ? Math.min(Math.max(requestedQuizCount, quizLimits.min), quizLimits.max)
      : 0;
    const flashcardCount = opts.flashcards
      ? Math.min(Math.max(requestedFlashcardCount, flashcardLimits.min), flashcardLimits.max)
      : 0;

    // 4. AI Integration using Gemini API
    const contentCharLimit = opts.map || opts.course ? 12000 : 15000;
    const contentContext = textInput.substring(0, contentCharLimit);
    const mediaContext = media ? "\n[Analyzing attached visual media]" : "";

    const sections = [];

    // Always include core sections
    sections.push(`"metadata": {"language": "${language}", "subject_domain": "string", "complexity_level": "beginner|intermediate|advanced"}`);
    sections.push(`"three_bullet_summary": ["string", "string", "string"]`);
    sections.push(`"key_terms": [{"term": "string", "definition": "string", "importance": "high|medium|low"}]`);
    sections.push(`"lesson_sections": [{"title": "string", "summary": "string", "key_takeaway": "string"}]`);

    // Conditional sections (only include if requested)
    if (opts.quiz) {
      sections.push(`"quiz_questions": [{"question": "string", "options": ["A", "B", "C", "D"], "correct_answer_index": 0, "explanation": "string", "difficulty": "easy|medium|hard"}]`);
    }

    if (opts.flashcards) {
      sections.push(`"flashcards": [{"front": "string", "back": "string"}]`);
    }

    if (opts.map) {
      sections.push(`"knowledge_map": {"nodes": [{"id": "n1", "label": "string", "category": "Concept|Problem|Technology|Science|History|Math|Language|Philosophy|Art|General", "description": "string", "source_snippet": "string", "is_high_yield": true}], "edges": [{"source": "n1", "target": "n2", "label": "string", "type": "enables|challenges|relates_to|is_a_type_of|essential_for", "direction": "uni|bi", "strength": 5}]}`);
    }

    const knowledgeMapInstruction = opts.map
      ? isProOrClass
        ? `Create exactly ${KNOWLEDGE_MAP_NODES_COUNT} knowledge map nodes with 2-4 sentence descriptions that are more detailed than the summary bullets, include concrete examples, and use clear categories. Each node must include a short source_snippet taken verbatim or near-verbatim from the input. Mark 1-2 nodes as is_high_yield: true. Include 8-12 edges with specific labels, types (enables, challenges, relates_to, is_a_type_of, essential_for), directions (uni or bi), and strengths from 1-5.`
        : `Create exactly ${KNOWLEDGE_MAP_NODES_COUNT} knowledge map nodes. Each node must include a source_snippet. Include 6-10 edges with labels, types, directions, and strengths.`
      : null;

    const systemPrompt = `You are a world-class education engine. Respond in ${language}.
Return a SINGLE JSON object exactly like this:
{
${sections.join(",\n")}
}

Math: Use LaTeX notation like $x^2$.
${opts.quiz ? `Create exactly ${quizCount} quiz questions.` : ''}
${opts.flashcards ? `Create exactly ${flashcardCount} flashcards.` : ''}
${knowledgeMapInstruction ?? ''}`.trim();

    const maxTokens = opts.map && isProOrClass ? PRO_MAP_MAX_TOKENS : BASE_MAX_TOKENS;

    console.log(`Analyzing for user: ${user.id} (Plan: ${userPlan}, Quiz: ${opts.quiz}, Flashcards: ${opts.flashcards}, Map: ${opts.map}, QuizCount: ${quizCount}, FlashcardsCount: ${flashcardCount})`);

    const createGeminiPayload = () => ({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: "user",
        parts: [{ text: `Content: ${contentContext}${mediaContext}` }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      }
    });
    const model = GEMINI_MODEL;
    const apiVersion = GEMINI_API_VERSION;
    const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
    let response: Response | null = null;
    let lastProviderError: { message: string; status?: string; code?: number } | null = null;
    let lastProviderStatus = 0;

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
      try {
        response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(createGeminiPayload())
        }, GEMINI_REQUEST_TIMEOUT_MS);
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        lastProviderError = { message: isAbort ? "Model provider request timed out." : "Failed to reach model provider." };
        lastProviderStatus = 504;
        const shouldRetry = attempt < GEMINI_MAX_ATTEMPTS - 1;
        console.error(
          `Gemini API request failure (${model} @ ${apiVersion}) attempt ${attempt + 1}/${GEMINI_MAX_ATTEMPTS}:`,
          lastProviderError.message
        );
        if (shouldRetry) {
          const delayMs = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
          await sleep(delayMs);
          continue;
        }
        return new Response(JSON.stringify({
          error: isAbort ? "The model request timed out. Please try again." : "Model provider is temporarily unreachable.",
          model,
          apiVersion,
          details: lastProviderError.message
        }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (response.ok) break;

      const providerErrorText = await response.text().catch(() => "");
      lastProviderError = parseProviderError(providerErrorText);
      lastProviderStatus = response.status;
      console.error(
        `Gemini API error (${model} @ ${apiVersion}) attempt ${attempt + 1}/${GEMINI_MAX_ATTEMPTS}:`,
        response.status,
        lastProviderError.message
      );

      const shouldRetry =
        attempt < GEMINI_MAX_ATTEMPTS - 1 &&
        isRetryableProviderFailure(response.status, lastProviderError.status, lastProviderError.code);

      if (shouldRetry) {
        const delayMs = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await sleep(delayMs);
        continue;
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: "Rate limits exceeded, please try again later.",
          model,
          apiVersion,
          details: lastProviderError.message
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (
        response.status === 503 ||
        lastProviderError.status === "UNAVAILABLE" ||
        lastProviderError.code === 503
      ) {
        return new Response(JSON.stringify({
          error: "The model is currently experiencing high demand. Please try again shortly.",
          model,
          apiVersion,
          details: lastProviderError.message
        }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        error: "Gemini API error",
        model,
        apiVersion,
        details: lastProviderError.message
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({
        error: "Model provider is temporarily unavailable.",
        model,
        apiVersion,
        details: lastProviderError?.message || `Provider returned ${lastProviderStatus || "unknown status"}`
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const responseData = await response.json().catch(() => null);
    if (!responseData) {
      return new Response(JSON.stringify({
        error: "Gemini returned an invalid JSON payload",
        model,
        apiVersion
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const jsonText = extractGeminiText(responseData);
    if (!jsonText) {
      return new Response(JSON.stringify({
        error: "Gemini returned an empty response",
        model,
        apiVersion,
        details: JSON.stringify({
          promptFeedback: responseData?.promptFeedback ?? null,
          finishReason: responseData?.candidates?.[0]?.finishReason ?? null
        })
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    let analysis = parseGeminiJson(jsonText);
    const summaryItems = Array.isArray(analysis?.three_bullet_summary)
      ? analysis.three_bullet_summary.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
      : [];
    if (summaryItems.length === 0) {
      return new Response(JSON.stringify({
        error: "Gemini returned invalid analysis JSON",
        model,
        apiVersion,
        details: jsonText.slice(0, 1200)
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate and ensure all required fields exist
    if (!analysis.metadata) {
      analysis.metadata = { language, subject_domain: "general", complexity_level: "intermediate" };
    }
    if (!analysis.three_bullet_summary) {
      analysis.three_bullet_summary = ["Summary not available", "Unable to analyze content", "Please try again"];
    }
    if (!analysis.key_terms) analysis.key_terms = [];
    if (!analysis.lesson_sections) analysis.lesson_sections = [];
    if (!analysis.quiz_questions) analysis.quiz_questions = [];
    if (!analysis.flashcards) analysis.flashcards = [];
    if (!analysis.knowledge_map) {
      analysis.knowledge_map = { nodes: [], edges: [] };
    }
    if (!opts.quiz) analysis.quiz_questions = [];
    if (!opts.flashcards) analysis.flashcards = [];
    if (!opts.map) analysis.knowledge_map = { nodes: [], edges: [] };

    if (analysis.knowledge_map?.nodes && Array.isArray(analysis.knowledge_map.nodes)) {
      analysis.knowledge_map.nodes = analysis.knowledge_map.nodes.map((node: any, idx: number) => ({
        id: node?.id || `n${idx + 1}`,
        label: node?.label || 'Node',
        category: node?.category || 'General',
        description: node?.description || '',
        source_snippet: node?.source_snippet || '',
        is_high_yield: Boolean(node?.is_high_yield),
      }));
    } else {
      analysis.knowledge_map.nodes = [];
    }

    if (analysis.knowledge_map?.edges && Array.isArray(analysis.knowledge_map.edges)) {
      analysis.knowledge_map.edges = analysis.knowledge_map.edges.map((edge: any, idx: number) => ({
        id: edge?.id || `e${idx + 1}`,
        source: edge?.source,
        target: edge?.target,
        label: edge?.label || edge?.type || 'relates to',
        type: edge?.type || 'relates_to',
        direction: edge?.direction || 'uni',
        strength: edge?.strength ?? 3,
      })).filter((edge: any) => edge.source && edge.target);
    } else {
      analysis.knowledge_map.edges = [];
    }

    // 5. Async Logging & Final Response
    supabaseAdmin.from("usage_logs").insert({ user_id: user.id, action_type: "analysis" }).then();

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    const error = err as Error;
    console.error("Critical Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

