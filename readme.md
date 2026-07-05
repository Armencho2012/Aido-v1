# AIDO — AI Study Assistant Robot

## Ի՞նչ է AIDO-ն

AIDO-ն խելացի ուսումնական օգնական է, որը միավորում է արհեստական բանականության մոդելները և ռոբոտաշինությունը՝ կրթական գործընթացը ավելի հետաքրքիր, արդյունավետ ու ինտերակտիվ դարձնելու համար: այն հանդես է գալիս որպես անձնական թվային դասավանդող և օգնական: AIDO-ն օգտագործում է ներկայիս լավագույն ԱԲ մոդելները հնարավորինս որակով պատասխան վերադարձնելու համար։

## Repository structure

- `Aido server/` — backend voice API only.
- `Robot codes/` — robot firmware and application logic.
- `Robot tests/` — firmware and software test scripts.
- `Robot 3d models/` — robot model files.

## Backend-only server

The server is API-only and does not serve a browser UI. It is designed to be called from the robot, a mobile app, or any other client.

### API endpoint

- `POST /api/voice`
- Accepts `multipart/form-data` audio upload or `application/json` text input.
- Returns voice responses, transcripts, or study pack data.

### Example request

```bash
curl -X POST "http://localhost:3000/api/voice" \
  -H "Content-Type: application/json" \
  -d '{"text":"Tell me Newton\'s second law."}'
```

## Run locally

```bash
cd "Aido server"
npm install
GROQ_API_KEY=your_key_here npx vercel dev
```

## Notes

- No browser UI is included in this repository.
- The AIDO backend is built as a standalone API.
- Use the voice endpoint directly from your client or robot code.
