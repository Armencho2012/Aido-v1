# AIDO — AI Study Assistant Robot

This repository contains the full AIDO project split across backend, frontend, firmware, tests, and 3D models.

## Repository structure

- `Aide server/` — backend voice API only, no browser UI.
- `Aide website/` — production-ready web application source and public assets.
- `Robot codes/` — MicroPython firmware and robot application logic.
- `Robot tests/` — hardware and software test scripts.
- `Robot 3d models/` — robot enclosure and part model files.

## Quick start

- Backend: run `Aide server` and configure `GROQ_API_KEY`.
- Frontend: build `Aide website` with `npm install` and `npm run build`.
- Robot firmware: deploy `Robot codes` to the Pico W device.
- Tests: run selected scripts from `Robot tests/harware` and `Robot tests/software`.

## Notes

- This repo is organized by subsystem, not by a single monolithic app.
- The backend service is API-only; the front-end and firmware are separate.
- Keep the `Aide website` folder clean from development-only artifacts.
