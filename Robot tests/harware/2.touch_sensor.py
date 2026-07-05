from machine import Pin
import time
TOUCH_PIN = 16
TAP_GAP_MS = 400
DEBOUNCE_MS = 50
touch = Pin(TOUCH_PIN, Pin.IN, Pin.PULL_DOWN)
def wait_for_release(timeout_ms=2000):
    start = time.ticks_ms()
    while touch.value() == 1:
        if time.ticks_diff(time.ticks_ms(), start) > timeout_ms:
            break
        time.sleep_ms(5)
def run():
    print("Touch sensor test running on GP16.")
    print("Tap once, twice, or three times quickly. Ctrl+C to stop.\n")
    tap_count = 0
    last_tap_time = 0
    while True:
        if touch.value() == 1:
            time.sleep_ms(DEBOUNCE_MS)
            if touch.value() != 1:
                continue
            now = time.ticks_ms()
            if tap_count == 0 or time.ticks_diff(now, last_tap_time) <= TAP_GAP_MS:
                tap_count += 1
            else:
                tap_count = 1
            last_tap_time = now
            wait_for_release()
        if tap_count > 0 and time.ticks_diff(time.ticks_ms(), last_tap_time) > TAP_GAP_MS:
            if tap_count == 1:
                print("Single touch detected")
            elif tap_count == 2:
                print("Double touch detected")
            elif tap_count >= 3:
                print("Triple touch detected")
            tap_count = 0
        time.sleep_ms(10)
if __name__ == "__main__":
    run()
'''
Touch sensor test running on GP16.
Tap once, twice, or three times quickly. Ctrl+C to stop.
Single touch detected
Double touch detected
Single touch detected
Triple touch detected
'''
