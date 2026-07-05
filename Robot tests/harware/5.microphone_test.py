import machine
import struct
import time
from config import (
    MIC_I2S_ID,
    MIC_BITS,
    MIC_SAMPLE_RATE,
    MIC_SCK_PIN,
    MIC_SD_PIN,
    MIC_TRIGGER_LEVEL,
    MIC_WS_PIN,
)
BUF_SIZE = 1024
BAR_WIDTH = 40
PRINT_EVERY_MS = 120
USE_STEREO_DIAG = False
def sample_level(sample):
    if MIC_BITS == 16:
        return abs(sample)
    return abs(sample >> 16)
def measure_mono(buf, nbytes):
    peak = 0
    total = 0
    count = 0
    nonzero = 0
    sample_bytes = 2 if MIC_BITS == 16 else 4
    sample_type = "<h" if MIC_BITS == 16 else "<i"
    for i in range(0, nbytes - sample_bytes + 1, sample_bytes):
        sample = struct.unpack_from(sample_type, buf, i)[0]
        mag = sample_level(sample)
        if mag > peak:
            peak = mag
        total += mag
        count += 1
        if sample:
            nonzero += 1
    avg = total // count if count else 0
    return peak, avg, nonzero
def measure_stereo(buf, nbytes):
    left_peak = 0
    right_peak = 0
    left_total = 0
    right_total = 0
    count = 0
    nonzero = 0
    sample_bytes = 2 if MIC_BITS == 16 else 4
    sample_type = "<h" if MIC_BITS == 16 else "<i"
    frame_bytes = sample_bytes * 2
    for i in range(0, nbytes - frame_bytes + 1, frame_bytes):
        left_raw = struct.unpack_from(sample_type, buf, i)[0]
        right_raw = struct.unpack_from(sample_type, buf, i + sample_bytes)[0]
        left = sample_level(left_raw)
        right = sample_level(right_raw)
        if left > left_peak:
            left_peak = left
        if right > right_peak:
            right_peak = right
        left_total += left
        right_total += right
        count += 1
        if left_raw:
            nonzero += 1
        if right_raw:
            nonzero += 1
    left_avg = left_total // count if count else 0
    right_avg = right_total // count if count else 0
    return left_peak, right_peak, left_avg, right_avg, nonzero
def make_bar(level):
    scale = max(MIC_TRIGGER_LEVEL * 4, 1)
    filled = min(BAR_WIDTH, (level * BAR_WIDTH) // scale)
    return "#" * filled + "." * (BAR_WIDTH - filled)
def run():
    print("\n" + "=" * 40)
    print("  MICROPHONE LEVEL TEST")
    print("=" * 40)
    print("[MIC] I2S{} SCK={} WS={} SD={} rate={}Hz bits={}".format(
        MIC_I2S_ID, MIC_SCK_PIN, MIC_WS_PIN, MIC_SD_PIN,
        MIC_SAMPLE_RATE, MIC_BITS,
    ))
    print("[MIC] Talk, clap, or tap near the mic. Ctrl+C to stop.")
    print("[MIC] Trigger level: {}".format(MIC_TRIGGER_LEVEL))
    if USE_STEREO_DIAG:
        print("[MIC] Stereo diagnostic mode: watch L and R.")
    print("")
    i2s = machine.I2S(
        MIC_I2S_ID,
        sck=machine.Pin(MIC_SCK_PIN),
        ws=machine.Pin(MIC_WS_PIN),
        sd=machine.Pin(MIC_SD_PIN),
        mode=machine.I2S.RX,
        bits=MIC_BITS,
        format=machine.I2S.STEREO if USE_STEREO_DIAG else machine.I2S.MONO,
        rate=MIC_SAMPLE_RATE,
        ibuf=8192,
    )
    buf = bytearray(BUF_SIZE)
    smooth = 0
    max_seen = 0
    zero_reads = 0
    try:
        for _ in range(8):
            i2s.readinto(buf)
            time.sleep_ms(20)
        last_print = time.ticks_ms()
        while True:
            n = i2s.readinto(buf)
            if not n:
                continue
            if USE_STEREO_DIAG:
                left, right, left_avg, right_avg, nonzero = measure_stereo(buf, n)
                peak = left if left > right else right
                avg = left_avg if left_avg > right_avg else right_avg
            else:
                peak, avg, nonzero = measure_mono(buf, n)
            smooth = (smooth * 7 + peak * 3) // 10
            if peak > max_seen:
                max_seen = peak
            now = time.ticks_ms()
            if time.ticks_diff(now, last_print) >= PRINT_EVERY_MS:
                status = "VOICE" if smooth >= MIC_TRIGGER_LEVEL else "quiet"
                if USE_STEREO_DIAG:
                    print("n={:4d} nz={:3d} L={:5d} R={:5d} avg={:4d} max={:5d} [{}] {}".format(
                        n, nonzero, left, right, avg, max_seen, make_bar(smooth), status))
                else:
                    print("n={:4d} nz={:3d} level={:5d} peak={:5d} avg={:4d} max={:5d} [{}] {}".format(
                        n, nonzero, smooth, peak, avg, max_seen, make_bar(smooth), status))
                if nonzero:
                    zero_reads = 0
                else:
                    zero_reads += 1
                    if zero_reads >= 8:
                        print("[MIC] Still all zero samples. Check L/R pin mapping or wiring.")
                last_print = now
    except KeyboardInterrupt:
        print("\n[MIC] Test stopped.")
        print("RESULT: Microphone test ended by user.")
    finally:
        try:
            i2s.deinit()
        except Exception:
            pass
if __name__ == "__main__":
    run()
'''
n=1024 nz=512 level= 6616 peak= 3314 avg= 739 max=32768 [########################################] VOICE
n=1024 nz=512 level= 2203 peak=  374 avg= 146 max=32768 [########################################] VOICE
n=1024 nz=512 level= 1073 peak=  642 avg= 172 max=32768 [########################################] VOICE
n=1024 nz=512 level=  695 peak= 1107 avg= 346 max=32768 [###############################.........] VOICE
n=1024 nz=512 level= 1417 peak= 1511 avg= 709 max=32768 [########################################] VOICE
n=1024 nz=512 level= 1410 peak= 1371 avg= 619 max=32768 [########################################] VOICE
n=1024 nz=512 level= 1206 peak= 1039 avg= 399 max=32768 [########################################] VOICE
n=1024 nz=510 level=  846 peak=  524 avg= 138 max=32768 [######################################..] VOICE
n=1024 nz=509 level=  510 peak=  252 avg=  81 max=32768 [#######################.................] VOICE
n=1024 nz=512 level=  372 peak=  361 avg= 116 max=32768 [################........................] VOICE
n=1024 nz=504 level=  200 peak=  117 avg=  31 max=32768 [#########...............................] quiet
n=1024 nz=511 level=  180 peak=  183 avg=  45 max=32768 [########................................] quiet
n=1024 nz=506 level=  103 peak=   71 avg=  24 max=32768 [####....................................] quiet
n=1024 nz=500 level=   70 peak=   71 avg=  19 max=32768 [###.....................................] quiet
n=1024 nz=503 level=   69 peak=   73 avg=  22 max=32768 [###.....................................] quiet
n=1024 nz=511 level=   69 peak=   66 avg=  33 max=32768 [###.....................................] quiet
n=1024 nz=505 level=   60 peak=   60 avg=  16 max=32768 [##......................................] quiet
n=1024 nz=503 level=   51 peak=   65 avg=  24 max=32768 [##......................................] quiet
n=1024 nz=509 level=  146 peak=  233 avg=  77 max=32768 [######..................................] quiet
n=1024 nz=509 level=  158 peak=  182 avg=  63 max=32768 [#######.................................] quiet
n=1024 nz=512 level=  195 peak=  240 avg=  99 max=32768 [########................................] quiet
n=1024 nz=504 level=  352 peak=  808 avg= 113 max=32768 [################........................] VOICE
n=1024 nz=512 level= 2708 peak= 4042 avg=1790 max=32768 [########################################] VOICE
n=1024 nz=512 level= 4487 peak= 5440 avg=3089 max=32768 [########################################] VOICE
n=1024 nz=511 level= 4778 peak= 4568 avg=2612 max=32768 [########################################] VOICE
n=1024 nz=511 level= 4220 peak= 3679 avg=2041 max=32768 [########################################] VOICE
n=1024 nz=511 level= 2706 peak= 1159 avg= 361 max=32768 [########################################] VOICE
n=1024 nz=510 level=  898 peak=  205 avg= 113 max=32768 [########################################] VOICE
n=1024 nz=512 level=  412 peak=  443 avg= 247 max=32768 [##################......................] VOICE
n=1024 nz=505 level=  200 peak=   70 avg=  24 max=32768 [#########...............................] quiet
n=1024 nz=512 level=  134 peak=  182 avg=  70 max=32768 [######..................................] quiet
n=1024 nz=512 level=  135 peak=  145 avg=  93 max=32768 [######..................................] quiet
n=1024 nz=507 level=   66 peak=   38 avg=  15 max=32768 [###.....................................] quiet
n=1024 nz=509 level=   46 peak=   47 avg=  24 max=32768 [##......................................] quiet
n=1024 nz=491 level=   35 peak=   23 avg=   7 max=32768 [#.......................................] quiet
n=1024 nz=507 level=   41 peak=   37 avg=  14 max=32768 [#.......................................] quiet
n=1024 nz=499 level=   46 peak=   51 avg=  12 max=32768 [##......................................] quiet
n=1024 nz=512 level= 1097 peak= 2726 avg=1343 max=32768 [########################################] VOICE
n=1024 nz=512 level= 4408 peak= 6031 avg=3467 max=32768 [########################################] VOICE
n=1024 nz=512 level= 6662 peak= 7666 avg=4401 max=32768 [########################################] VOICE
n=1024 nz=512 level= 7739 peak= 8051 avg=4597 max=32768 [########################################] VOICE
n=1024 nz=512 level= 6423 peak= 4433 avg=2025 max=32768 [########################################] VOICE
n=1024 nz=511 level= 2235 peak=  487 avg= 136 max=32768 [########################################] VOICE
n=1024 nz=512 level=  820 peak=  586 avg=  90 max=32768 [#####################################...] VOICE
n=1024 nz=512 level= 1874 peak= 1582 avg= 577 max=32768 [########################################] VOICE
n=1024 nz=510 level= 2099 peak= 1665 avg= 633 max=32768 [########################################] VOICE
n=1024 nz=509 level=  911 peak=  211 avg=  44 max=32768 [########################################] VOICE
n=1024 nz=509 level=  555 peak=  125 avg=  30 max=32768 [#########################...............] VOICE
n=1024 nz=511 level=  348 peak=  302 avg= 122 max=32768 [###############.........................] VOICE
n=1024 nz=504 level=  168 peak=   73 avg=  22 max=32768 [#######.................................] quiet
'''
