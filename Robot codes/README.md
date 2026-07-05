# Robot Codes

This folder contains the MicroPython firmware and application logic for the AIDO robot.

## Overview

The code is designed to run on the Pico W hardware and includes:

- `main.py` — primary application entry point
- `boot.py` — startup initialization and boot flow
- `config.py` — hardware pin assignments and configuration values
- `wifi.py` — WiFi connection manager
- `voice_client.py` — voice interaction client
- `tts_client.py` — text-to-speech client
- `mic.py`, `ssd1306.py`, `mpu6050.py`, `vl53l0x.py` — sensor and display drivers
- `flashcards.py`, `quiz.py`, `games.py`, `study_sync.py` — learning and interaction features

## Deployment

1. Copy the `Robot codes` files to the Pico W device storage.
2. Use Thonny, rshell, or a similar MicroPython tool.
3. Ensure `main.py` is present and the board boots from it.

## Notes

- Keep firmware code on the device and update only the required modules.
- Use the `config.py` file to verify pin assignments before hardware tests.
