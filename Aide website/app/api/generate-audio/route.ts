export const runtime = 'edge'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

const extractText = (data: any) => {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map((part: any) => part?.text).filter(Boolean).join('')
}

export async function POST(req: Request) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY
    const elevenKey = process.env.ELEVEN_LABS_API_KEY

    if (!geminiKey || !elevenKey) {
      return jsonResponse({ error: 'Missing API keys' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const topic = body?.topic?.trim() || body?.knowledgeGap?.trim()
    const voiceId = body?.voiceId?.trim() || process.env.ELEVEN_LABS_VOICE_ID

    if (!topic) {
      return jsonResponse({ error: 'Topic or knowledgeGap is required' }, 400)
    }

    if (!voiceId) {
      return jsonResponse({ error: 'voiceId is required for ElevenLabs TTS' }, 400)
    }

    const prompt = `Create a concise, engaging 1-minute podcast-style script for a student about: ${topic}. Keep it clear, energetic, and focused on the key insight. End with a one-sentence takeaway.`

    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
      })
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text().catch(() => '')
      return jsonResponse(
        { error: 'Gemini generation failed', status: geminiRes.status, detail: errorText },
        geminiRes.status
      )
    }

    const geminiJson = await geminiRes.json().catch(() => null)
    const script = extractText(geminiJson).trim()

    if (!script) {
      return jsonResponse({ error: 'Gemini returned empty script' }, 502)
    }

    const ttsRes = await fetch(`${ELEVENLABS_ENDPOINT}/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'audio/mpeg',
        'xi-api-key': elevenKey
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2'
      })
    })

    if (!ttsRes.ok) {
      const errorText = await ttsRes.text().catch(() => '')
      return jsonResponse(
        { error: 'ElevenLabs TTS failed', status: ttsRes.status, detail: errorText },
        ttsRes.status
      )
    }

    const contentType = ttsRes.headers.get('content-type') || 'audio/mpeg'
    return new Response(ttsRes.body, { status: 200, headers: { 'Content-Type': contentType } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
}
