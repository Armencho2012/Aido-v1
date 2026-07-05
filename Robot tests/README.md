# AIDO-v1 Tests

This `tests` folder contains diagnostic and integration scripts for the AIDO project. It is separated into two subfolders:

- `harware/` — hardware-level tests for sensors, peripherals, and connectivity
- `software/` — software-level tests for higher-level system features and modules

---

# English

## Overview

The `tests` folder is designed to help developers validate the AIDO hardware and software subsystems.

### `harware/`

1. `1.connecting_to_pico_and_wifi.py`
   - Connects the Pico board to WiFi using provided `SSID` and `PASSWORD`.
   - Validates the WLAN connection flow.

2. `2.touch_sensor.py`
   - Tests the touch sensor input on GPIO pin 16.
   - Uses single/double/three-tap detection and prints results.

3. `3.oled_screen.py`
   - Checks the I2C OLED display.
   - Scans the I2C bus and attempts to initialize the OLED screen.

4. `4.vl53l0x_distance.py`
   - Tests the VL53L0X time-of-flight distance sensor.
   - Reads distance data continuously for a short period.

5. `5.microphone_test.py`
   - Tests the microphone/I2S input path.
   - Captures audio samples and computes a level meter.

6. `6.mpu6050_sensor.py`
   - Tests the MPU6050 inertial measurement unit (IMU).
   - Scans I2C bus and initializes the accelerometer/gyro sensor.

7. `7.mounting_sd_card.py`
   - Verifies SD card SPI setup and mount flow.
   - Ensures the board can access SD storage.

8. `8.speaker_and_MAX98357_test.py`
   - Verifies audio playback through the MAX98357 I2S speaker amplifier.
   - Plays `welcome.wav` to confirm output.

9. `9.battery_testing.py`
   - Tests the battery voltage sensing via ADC.
   - Prints raw ADC values and calculated battery voltage/percentage.

### `software/`

1. `1.asking_questions.py`
   - Tests the voice question/response flow.
   - Sends sample questions and validates speech recognition/response behavior.

2. `2. renewing_study_materials.py`
   - Recreates or refreshes study materials.
   - Ensures flashcards, quiz content, analysis, and map files exist.

3. `3.quiz.py`
   - Tests the quiz engine module.
   - Loads questions, displays options, and validates scoring.

4. `4.flashcards.py`
   - Tests the flashcards module.
   - Loads content and verifies card browsing behavior.

5. `5.games.py`
   - Tests the games module and its mini-games.
   - Includes Rock-Paper-Scissors, Pong, Reaction, and Memory game flows.

6. `6.neural_map.py`
   - Tests the neural map visualization module.
   - Renders and navigates the knowledge graph on OLED.

7. `7.getting_analyse.py`
   - Tests the analysis module and study pack generation.
   - Saves analysis, flashcards, quiz, and map payloads.

8. `8.tts_roundtrip.py`
   - Tests WiFi and TTS server round-trip.
   - Sends text to the TTS server and verifies a valid WAV response.

9. `9.full_boot_integration_test.py`
   - A full integration test for system boot and module startup.
   - Validates that the system can initialize core subsystems.

10. `10. free_memory_stress_test.py`
    - Runs a memory/stress test across many subsystems.
    - Tracks RAM usage during OLED, WiFi, SD, microphone, and other initialization.

11. `11.watchdog.py`
    - Tests watchdog / crash recovery behavior.
    - Confirms both fed and starved watchdog operation.

---

# Armenian

## Ընդհանուր դիտարկում

`tests` թղթապանակը նախատեսված է AIDO սարքավորման և ծրագրային ապահովման ենթակարգերի ստուգման համար:

### `harware/`

1. `1.connecting_to_pico_and_wifi.py`
   - Խորհուրդ է տալիս Pico տախտակին WiFi-ի միջոցով միանալ `SSID` և `PASSWORD` կիրառելով:
   - Ուցակում է WLAN կապի աշխատունակությունը:

2. `2.touch_sensor.py`
   - Ստուգում է տեսչի տվիչը GPIO 16-ին:
   - Օգտագործում է մեկ, երկ կամ երեք հպում, հետո հաշվում և տպում է արդյունքը:

