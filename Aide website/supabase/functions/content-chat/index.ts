import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const GEMINI_API_VERSION = Deno.env.get("GEMINI_API_VERSION")?.trim() || "v1beta";
const GEMINI_MODEL = Deno.env.get("GEMINI_TEXT_MODEL")?.trim() || "gemini-flash-latest";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { question, contentText, analysisData, language, chatHistory, activeNodeContext } = body;

    if (!question || !contentText) {
      return new Response(JSON.stringify({ error: "Question and content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured (GEMINI_API_KEY/LOVABLE_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build context from analysis
    const summaryContext = Array.isArray(analysisData?.three_bullet_summary)
      ? analysisData.three_bullet_summary.join('\n')
      : '';
    const termsContext = Array.isArray(analysisData?.key_terms)
      ? analysisData.key_terms
        .map((term: any) => (typeof term === "string" ? term : term?.term))
        .filter(Boolean)
        .join(', ')
      : '';

    // CONTEXTUAL INJECTION: Add selected node context if provided
    const nodeContext = activeNodeContext
      ? `\n--- ACTIVE NODE CONTEXT ---\nFocused Node: ${activeNodeContext.label}\nDescription: ${activeNodeContext.description}\nCategory: ${activeNodeContext.category}\nPlease prioritize this context in your explanation if relevant.`
      : '';

    const languageInstruction = {
      'en': 'Respond in English.',
      'ru': 'Отвечайте на русском языке.',
      'hy': 'Պատասխանեք հայերեն։',
      'ko': '한국어로 답변하세요.'
    }[language as string] || 'Respond in English.';

    const wantsCitation = typeof question === 'string' && /where is this from|cite the source|citation|source/i.test(question);
    const privacyInstruction = wantsCitation
      ? 'If the user requests a source, cite only the relevant idea from the provided context (no filenames or file paths). Keep the reference brief.'
      : 'Do NOT mention filenames, file paths, URLs, or source metadata. Answer directly without adding citations unless explicitly asked.';

    // Build chat history for context
    const historyContext = chatHistory
      ?.slice(-6) // Last 6 messages for context
      ?.map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      ?.join('\n') || '';

    const systemPrompt = `You are a powerful education engine. Help the student understand the material.

OUTPUT CONSTRAINTS:
1. ${languageInstruction}
2. Structure your answer using markdown.
3. ${privacyInstruction}
4. If you use math, use LaTeX format like $x^2$.
5. Keep the tone Socratic and concept-focused; prefer questions that guide the student to think.

--- ORIGINAL CONTENT ---
${contentText.substring(0, 10000)}
${nodeContext}

--- ANALYSIS SNAPSHOT ---
Summary:
${summaryContext}

Key Terms:
${termsContext}

--- PREVIOUS CONVERSATION ---
${historyContext}`;

    const selectedModel = GEMINI_MODEL;
    const selectedApiVersion = GEMINI_API_VERSION;
    const endpoint = `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: "user",
          parts: [{ text: question }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later.", details: errorText }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      console.error(`Gemini API error (${selectedModel} @ ${selectedApiVersion}):`, response.status, errorText);
      return new Response(JSON.stringify({ error: "Gemini API error", model: selectedModel, apiVersion: selectedApiVersion, details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return;
      }

      try {
        let buffer = "";
        let emittedText = "";

        const writeFromChunk = async (jsonStr: string) => {
          if (!jsonStr || jsonStr === "[DONE]") return;
          try {
            const data = JSON.parse(jsonStr);
            const parts = data?.candidates?.[0]?.content?.parts;
            if (!Array.isArray(parts)) return;
            const text = parts
              .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
              .join("");
            if (!text) return;

            if (text.startsWith(emittedText)) {
              const delta = text.slice(emittedText.length);
              emittedText = text;
              if (delta) await writer.write(encoder.encode(delta));
              return;
            }

            emittedText += text;
            await writer.write(encoder.encode(text));
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data:')) continue;
            await writeFromChunk(line.slice(5).trim());
          }
        }
        
        if (buffer.trim() && buffer.startsWith('data:')) {
          await writeFromChunk(buffer.slice(5).trim());
        }
      } catch (e) {
        console.error("Streaming error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (err) {
    const error = err as Error;
    console.error("Content chat error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
