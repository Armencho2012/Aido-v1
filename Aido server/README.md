# AIDO Backend Server

This folder contains the backend API for AIDO. It is API-only and does not include a browser UI. The endpoint is intended to be called directly from the robot, a mobile app, or another client.

## What it provides

- A voice pipeline endpoint for audio or text input
- Speech-to-text via Groq Whisper
- Chat responses via Groq LLM
- Optional text-to-speech audio output

## API endpoint

### POST /api/voice

Send either:

- `multipart/form-data` with an audio file field named `audio`
- `application/json` with a body such as `{ "text": "Hello" }`

Example:

```bash
curl -X POST "http://localhost:3000/api/voice" \
  -H "Content-Type: application/json" \
  -d '{"text":"Tell me Newton\'s second law."}'
```

## Environment variables

Set these before running the server locally or deploying it:

- `GROQ_API_KEY` — required for speech-to-text and chat completion
- `GROQ_STT_MODEL` — optional, default `whisper-large-v3-turbo`
- `GROQ_CHAT_MODEL` — optional, default `llama-3.1-8b-instant`

## Local development

```bash
cd "Aido server"
npm install
GROQ_API_KEY=your_key_here npx vercel dev
```

## Project structure

```text
Aido server/
├── api/
│   └── voice.js
├── package.json
├── vercel.json
└── README.md
```

## Notes

This server contains only backend code. There is no frontend or browser UI served from this repository.
