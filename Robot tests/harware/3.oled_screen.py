import machine
from config import (
    I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ,
    OLED_WIDTH, OLED_HEIGHT, OLED_ADDR,
)
print("\n" + "=" * 40)
print("  OLED SCREEN TEST")
print("=" * 40)
i2c = machine.SoftI2C(
    sda=machine.Pin(I2C_SDA_PIN),
    scl=machine.Pin(I2C_SCL_PIN),
    freq=I2C_FREQ
)
print("[I2C] Scanning bus...")
devices = i2c.scan()
print("[I2C] Found {} device(s): {}".format(
    len(devices),
    ["0x{:02X}".format(d) for d in devices]
))
oled = None
if not devices:
    print("[OLED] No I2C device found. Check wiring.")
else:
    try:
        from lib.ssd1306 import SSD1306_I2C
        oled = SSD1306_I2C(OLED_WIDTH, OLED_HEIGHT, i2c, addr=OLED_ADDR)
        oled.contrast(255)
        print("[OLED] {}x{} initialized".format(OLED_WIDTH, OLED_HEIGHT))
    except Exception as e:
        print("[OLED] Init failed:", e)
        oled = None
def run():
    if oled is None:
        print("RESULT: OLED init FAILED (no display object created).")
        return
    oled.fill(0)
    oled.text("OLED TEST", 20, 10)
    oled.text("Line 2 OK", 20, 25)
    oled.rect(0, 0, OLED_WIDTH, OLED_HEIGHT, 1)
    oled.show()
    print("[OLED] Test pattern sent to display.")
    answer = input("Can you see 'OLED TEST' on the screen? (y/n): ").strip().lower()
    if answer == "y":
        print("RESULT: OLED screen PASSED.")
    else:
        print("RESULT: OLED screen FAILED (not visible).")
        print("Check: contrast/power, SDA/SCL wiring, I2C address, driver file.")
    oled.fill(0)
    oled.show()
if __name__ == "__main__":
    run()
'''
========================================
  OLED SCREEN TEST
========================================
[I2C] Scanning bus...
[I2C] Found 3 device(s): ['0x29', '0x3C', '0x68']
[OLED] 128x64 initialized
[OLED] Test pattern sent to display.
Can you see 'OLED TEST' on the screen? (y/n): y
RESULT: OLED screen PASSED.
'''
