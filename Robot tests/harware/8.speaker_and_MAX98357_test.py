import machine
import struct
from config import (
    I2S_LRC_PIN,
    I2S_BCLK_PIN,
    I2S_DIN_PIN,
    AUDIO_VOLUME,
)
WAV_FILE = "welcome.wav"
def parse_wav_header(f):
    """Read a standard WAV header and return (channels, sample_rate, bits, data_start, data_size)."""
    riff = f.read(12)
    if riff[0:4] != b"RIFF" or riff[8:12] != b"WAVE":
        raise ValueError("Not a valid WAV file")
    channels = None
    sample_rate = None
    bits = None
    while True:
        chunk_header = f.read(8)
        if len(chunk_header) < 8:
            raise ValueError("Reached end of file before finding data chunk")
        chunk_id = chunk_header[0:4]
        chunk_size = struct.unpack("<I", chunk_header[4:8])[0]
        if chunk_id == b"fmt ":
            fmt_data = f.read(chunk_size)
            channels = struct.unpack("<H", fmt_data[2:4])[0]
            sample_rate = struct.unpack("<I", fmt_data[4:8])[0]
            bits = struct.unpack("<H", fmt_data[14:16])[0]
        elif chunk_id == b"data":
            data_start = f.tell()
            return channels, sample_rate, bits, data_start, chunk_size
        else:
            f.seek(chunk_size, 1)
def apply_volume(buf, volume):
    """Scale a 16-bit PCM buffer in place by a volume factor (0.0-1.0+)."""
    count = len(buf) // 2
    for i in range(count):
        sample = struct.unpack_from("<h", buf, i * 2)[0]
        sample = int(sample * volume)
        if sample > 32767:
            sample = 32767
        elif sample < -32768:
            sample = -32768
        struct.pack_into("<h", buf, i * 2, sample)
    return buf
def play_wav(path, volume=AUDIO_VOLUME):
    print("[AUDIO] Opening {}".format(path))
    with open(path, "rb") as f:
        channels, sample_rate, bits, data_start, data_size = parse_wav_header(f)
        print("[AUDIO] channels={} rate={} bits={} size={} bytes".format(
            channels, sample_rate, bits, data_size
        ))
        fmt = machine.I2S.MONO if channels == 1 else machine.I2S.STEREO
        audio_out = machine.I2S(
            0,
            sck=machine.Pin(I2S_BCLK_PIN),
            ws=machine.Pin(I2S_LRC_PIN),
            sd=machine.Pin(I2S_DIN_PIN),
            mode=machine.I2S.TX,
            bits=bits,
            format=fmt,
            rate=sample_rate,
            ibuf=8192,
        )
        f.seek(data_start)
        chunk_size = 2048
        remaining = data_size
        try:
            while remaining > 0:
                to_read = min(chunk_size, remaining)
                buf = bytearray(f.read(to_read))
                if not buf:
                    break
                apply_volume(buf, volume)
                audio_out.write(buf)
                remaining -= len(buf)
        finally:
            audio_out.deinit()
            print("[AUDIO] Playback finished, I2S released")
def run():
    print("\n" + "=" * 40)
    print("  AUDIO PLAYBACK TEST")
    print("=" * 40)
    try:
        play_wav(WAV_FILE)
        print("RESULT: Audio playback PASSED.")
    except OSError as e:
        print("[AUDIO] {} not found: {}".format(WAV_FILE, e))
        print("RESULT: Audio playback FAILED (file not found).")
    except Exception as e:
        print("[AUDIO] Playback failed:", e)
        print("RESULT: Audio playback FAILED.")
if __name__ == "__main__":
    run()
'''
========================================
  AUDIO PLAYBACK TEST
========================================
[AUDIO] Opening welcome.wav
[AUDIO] channels=1 rate=22050 bits=16 size=133650 bytes
[AUDIO] Playback finished, I2S released
RESULT: Audio playback PASSED.
'''
