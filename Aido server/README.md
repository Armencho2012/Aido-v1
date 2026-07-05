# AIDO Backend Server

This folder contains the backend voice API for the AIDO project. It is API-only and does not include a browser UI.

## What it provides

- `POST /api/voice` for audio or text input
- Speech-to-text via Groq Whisper
- Chat completion via Groq LLM
- Optional text-to-speech output for robot clients

## Usage

Send either:

- `multipart/form-data` with an audio file field named `audio`
- `application/json` with a body such as `{ "text": "Hello" }`

Example request:

```bash
curl -X POST "http://localhost:3000/api/voice" \
  -H "Content-Type: application/json" \
  -d '{"text":"Tell me Newton\'s second law."}'
```

## Environment variables

- `GROQ_API_KEY` — required
- `GROQ_STT_MODEL` — optional, default `whisper-large-v3-turbo`
- `GROQ_CHAT_MODEL` — optional, default `llama-3.1-8b-instant`

## Local development

```bash
cd "Aido server"
npm install
GROQ_API_KEY=your_key_here npx vercel dev
```

## Notes

- No frontend is served from this folder.
- Use the API directly from robot code, mobile apps, or other clients.
