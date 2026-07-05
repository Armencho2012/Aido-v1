# Robot Tests

This folder contains diagnostic and validation scripts for the AIDO project.

## Structure

- `harware/` — hardware-level tests for sensors, peripherals, and connectivity
- `software/` — software and integration tests for application behavior

## Hardware tests

- `1.connecting_to_pico_and_wifi.py` — WiFi connection test
- `2.touch_sensor.py` — touch input validation
- `3.oled_screen.py` — OLED display initialization and verification
- `4.vl53l0x_distance.py` — time-of-flight distance sensor test
- `5.microphone_test.py` — microphone/I2S audio capture test
- `6.mpu6050_sensor.py` — IMU initialization and readings
- `7.mounting_sd_card.py` — SD card mount and access test
- `8.speaker_and_MAX98357_test.py` — speaker and amplifier playback test
- `9.battery_testing.py` — battery voltage and percentage check

## Software tests

- `1.asking_questions.py` — question input and response flow
- `2.renewing_study_materials.py` — study material refresh process
- `3.quiz.py` — quiz engine test
- `4.flashcards.py` — flashcard workflow test
- `5.games.py` — game logic test
- `6.neural_map.py` — neural map visualization or logic test
- `7.getting_analyse.py` — analysis generation test
- `8.tts_roundtrip.py` — text-to-speech round-trip test
- `9.full_boot_integration_test.py` — full boot and system integration
- `10. free_memory_stress_test.py` — memory stress and stability test
- `11.watchdog.py` — watchdog timer validation

## Notes

- Run tests individually depending on the hardware and software component you want to verify.
- The folder name is intentionally `harware` to match the existing project structure.
