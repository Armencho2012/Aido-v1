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
