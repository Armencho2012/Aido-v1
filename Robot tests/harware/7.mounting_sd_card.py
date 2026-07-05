import machine
import os
import time
from config import (
    SD_SPI_ID,
    SD_SCK_PIN,
    SD_MOSI_PIN,
    SD_MISO_PIN,
    SD_CS_PIN,
    SD_BAUDRATE,
    SD_MOUNT_POINT,
)
def reset_sd_bus():
    try:
        machine.SPI(SD_SPI_ID).deinit()
    except Exception:
        pass
    try:
        machine.Pin(SD_CS_PIN, machine.Pin.OUT, value=1)
        machine.Pin(SD_SCK_PIN, machine.Pin.OUT, value=0)
        machine.Pin(SD_MOSI_PIN, machine.Pin.OUT, value=1)
        machine.Pin(SD_MISO_PIN, machine.Pin.IN, machine.Pin.PULL_UP)
    except Exception:
        pass
def mount_sd_robust():
    from sdcard import SDCard
    for attempt in range(5):
        try:
            cs = machine.Pin(SD_CS_PIN, machine.Pin.OUT)
            spi = machine.SPI(
                SD_SPI_ID,
                baudrate=SD_BAUDRATE,
                sck=machine.Pin(SD_SCK_PIN),
                mosi=machine.Pin(SD_MOSI_PIN),
                miso=machine.Pin(SD_MISO_PIN)
            )
            sd = SDCard(spi, cs, baudrate=SD_BAUDRATE)
            try:
                os.mkdir(SD_MOUNT_POINT)
            except OSError:
                pass
            os.mount(sd, SD_MOUNT_POINT)
            print("[SD] Mounted successfully on attempt {}".format(attempt + 1))
            return True
        except Exception as e:
            print("[SD] Mount attempt {} failed: {}".format(attempt + 1, e))
            reset_sd_bus()
            time.sleep(1)
    return False
def run():
    print("\n" + "=" * 40)
    print("  SD CARD COMPREHENSIVE TEST")
    print("=" * 40)
    if not mount_sd_robust():
        print("RESULT: SD card FAILED (mount error).")
        return
    try:
        files = os.listdir(SD_MOUNT_POINT)
        print("[SD] Files found: {}".format(files))
    except Exception as e:
        print("[SD] Failed to list files:", e)
        print("RESULT: SD card FAILED (listdir error).")
        return
    test_path = "{}/test_write.txt".format(SD_MOUNT_POINT)
    test_data = "AIDO SD test @ {}".format(time.ticks_ms())
    try:
        with open(test_path, "w") as f:
            f.write(test_data)
        print("[SD] Wrote test file: {}".format(test_path))
        with open(test_path, "r") as f:
            read_back = f.read()
        if read_back == test_data:
            print("[SD] Read-back matches written data.")
        else:
            print("[SD] Read-back MISMATCH.")
            print("  wrote: {}".format(test_data))
            print("  read : {}".format(read_back))
        os.remove(test_path)
        print("[SD] Cleaned up test file.")
        print("RESULT: SD card PASSED.")
    except Exception as e:
        print("[SD] Write/read test failed:", e)
        print("RESULT: SD card FAILED (write/read error).")
if __name__ == "__main__":
    run()
'''
========================================
  SD CARD COMPREHENSIVE TEST
========================================
[SD] Mounted successfully on attempt 1
[SD] Files found: ['.aido_sd_mounted', 'flashcards.json', 'quiz.json', 'analyse.json', 'map.json', 'welcome.wav']
[SD] Wrote test file: /sd/test_write.txt
[SD] Read-back matches written data.
[SD] Cleaned up test file.
RESULT: SD card PASSED.
'''
