'''
========================================
  BATTERY TEST
========================================
[BATT] ADC pin: 29
[BATT] Calibration: empty=3.3V full=4.2V divider=3.0x
[BATT] Sampling for 5 seconds...
raw=32439  pin=1.633V  battery=4.900V  level=100%
raw=32151  pin=1.619V  battery=4.857V  level=100%
raw=32215  pin=1.622V  battery=4.867V  level=100%
raw=32087  pin=1.616V  battery=4.847V  level=100%
raw=32183  pin=1.621V  battery=4.862V  level=100%
raw=32215  pin=1.622V  battery=4.867V  level=100%
raw=32167  pin=1.620V  battery=4.859V  level=100%
raw=32151  pin=1.619V  battery=4.857V  level=100%
raw=32183  pin=1.621V  battery=4.862V  level=100%
raw=32183  pin=1.621V  battery=4.862V  level=100%
[BATT] Summary:
  Samples: 10
  Avg voltage: 4.864V
  Avg level: 100%
[BATT] Warning: voltage suspiciously high, check divider ratio.
RESULT: Battery test PASSED.
'''
from machine import ADC, Pin
import time
from config import (
    BATTERY_ADC_PIN,
    BATT_FULL_V,
    BATT_EMPTY_V,
    BATT_DIVIDER,
    ADC_VREF,
    ADC_MAX,
)
adc = ADC(Pin(BATTERY_ADC_PIN))
def read_voltage():
    raw = adc.read_u16()
    pin_voltage = (raw / ADC_MAX) * ADC_VREF
    battery_voltage = pin_voltage * BATT_DIVIDER
    return raw, pin_voltage, battery_voltage
def voltage_to_percent(voltage):
    if voltage >= BATT_FULL_V:
        return 100
    if voltage <= BATT_EMPTY_V:
        return 0
    pct = (voltage - BATT_EMPTY_V) / (BATT_FULL_V - BATT_EMPTY_V) * 100
    return round(pct)
def run(duration_s=5):
    print("\n" + "=" * 40)
    print("  BATTERY TEST")
    print("=" * 40)
    print("[BATT] ADC pin: {}".format(BATTERY_ADC_PIN))
    print("[BATT] Calibration: empty={}V full={}V divider={}x".format(
        BATT_EMPTY_V, BATT_FULL_V, BATT_DIVIDER
    ))
    print("[BATT] Sampling for {} seconds...\n".format(duration_s))
    start = time.ticks_ms()
    readings = []
    while time.ticks_diff(time.ticks_ms(), start) < duration_s * 1000:
        raw, pin_v, batt_v = read_voltage()
        pct = voltage_to_percent(batt_v)
        readings.append(batt_v)
        print("raw={:5d}  pin={:.3f}V  battery={:.3f}V  level={}%".format(
            raw, pin_v, batt_v, pct
        ))
        time.sleep_ms(500)
    if readings:
        avg_v = sum(readings) / len(readings)
        avg_pct = voltage_to_percent(avg_v)
        print("\n[BATT] Summary:")
        print("  Samples: {}".format(len(readings)))
        print("  Avg voltage: {:.3f}V".format(avg_v))
        print("  Avg level: {}%".format(avg_pct))
        if avg_v < BATT_EMPTY_V - 0.2:
            print("[BATT] Warning: voltage suspiciously low, check wiring/divider.")
        elif avg_v > BATT_FULL_V + 0.2:
            print("[BATT] Warning: voltage suspiciously high, check divider ratio.")
        print("RESULT: Battery test PASSED.")
    else:
        print("RESULT: Battery test FAILED (no readings).")
if __name__ == "__main__":
    run()