3. `3.oled_screen.py`
   - Ստուգում է I2C OLED էկրան:
   - Սկանում է I2C ավտոբուսը և նախապատրաստում է OLED-ը:

4. `4.vl53l0x_distance.py`
   - Ստուգում է VL53L0X հեռավորության զգիչը:
   - Քանի մի վայրկյան ընթանում է հեռավորության չափում:

5. `5.microphone_test.py`
   - Ստուգում է միկրոֆոնի / I2S մուտքը:
   - Ուղղում է ձայնային նմուշներ և հաշվարկում մակարդակը:

6. `6.mpu6050_sensor.py`
   - Ստուգում է MPU6050 շարժման մոդուլը:
   - Սկանում է I2C ավտոբուսը և միացնում արագաչափը/զղգոգը:

7. `7.mounting_sd_card.py`
   - Վավերացնում է SD քարտի SPI կարգավորումը և mount թելադրությունը:
   - Բացկայում է SD շտեմարանը:

8. `8.speaker_and_MAX98357_test.py`
   - Ստուգում է MAX98357 I2S բարձրախոսի աուդիո ելքը:
   - Անջատում է `welcome.wav` ֆայլը՝ արտահանումը հաստատելու համար:

9. `9.battery_testing.py`
   - Ստուգում է մարտկոցի լարումը ADC-ով:
   - Տպում է ADC հում արժեքները և հաշվարկված լարումը / տոկոսը:

### `software/`

1. `1.asking_questions.py`
   - Ստուգում է ձայնային հարցերի ու պատասխանների հոսքը:
   - Ուղարկում է օրինակ հարցեր և ստուգում է խոսքային reconocimiento-ի / պատասխանների վարքագիծը:

2. `2. renewing_study_materials.py`
   - Վերականգնում կամ թարմացնում է ուսումնական նյութերը:
   - Վավերացնում է flashcards, quiz, analysis, և map ֆայլերի առկայությունը:

3. `3.quiz.py`
   - Ստուգում է quiz շարժիչը:
   - Բեռնում է հարցերը, ցուցադրում տարբերակները և գնահատում է միավորները:

4. `4.flashcards.py`
   - Ստուգում է flashcards մոդուլը:
   - Բեռնում է բովանդակությունը և վավերացնում քարտերի դիտարկումը:

5. `5.games.py`
   - Ստուգում է խաղերի մոդուլը և նրա մինի-խաղերը:
   - Պարունակում է Rock-Paper-Scissors, Pong, Reaction և Memory խաղերը:

6. `6.neural_map.py`
   - Ստուգում է նեյրոնային քարտեզի պատկերացումը:
   - Բերադրում է գիտելիքների ցանցը OLED էկրանի վրա և անցնում է նավարկմամբ:

7. `7.getting_analyse.py`
   - Ստուգում է বিশ्लेषման մոդուլը և ուսումնական փաթեթի ձևավորման գործընթացը:
   - Պահպանում է analysis, flashcards, quiz և map payload-ները:

8. `8.tts_roundtrip.py`
   - Ստուգում է WiFi և TTS սերվերի երթուղին:
   - Ուղարկում է տեքստ TTS սերվերին և ստուգում ճշգրիտ WAV պատասխանը:

9. `9.full_boot_integration_test.py`
   - Մեկտեղված ամբողջական ստուգում համակարգի բուտի և մոդուլների մեկնարկի համար:
   - Վավերացնում է, որ համակարգը կարող է սկսել հիմնական ենթակարգերը:

10. `10. free_memory_stress_test.py`
    - Կատարում է հիշողության / սթրես թեստ տարբեր ենթակարգերի միջև:
    - Հաշվում է RAM օգտագործումը OLED, WiFi, SD, միկրոֆոն և այլ մոդուլների նախապատրաստման ժամանակ:

11. `11.watchdog.py`
    - Ստուգում է հետևակային ժամացույցի (watchdog) / խափանման վերականգման վարքը:
    - Վավերացնում է ինչպես բացակա, այնպես էլ սնուցվող WDT գործառույթը:
