import machine
import math
import struct
import time
from config import I2S_BCLK_PIN, I2S_DIN_PIN, I2S_LRC_PIN
RATE = 22050
VOLUME = 0.04
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
def silence(i2s, ms):
    block = bytearray(512)
    blocks = max(1, (RATE * 2 * ms) // (1000 * len(block)))
    for _ in range(blocks):
        write_all(i2s, block)
def tone(i2s, freq, ms, volume=VOLUME):
    amp = int(32767 * volume)
    total = (RATE * ms) // 1000
    buf = bytearray(BUF_SAMPLES * 2)
    phase = 0.0
    step = (2.0 * math.pi * freq) / RATE
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
print("")
print("Aido speaker test")
print("BCLK/SCK=GP{}  LRC/WS=GP{}  DIN/SD=GP{}".format(
    I2S_BCLK_PIN,
    I2S_LRC_PIN,
    I2S_DIN_PIN,
))
print("You should hear: low beep, high beep, three-note chime.")
print("")
i2s = machine.I2S(
    0,
    sck=machine.Pin(I2S_BCLK_PIN),
    ws=machine.Pin(I2S_LRC_PIN),
    sd=machine.Pin(I2S_DIN_PIN),
    mode=machine.I2S.TX,
    bits=16,
    format=machine.I2S.MONO,
    rate=RATE,
    ibuf=20000,
)
try:
    silence(i2s, 300)
    print("440 Hz")
    tone(i2s, 440, 700)
    silence(i2s, 250)
    print("880 Hz")
    tone(i2s, 880, 700)
    silence(i2s, 250)
    print("chime")
    tone(i2s, 523, 180)
    silence(i2s, 80)
    tone(i2s, 659, 180)
    silence(i2s, 80)
    tone(i2s, 784, 350)
    silence(i2s, 600)
    print("Speaker test done.")
finally:
    try:
        silence(i2s, 200)
        i2s.deinit()
    except Exception:
        pass
