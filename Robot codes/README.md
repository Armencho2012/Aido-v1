# Robot Codes

This folder contains the core Python modules for the AIDO robot software stack.

## Overview

The `Robot codes` folder includes the main runtime, UI, sensor drivers, and utility modules used by the robot firmware. These modules are written for MicroPython and are organized by functionality.

## Files

- `audio.py` - Audio playback and sound helper functions.
- `boot.py` - Boot-time initialization and startup logic.
- `boot_anim.py` - Boot animation sequence for the OLED display.
- `car_anim.py` - Animated car motion visuals for the UI.
- `config.py` - Device configuration constants and pin assignments.
- `face.py` - Expressive face engine for OLED-based expressions.
- `flashcards.py` - Flashcard learning engine.
- `games.py` - Mini games engine and game logic.
- `graphics.py` - Graphics primitives and drawing helpers.
- `icons.py` - Compact bitmap icon definitions.
- `main.py` - Main AIDO OS application entry point.
- `menu.py` - Menu system and navigation UI.
- `mic.py` - Microphone driver and audio sampling logic.
- `mpu6050.py` - MPU-6050 IMU driver.
- `neural.py` - Neural map visualizer and graph rendering.
- `quiz.py` - Quiz engine and question flow.
- `rps_game.py` - Rock, paper, scissors game logic.
- `sdcard.py` - SD card driver and mount helpers.
- `speaker_scan.py` - Speaker / audio output detection and scan helper.
- `speaker_test.py` - Speaker playback test routines.
- `ssd1306.py` - SSD1306 OLED driver module.
- `status.py` - System status bar and status display utilities.
- `storage_paths.py` - Runtime storage path helpers for SD and flash.
- `study_sync.py` - Study material synchronization and save helpers.
- `test.py` - Test utilities and diagnostics helpers.
- `tof_behavior.py` - Time-of-flight sensor behavior logic.
- `touch.py` - Touch sensor engine and gesture detection.
- `tts_client.py` - Text-to-speech client and network interface.
- `vl53l0x.py` - VL53L0X distance sensor driver.
- `voice_client.py` - Voice interaction client module.
- `wifi.py` - WiFi connection manager.

## Notes

- The codebase is intended for MicroPython-based robot hardware.
- Use `main.py` as the primary startup script.
- The modules are separated by feature area: UI, sensors, audio, input, and storage.
- This README was created after cleaning unnecessary comments, blank lines, and extra whitespace in the Python source files.
