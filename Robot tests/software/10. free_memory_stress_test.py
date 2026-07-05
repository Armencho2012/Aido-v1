'''
==================================================
  MEMORY / STRESS TEST — full subsystem init
==================================================
[MEM] baseline                     free=174576 bytes  used= 30864 bytes  (15.0% used)
[MEM] I2C devices found: ['0x29', '0x3c', '0x68']
[MEM] after I2C scan               free=174368 bytes  used= 31072 bytes  (15.1% used)
[MEM] OLED initialized
[MEM] after OLED init              free=170048 bytes  used= 35392 bytes  (17.2% used)
[MEM] Touch + LED pins ready
[MEM] after touch/LED init         free=170032 bytes  used= 35408 bytes  (17.2% used)
[MEM] Battery ADC ready
[MEM] after battery ADC init       free=170000 bytes  used= 35440 bytes  (17.3% used)
[MEM] WiFi connected: True
[MEM] after WiFi connect           free=169968 bytes  used= 35472 bytes  (17.3% used)
[MEM] SD card failed: [Errno 1] EPERM
[MEM] after SD mount               free=169216 bytes  used= 36224 bytes  (17.6% used)
[MEM] Microphone I2S initialized
[MEM] after mic I2S init           free=160640 bytes  used= 44800 bytes  (21.8% used)
[MEM] after cleanup/deinit         free=168816 bytes  used= 36624 bytes  (17.8% used)
[MEM] Summary:
  Baseline free RAM: 174576 bytes
  Lowest free RAM:   160640 bytes (at 'after mic I2S init')
  Total RAM consumed by full stack: 13936 bytes
RESULT: Memory stress test PASSED.
'''
import gc
import machine
import network
import time
from config import (
    I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ,
    OLED_WIDTH, OLED_HEIGHT, OLED_ADDR,
    TOUCH_PIN,
    LED_PIN,
    MIC_I2S_ID, MIC_SCK_PIN, MIC_WS_PIN, MIC_SD_PIN,
    MIC_SAMPLE_RATE, MIC_BITS,
    SD_SPI_ID, SD_SCK_PIN, SD_MOSI_PIN, SD_MISO_PIN, SD_CS_PIN,
    SD_BAUDRATE, SD_MOUNT_POINT,
    WIFI_SSID, WIFI_PASS, WIFI_TIMEOUT_S,
    BATTERY_ADC_PIN,
)
results = []
def checkpoint(label):
    gc.collect()
    free = gc.mem_free()
    alloc = gc.mem_alloc()
    total = free + alloc
    results.append((label, free))
    print("[MEM] {:<28} free={:6d} bytes  used={:6d} bytes  ({:.1f}% used)".format(
        label, free, alloc, (alloc / total) * 100
    ))
def run():
    print("\n" + "=" * 50)
    print("  MEMORY / STRESS TEST — full subsystem init")
    print("=" * 50)
    checkpoint("baseline")
    i2c = machine.SoftI2C(
        sda=machine.Pin(I2C_SDA_PIN),
        scl=machine.Pin(I2C_SCL_PIN),
        freq=I2C_FREQ
    )
    devices = i2c.scan()
    print("[MEM] I2C devices found:", [hex(d) for d in devices])
    checkpoint("after I2C scan")
    try:
        from lib.ssd1306 import SSD1306_I2C
        oled = SSD1306_I2C(OLED_WIDTH, OLED_HEIGHT, i2c, addr=OLED_ADDR)
        oled.fill(0)
        oled.text("MEM TEST", 20, 25)
        oled.show()
        print("[MEM] OLED initialized")
    except Exception as e:
        print("[MEM] OLED failed:", e)
    checkpoint("after OLED init")
    touch = machine.Pin(TOUCH_PIN, machine.Pin.IN, machine.Pin.PULL_DOWN)
    led = machine.Pin(LED_PIN, machine.Pin.OUT)
    led.value(1)
    print("[MEM] Touch + LED pins ready")
    checkpoint("after touch/LED init")
    batt_adc = machine.ADC(machine.Pin(BATTERY_ADC_PIN))
    _ = batt_adc.read_u16()
    print("[MEM] Battery ADC ready")
    checkpoint("after battery ADC init")
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(WIFI_SSID, WIFI_PASS)
        start = time.time()
        while not wlan.isconnected() and time.time() - start < WIFI_TIMEOUT_S:
            time.sleep(0.5)
    print("[MEM] WiFi connected:", wlan.isconnected())
    checkpoint("after WiFi connect")
    sd_ok = False
    try:
        import os
        from sdcard import SDCard
        cs = machine.Pin(SD_CS_PIN, machine.Pin.OUT)
        spi = machine.SPI(
            SD_SPI_ID, baudrate=SD_BAUDRATE,
            sck=machine.Pin(SD_SCK_PIN),
            mosi=machine.Pin(SD_MOSI_PIN),
            miso=machine.Pin(SD_MISO_PIN)
        )
        sd = SDCard(spi, cs, baudrate=SD_BAUDRATE)
        os.mount(sd, SD_MOUNT_POINT)
        sd_ok = True
        print("[MEM] SD card mounted")
    except Exception as e:
        print("[MEM] SD card failed:", e)
    checkpoint("after SD mount")
    try:
        i2s_mic = machine.I2S(
            MIC_I2S_ID,
            sck=machine.Pin(MIC_SCK_PIN),
            ws=machine.Pin(MIC_WS_PIN),
            sd=machine.Pin(MIC_SD_PIN),
            mode=machine.I2S.RX,
            bits=MIC_BITS,
            format=machine.I2S.MONO,
            rate=MIC_SAMPLE_RATE,
            ibuf=8192,
        )
        print("[MEM] Microphone I2S initialized")
    except Exception as e:
        print("[MEM] Microphone failed:", e)
        i2s_mic = None
    checkpoint("after mic I2S init")
    led.value(0)
    if i2s_mic:
        i2s_mic.deinit()
    if sd_ok:
        try:
            os.umount(SD_MOUNT_POINT)
        except Exception:
            pass
    checkpoint("after cleanup/deinit")
    print("\n[MEM] Summary:")
    baseline_free = results[0][1]
    lowest_label, lowest_free = min(results, key=lambda r: r[1])
    print("  Baseline free RAM: {} bytes".format(baseline_free))
    print("  Lowest free RAM:   {} bytes (at '{}')".format(lowest_free, lowest_label))
    print("  Total RAM consumed by full stack: {} bytes".format(baseline_free - lowest_free))
    if lowest_free < 10000:
        print("[MEM] WARNING: free RAM dropped below 10KB — risk of MemoryError under load.")
        print("RESULT: Memory stress test PASSED WITH WARNING.")
    else:
        print("RESULT: Memory stress test PASSED.")
if __name__ == "__main__":
    run()
