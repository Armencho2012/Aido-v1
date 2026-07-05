import machine
import math
import time
import struct
import os
import gc
from config import I2S_LRC_PIN, I2S_BCLK_PIN, I2S_DIN_PIN, AUDIO_VOLUME, AUDIO_DEBUG
_SAFE_RATE     = 22050
_SAFE_CHANNELS = 1
_SAFE_VOLUME   = AUDIO_VOLUME
_IBUF          = 8000
_CHUNK         = 2048
_STREAM_CHUNK  = 512
_SILENCE_PAD   = 20000
_DRAIN_REPS    = 8
_DRAIN_SLEEP_MS = 300
_PREROLL_BYTES = _IBUF + 4096
_INIT_SILENCE_BYTES = _IBUF * 2
_SKIP_MS       = 120
_UNKNOWN_WAV_SIZE = 0xFFFFFFFF
class AudioEngine:
    """
    Manages I2S audio output using the MAX98357A module.
    SAFE MODE: I2S is initialised once at boot (22050 Hz mono) and
    never re-initialised during playback.  All WAV files are played
    at that fixed rate regardless of what the header says.
    """
    def __init__(self):
        self.enabled  = False
        self.rate     = _SAFE_RATE
        self.channels = _SAFE_CHANNELS
        self.i2s      = None
        self.wav_lead_trim_ms = _SKIP_MS
        self._init_i2s()
    def _init_i2s(self):
        """Initialise I2S at the fixed safe rate.  Never called again."""
        if self.i2s:
            try:
                self.i2s.deinit()
            except Exception:
                pass
            self.i2s = None
        try:
            self.i2s = machine.I2S(
                0,
                sck=machine.Pin(I2S_BCLK_PIN),
                ws=machine.Pin(I2S_LRC_PIN),
                sd=machine.Pin(I2S_DIN_PIN),
                mode=machine.I2S.TX,
                bits=16,
                format=machine.I2S.MONO,
                rate=_SAFE_RATE,
                ibuf=_IBUF,
            )
            self.enabled = True
            if AUDIO_DEBUG:
                print("[AUDIO] I2S init @ {}Hz Mono (safe mode)".format(_SAFE_RATE))
            self._flood_silence(_INIT_SILENCE_BYTES)
            time.sleep_ms(100)
        except Exception as e:
            print("[AUDIO] Init failed:", e)
            self.enabled = False
    def _flood_silence(self, nbytes):
        """Write nbytes of silence in small blocks."""
        block = bytearray(512)
        sent  = 0
        while sent < nbytes:
            n = min(512, nbytes - sent)
            self._write_blocking(memoryview(block)[:n])
            sent += n
    def _drain_buffer(self):
        """Push remaining audio out of the DMA buffer."""
        if not self.i2s:
            return
        block = bytearray(2000)
        for _ in range(_DRAIN_REPS):
            self._write_blocking(block)
        time.sleep_ms(_DRAIN_SLEEP_MS)
    def _write_blocking(self, buf):
        """Write buf to I2S, blocking until every byte is accepted."""
        written = 0
        mv = memoryview(buf) if not isinstance(buf, memoryview) else buf
        while written < len(mv):
            w = self.i2s.write(mv[written:])
            if w > 0:
                written += w
            else:
                time.sleep_ms(1)
        return written
    def start_wav_stream(self, file_rate=_SAFE_RATE, channels=_SAFE_CHANNELS,
                         bits=16, volume=_SAFE_VOLUME):
        """Prepare I2S for raw PCM chunks from a WAV body."""
        if not self.enabled or not self.i2s:
            self.resume()
        if not self.enabled or not self.i2s:
            return False
        if channels != _SAFE_CHANNELS or bits != 16:
            print("[AUDIO] Stream format unsupported: {}Hz {}ch {}bit".format(
                file_rate, channels, bits))
            return False
        volume = min(max(float(volume), 0.0), _SAFE_VOLUME)
        self._stream_vol_int = int(volume * 256)
        try:
            gc.collect()
        except Exception:
            pass
        self._stream_out = bytearray(_STREAM_CHUNK)
        self._stream_out_mv = memoryview(self._stream_out)
        self._stream_gc_was_enabled = True
        self._flood_silence(_PREROLL_BYTES)
        time.sleep_ms(80)
        try:
            gc.collect()
        except Exception:
            pass
        try:
            self._stream_gc_was_enabled = gc.isenabled()
        except Exception:
            pass
        try:
            gc.disable()
        except Exception:
            pass
        return True
    def write_wav_stream(self, buf, n=None):
        """Scale and write one raw PCM chunk to I2S."""
        if n is None:
            n = len(buf)
        if n <= 0:
            return
        out = self._stream_out
        out_mv = self._stream_out_mv
        vol_int = self._stream_vol_int
        i = 0
        while i + 1 < n:
            s = buf[i] | (buf[i+1] << 8)
            if s >= 32768:
                s -= 65536
            s = (s * vol_int) >> 8
            if s >  32767: s =  32767
            if s < -32768: s = -32768
            out[i]   =  s & 0xFF
            out[i+1] = (s >> 8) & 0xFF
            i += 2
        self._write_blocking(out_mv[:n])
    def finish_wav_stream(self):
        """Restore GC and drain the I2S buffer after streamed playback."""
        try:
            if getattr(self, "_stream_gc_was_enabled", True):
                gc.enable()
        except Exception:
            pass
        self._stream_out = None
        self._stream_out_mv = None
        try:
            gc.collect()
        except Exception:
            pass
        self._drain_buffer()
    def _resolve_file(self, filename):
        """Use a local basename fallback when an SD path is not readable."""
        try:
            os.stat(filename)
            return filename
        except OSError:
            pass
        if isinstance(filename, str) and filename.startswith("/sd/"):
            fallback = filename.split("/")[-1]
            try:
                os.stat(fallback)
                if AUDIO_DEBUG:
                    print("[AUDIO] Falling back to local", fallback)
                return fallback
            except OSError:
                pass
        return filename
    def _local_fallback(self, filename):
        if isinstance(filename, str) and filename.startswith("/sd/"):
            fallback = filename.split("/")[-1]
            try:
                os.stat(fallback)
                return fallback
            except OSError:
                pass
        return None
    def inspect_wav(self, filename):
        """Return basic WAV metadata dict or None."""
        try:
            filename = self._resolve_file(filename)
            with open(filename, "rb") as f:
                hdr = f.read(12)
                if len(hdr) < 12:
                    return None
                if hdr[0:4] != b'RIFF' or hdr[8:12] != b'WAVE':
                    return None
                riff_size = struct.unpack('<I', hdr[4:8])[0]
                meta = {
                    "riff_size": riff_size,
                    "format": 0,
                    "data_size": 0,
                    "stream_size": riff_size == _UNKNOWN_WAV_SIZE,
                }
                while True:
                    ch = f.read(8)
                    if len(ch) < 8:
                        break
                    cid = ch[0:4]
                    csz = struct.unpack('<I', ch[4:8])[0]
                    if cid == b'fmt ':
                        fd = f.read(csz)
                        if len(fd) < 16:
                            return None
                        meta["format"] = struct.unpack('<H', fd[0:2])[0]
                        meta["channels"] = struct.unpack('<H', fd[2:4])[0]
                        meta["rate"] = struct.unpack('<I', fd[4:8])[0]
                        meta["bits"] = struct.unpack('<H', fd[14:16])[0]
                    elif cid == b'data':
                        meta["data_size"] = csz
                        if csz == _UNKNOWN_WAV_SIZE:
                            meta["stream_size"] = True
                        break
                    else:
                        f.seek(f.tell() + csz + (csz & 1))
                if "rate" not in meta or "channels" not in meta or "bits" not in meta:
                    return None
                return meta
        except Exception:
            return None
    def play_wav(self, filename, volume=_SAFE_VOLUME, **kwargs):
        """
        Play a 16-bit PCM WAV file in safe mode.
        Rules:
        • Volume is hard-capped at _SAFE_VOLUME.
        • I2S is NOT re-initialised — the file is played at whatever
          rate the hardware is already running (22050 Hz mono).
        • 24 kHz files are rejected outright.
        • A leading skip discards the first _SKIP_MS of samples to
          suppress the click/pop that TTS files often start with.
        • Samples are scaled with integer math before output.
        """
        if not self.enabled or not self.i2s:
            self.resume()
        if not self.enabled or not self.i2s:
            return False
        filename = self._resolve_file(filename)
        volume = min(max(float(volume), 0.0), _SAFE_VOLUME)
        vol_int = int(volume * 256)
        try:
            f_size = os.stat(filename)[6]
            if AUDIO_DEBUG:
                print("[AUDIO] {} ({} B)".format(filename, f_size))
            if f_size < 128:
                print("[AUDIO] File too small, skipping")
                return False
            with open(filename, "rb") as f:
                f.seek(12)
                file_rate = _SAFE_RATE
                channels  = 1
                bits      = 16
                audio_format = 1
                data_size = 0
                data_start = 0
                while True:
                    ch = f.read(8)
                    if len(ch) < 8:
                        print("[AUDIO] No data chunk found")
                        return False
                    cid  = ch[0:4]
                    csz  = struct.unpack('<I', ch[4:8])[0]
                    if cid == b'fmt ':
                        fd       = f.read(csz)
                        audio_format = struct.unpack('<H', fd[0:2])[0]
                        channels = struct.unpack('<H', fd[2:4])[0]
                        file_rate= struct.unpack('<I', fd[4:8])[0]
                        bits     = struct.unpack('<H', fd[14:16])[0]
                        if audio_format != 1:
                            print("[AUDIO] Only PCM WAV supported (format {})".format(audio_format))
                            return False
                        if file_rate != _SAFE_RATE:
                            print("[AUDIO] Only {}Hz WAV supported (got {}Hz)".format(_SAFE_RATE, file_rate))
                            return False
                        if bits != 16:
                            print("[AUDIO] Only 16-bit WAV supported (got {}bit)".format(bits))
                            return False
                    elif cid == b'data':
                        data_size = csz
                        data_start = f.tell()
                        real_size = max(0, f_size - data_start)
                        if data_size == _UNKNOWN_WAV_SIZE or data_size > real_size:
                            data_size = real_size
                            if AUDIO_DEBUG:
                                print("[AUDIO] WAV data size repaired to {} B".format(data_size))
                        break
                    else:
                        f.seek(f.tell() + csz + (csz & 1))
                if channels != _SAFE_CHANNELS:
                    print("[AUDIO] Only mono WAV supported (got {}ch)".format(channels))
                    return False
                if AUDIO_DEBUG:
                    print("[AUDIO] Playing {}Hz {}ch @ vol {:.2f}".format(
                        file_rate, channels, volume))
                bpf        = channels * 2
                skip_bytes = (file_rate * self.wav_lead_trim_ms // 1000) * bpf
                skip_bytes -= skip_bytes % bpf
                if data_size and skip_bytes > data_size:
                    skip_bytes = 0
                if skip_bytes:
                    f.seek(f.tell() + skip_bytes)
                    if AUDIO_DEBUG:
                        print("[AUDIO] Skipped {}ms pop".format(self.wav_lead_trim_ms))
                remaining = data_size - skip_bytes if data_size else 0
                self._flood_silence(_PREROLL_BYTES)
                time.sleep_ms(100)
                try:
                    gc.collect()
                except Exception:
                    pass
                gc_was_enabled = True
                try:
                    gc_was_enabled = gc.isenabled()
                except Exception:
                    pass
                try:
                    gc.disable()
                except Exception:
                    pass
                raw  = bytearray(_CHUNK)
                out  = bytearray(_CHUNK)
                raw_mv = memoryview(raw)
                out_mv = memoryview(out)
                try:
                    while True:
                        if data_size:
                            if remaining <= 0:
                                break
                            to_read = _CHUNK if remaining > _CHUNK else remaining
                            n = f.readinto(raw_mv[:to_read])
                            if n:
                                remaining -= n
                        else:
                            n = f.readinto(raw_mv)
                        if not n:
                            break
                        i = 0
                        while i + 1 < n:
                            s = raw[i] | (raw[i+1] << 8)
                            if s >= 32768:
                                s -= 65536
                            s = (s * vol_int) >> 8
                            if s >  32767: s =  32767
                            if s < -32768: s = -32768
                            out[i]   =  s & 0xFF
                            out[i+1] = (s >> 8) & 0xFF
                            i += 2
                        self._write_blocking(out_mv[:n])
                        if data_size and remaining <= 0:
                            break
                finally:
                    try:
                        if gc_was_enabled:
                            gc.enable()
                    except Exception:
                        pass
                if AUDIO_DEBUG:
                    print("[AUDIO] Done")
            self._drain_buffer()
            return True
        except Exception as e:
            print("[AUDIO ERROR]", e)
            try:
                self._flood_silence(8192)
            except Exception:
                pass
            fallback = self._local_fallback(filename)
            if fallback:
                print("[AUDIO] Retrying local cache", fallback)
                try:
                    return self.play_wav(fallback, volume=volume)
                except Exception as retry_error:
                    print("[AUDIO] Local retry failed:", retry_error)
            return False
    def _play_tone_raw(self, freq, duration_ms, volume=0.04):
        """Queue a short sine-wave tone without draining the I2S buffer."""
        if not self.enabled or not self.i2s:
            return False
        if freq <= 0 or duration_ms <= 0:
            return False
        volume = min(max(float(volume), 0.0), 0.15)
        amplitude = int(32767 * volume)
        spc = max(2, int(_SAFE_RATE / freq))
        cycle = bytearray(spc * 2)
        step  = 2 * math.pi / spc
        for i in range(spc):
            v = int(amplitude * math.sin(i * step))
            struct.pack_into('<h', cycle, i * 2, v)
        mv           = memoryview(cycle)
        played_ms    = 0
        cycle_ms     = (spc / _SAFE_RATE) * 1000
        while played_ms < duration_ms:
            self._write_blocking(mv)
            played_ms += cycle_ms
        return True
    def _play_silence_raw(self, duration_ms):
        if not self.enabled or not self.i2s or duration_ms <= 0:
            return
        remaining = int((_SAFE_RATE * 2 * duration_ms) / 1000)
        remaining -= remaining % 2
        block = bytearray(256)
        mv = memoryview(block)
        while remaining > 0:
            n = min(remaining, len(block))
            self._write_blocking(mv[:n])
            remaining -= n
    def _play_fx_notes(self, notes, drain=False):
        try:
            for note in notes:
                freq = note[0]
                dur = note[1]
                vol = note[2] if len(note) > 2 else 0.04
                gap = note[3] if len(note) > 3 else 0
                if freq:
                    self._play_tone_raw(freq, dur, vol)
                else:
                    self._play_silence_raw(dur)
                if gap:
                    self._play_silence_raw(gap)
            if drain:
                self._drain_buffer()
        except Exception as e:
            print("[AUDIO] FX failed:", e)
    def play_tone(self, freq, duration_ms, volume=0.04, **kwargs):
        """Synthesise and play a sine-wave tone."""
        if self._play_tone_raw(freq, duration_ms, volume):
            self._drain_buffer()
    def play_fx(self, name, **kwargs):
        if not self.enabled or not self.i2s:
            if isinstance(name, str) and name[:4] == "rps_":
                self.resume()
            else:
                return
        if not self.enabled or not self.i2s:
            return
        notes = None
        if name == "tap":
            notes = ((660, 35, 0.025),)
        elif name == "double_tap":
            notes = ((660, 30, 0.025, 20), (880, 45, 0.03))
        elif name == "game_select":
            notes = ((784, 28, 0.022),)
        elif name == "rps_ready":
            notes = ((392, 55, 0.03, 18), (523, 60, 0.03, 18),
                     (659, 70, 0.035))
        elif name == "rps_rock":
            notes = ((180, 70, 0.07, 10), (120, 35, 0.045))
        elif name == "rps_paper":
            notes = ((880, 35, 0.025, 12), (1175, 50, 0.022))
        elif name == "rps_scissors":
            notes = ((1480, 28, 0.022, 18), (1480, 28, 0.022))
        elif name == "rps_throw":
            notes = ((330, 65, 0.035, 18), (392, 65, 0.035, 18),
                     (494, 85, 0.04))
        elif name == "rps_win":
            notes = ((523, 60, 0.035, 16), (659, 60, 0.035, 16),
                     (784, 75, 0.04, 16), (1046, 105, 0.04))
        elif name == "rps_lose":
            notes = ((392, 70, 0.03, 18), (330, 80, 0.03, 18),
                     (262, 95, 0.03))
        elif name == "rps_tie":
            notes = ((523, 75, 0.03, 45), (523, 75, 0.03))
        if notes:
            self._play_fx_notes(notes)
            return
        if name == "welcome":
            if AUDIO_DEBUG:
                print("[AUDIO] Startup chime")
            try:
                self.play_tone(440, 100, volume=0.04)
                time.sleep_ms(30)
                self.play_tone(554, 100, volume=0.04)
                time.sleep_ms(30)
                self.play_tone(659, 200, volume=0.04)
                time.sleep_ms(50)
                self.play_tone(880, 400, volume=0.04)
            except Exception as e:
                print("[AUDIO] Chime failed:", e)
    def shutdown(self):
        if self.i2s:
            try:
                self.i2s.deinit()
            except Exception:
                pass
        self.i2s = None
        self.enabled = False
    def release_for_network(self):
        """Free the speaker I2S buffer while HTTPS needs the heap."""
        self.shutdown()
        gc.collect()
        try:
            if AUDIO_DEBUG:
                print("[AUDIO] Released I2S for network; RAM:", gc.mem_free())
        except Exception:
            if AUDIO_DEBUG:
                print("[AUDIO] Released I2S for network")
    def suspend(self):
        """Silence I2S while the microphone records; keep the TX engine alive."""
        if self.enabled and self.i2s:
            try:
                self._flood_silence(4096)
            except Exception:
                pass
    def resume(self):
        """I2S stays initialised in safe mode."""
        if not self.i2s:
            self._init_i2s()
