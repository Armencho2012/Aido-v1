import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

const extractText = (data: any) => {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map((part: any) => part?.text).filter(Boolean).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const elevenKey = Deno.env.get('ELEVEN_LABS_API_KEY')
    const voiceId = Deno.env.get('ELEVEN_LABS_VOICE_ID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!geminiKey || !elevenKey) {
      return jsonResponse({ error: 'Missing API keys' }, 500)
    }

    if (!voiceId) {
      return jsonResponse({ error: 'Missing ElevenLabs voice ID' }, 500)
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase service role configuration' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const topic =
      body?.topic?.trim() || body?.knowledgeGap?.trim() || body?.prompt?.trim()

    if (!topic) {
      return jsonResponse({ error: 'Topic or knowledgeGap is required' }, 400)
    }

    const prompt = `Create a concise, engaging 1-minute podcast-style script for a student about: ${topic}. Keep it clear, energetic, and focused on the key insight. End with a one-sentence takeaway.`

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
        })
      }
    )

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

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
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
      }
    )

    if (!ttsRes.ok) {
      const errorText = await ttsRes.text().catch(() => '')
      return jsonResponse(
        { error: 'ElevenLabs TTS failed', status: ttsRes.status, detail: errorText },
        ttsRes.status
      )
    }

    const audioBuffer = await ttsRes.arrayBuffer()
    const contentType = ttsRes.headers.get('content-type') || 'audio/mpeg'
    const ext = contentType.includes('mpeg') || contentType.includes('mp3') ? 'mp3' : 'audio'
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('podcasts')
      .upload(filename, new Uint8Array(audioBuffer), {
        contentType,
        upsert: true
      })

    if (uploadError) {
      return jsonResponse({ error: 'Failed to store audio' }, 500)
    }

    const { data: urlData } = supabaseAdmin.storage.from('podcasts').getPublicUrl(filename)
    const podcastUrl = urlData?.publicUrl

    if (!podcastUrl) {
      return jsonResponse({ error: 'Failed to generate public URL' }, 500)
    }

    return jsonResponse({ podcast_url: podcastUrl }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
