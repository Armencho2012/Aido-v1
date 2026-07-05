import machine
import math
import struct
import time
from config import I2S_BCLK_PIN, I2S_DIN_PIN, I2S_LRC_PIN
VOLUME = 0.025
BUF_SAMPLES = 256
def write_all(i2s, buf):
    written = 0
    mv = memoryview(buf)
    while written < len(mv):
        n = i2s.write(mv[written:])
        if n and n > 0:
            written += n
        else:
            time.sleep_ms(1)
def silence(i2s, rate, ms):
    block = bytearray(512)
    blocks = max(1, (rate * 2 * ms) // (1000 * len(block)))
    for _ in range(blocks):
        write_all(i2s, block)
def tone(i2s, rate, freq, ms):
    amp = int(32767 * VOLUME)
    total = (rate * ms) // 1000
    buf = bytearray(BUF_SAMPLES * 2)
    phase = 0.0
    step = (2.0 * math.pi * freq) / rate
    sent = 0
    while sent < total:
        count = min(BUF_SAMPLES, total - sent)
        for i in range(count):
            sample = int(math.sin(phase) * amp)
            struct.pack_into("<h", buf, i * 2, sample)
            phase += step
            if phase >= 2.0 * math.pi:
                phase -= 2.0 * math.pi
        write_all(i2s, memoryview(buf)[:count * 2])
        sent += count
def run_case(rate, fmt_name, fmt):
    print("")
    print("Case: rate={} format={}".format(rate, fmt_name))
    print("Listen for 440Hz clean beep...")
    time.sleep_ms(900)
    i2s = machine.I2S(
        0,
        sck=machine.Pin(I2S_BCLK_PIN),
        ws=machine.Pin(I2S_LRC_PIN),
        sd=machine.Pin(I2S_DIN_PIN),
        mode=machine.I2S.TX,
        bits=16,
        format=fmt,
        rate=rate,
        ibuf=20000,
    )
    try:
        silence(i2s, rate, 250)
        tone(i2s, rate, 440, 900)
        silence(i2s, rate, 500)
    finally:
        try:
            i2s.deinit()
        except Exception:
            pass
        time.sleep_ms(500)
print("")
print("Aido speaker format/rate scanner")
print("Pins from config: BCLK=GP{} LRC=GP{} DIN=GP{}".format(
    I2S_BCLK_PIN,
    I2S_LRC_PIN,
    I2S_DIN_PIN,
))
print("For each case, note which one sounds cleanest.")
cases = [
    (22050, "MONO", machine.I2S.MONO),
    (22050, "STEREO", machine.I2S.STEREO),
    (16000, "MONO", machine.I2S.MONO),
    (16000, "STEREO", machine.I2S.STEREO),
    (44100, "MONO", machine.I2S.MONO),
    (44100, "STEREO", machine.I2S.STEREO),
]
for rate, fmt_name, fmt in cases:
    run_case(rate, fmt_name, fmt)
print("")
print("Done. If every case is noisy, check MAX98357A wiring/power:")
print("VIN -> 3V3 or 5V, GND -> GND, BCLK -> GP26, LRC -> GP27, DIN -> GP28.")
