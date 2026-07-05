import machine
import os
import struct
import time
import gc
from config import (
    EXPR_NEUTRAL,
    EXPR_SURPRISE,
    EXPR_TALK,
    EXPR_THINK,
    MIC_COOLDOWN_MS,
    MIC_I2S_ID,
    MIC_MIN_RECORD_MS,
    MIC_RECORD_MS,
    MIC_SAMPLE_RATE,
    MIC_SCK_PIN,
    MIC_SD_PIN,
    MIC_DEMO_RECORD_MS,
    MIC_SILENCE_LEVEL,
    MIC_SILENCE_MS,
    MIC_TRIGGER_HITS,
    MIC_TRIGGER_LEVEL,
    MIC_GAIN,
    MIC_BITS,
    VOICE_DEBUG,
    VOICE_SAVE_STUDY_PACKS,
    MIC_WS_PIN,
)
from voice_client import fetch_voice_reply
from storage_paths import runtime_voice_in_path, runtime_voice_reply_path
_MIC_I2S_BITS = MIC_BITS
_MIC_SAMPLE_BYTES = _MIC_I2S_BITS // 8
class VoiceAssistant:
    def __init__(self, oled, audio, face, touch_pin=None):
        self.oled = oled
        self.audio = audio
        self.face = face
        self.touch_pin = touch_pin
        self.available = False
        self.level = 0
        self._hot_hits = 0
        self._check_buf = bytearray(512)
        self._record_buf = bytearray(1024)
        self._pcm_buf = bytearray(1024)
        self._input_path = runtime_voice_in_path()
        self._reply_path = runtime_voice_reply_path()
        self._cooldown_until = time.ticks_add(time.ticks_ms(), 2000)
        self._last_meta = None
        self._last_error = ""
        self._confirm_path = "voice_confirm.wav"
        self._touch_cancelled_recording = False
        try:
            self.i2s = machine.I2S(
                MIC_I2S_ID,
                sck=machine.Pin(MIC_SCK_PIN),
                ws=machine.Pin(MIC_WS_PIN),
                sd=machine.Pin(MIC_SD_PIN),
                mode=machine.I2S.RX,
                bits=_MIC_I2S_BITS,
                format=machine.I2S.MONO,
                rate=MIC_SAMPLE_RATE,
                ibuf=4096,
            )
            self.available = True
            print("[MIC] INMP441 ready on I2S{}".format(MIC_I2S_ID))
        except Exception as e:
            self.i2s = None
            print("[MIC] Disabled:", e)
    def _ensure_buffers(self):
        if self._check_buf is None:
            self._check_buf = bytearray(512)
        if self._record_buf is None:
            self._record_buf = bytearray(1024)
        if self._pcm_buf is None:
            self._pcm_buf = bytearray(1024)
    def _release_buffers_for_network(self):
        self._check_buf = None
        self._record_buf = None
        self._pcm_buf = None
        gc.collect()
        try:
            if VOICE_DEBUG:
                print("[MIC] Released buffers for network; RAM:", gc.mem_free())
        except Exception:
            if VOICE_DEBUG:
                print("[MIC] Released buffers for network")
    def flush_mic(self):
        """Drain any stale data from the I2S mic buffer."""
        if not self.available:
            return
        self._ensure_buffers()
        drain = self._record_buf
        for _ in range(16):
            try:
                n = self.i2s.readinto(drain)
                if not n:
                    break
            except Exception:
                break
        self.level = 0
        self._hot_hits = 0
        self._cooldown_until = time.ticks_add(time.ticks_ms(), 500)
        if VOICE_DEBUG:
            print("[MIC] Buffer flushed")
    def suspend_input(self):
        """Pause microphone RX so it cannot compete with speaker playback."""
        if self.i2s:
            try:
                self.i2s.deinit()
            except Exception:
                pass
        self.i2s = None
        self.available = False
    def resume_input(self):
        """Resume microphone RX after speaker playback."""
        if self.i2s:
            self.available = True
            self._ensure_buffers()
            self.flush_mic()
            return
        for attempt in range(3):
            try:
                gc.collect()
                time.sleep_ms(120)
                self.i2s = machine.I2S(
                    MIC_I2S_ID,
                    sck=machine.Pin(MIC_SCK_PIN),
                    ws=machine.Pin(MIC_WS_PIN),
                    sd=machine.Pin(MIC_SD_PIN),
                    mode=machine.I2S.RX,
                    bits=_MIC_I2S_BITS,
                    format=machine.I2S.MONO,
                    rate=MIC_SAMPLE_RATE,
                    ibuf=4096,
                )
                self.available = True
                self._ensure_buffers()
                self.flush_mic()
                return
            except Exception as e:
                self.i2s = None
                self.available = False
                print("[MIC] Resume failed {}: {}".format(attempt + 1, e))
        print("[MIC] Disabled after resume retries")
    def poll(self):
        if not self.available:
            return False
        self._ensure_buffers()
        if time.ticks_diff(self._cooldown_until, time.ticks_ms()) > 0:
            self._hot_hits = 0
            self.level = 0
            return False
        total_n = 0
        peak_level = 0
        while True:
            n = self.i2s.readinto(self._check_buf)
            if not n or n < 4:
                break
            level = self._measure_level(self._check_buf, n)
            if level > peak_level:
                peak_level = level
            total_n += n
            if total_n > 2048:
                break
        if total_n == 0:
            return False
        self.level = int(self.level * 0.7 + peak_level * 0.3)
        if self.level >= MIC_TRIGGER_LEVEL:
            self._hot_hits += 1
        else:
            self._hot_hits = max(0, self._hot_hits - 1)
        if self._hot_hits >= MIC_TRIGGER_HITS:
            if VOICE_DEBUG:
                print("[MIC] Trigger level={} hits={}".format(self.level, self._hot_hits))
            return True
        return False
    def run_conversation(self, manual=False):
        if not self.available:
            return False
        gc.collect()
        if VOICE_DEBUG:
            print("[MIC] Free RAM:", gc.mem_free())
        if VOICE_DEBUG:
            print("[MIC] {} detected".format("Push-to-talk" if manual else "Voice trigger"))
        self._hot_hits = 0
        self._cooldown_until = time.ticks_add(time.ticks_ms(), MIC_COOLDOWN_MS)
        response_ms = 0
        meta = None
        self._input_path = runtime_voice_in_path()
        self._reply_path = runtime_voice_reply_path()
        self.audio.suspend()
        try:
            if manual:
                if not self._record_fixed_wav(self._input_path, MIC_DEMO_RECORD_MS):
                    self._last_error = "record"
                    self._show_error()
                    return False
            elif not self._record_wav(self._input_path, MIC_RECORD_MS):
                if self._touch_cancelled_recording:
                    return False
                self._last_error = "record"
                self._show_error()
                return False
            self._show_phase("Recorded", EXPR_THINK)
            time.sleep_ms(80)
            self._show_phase("Thinking", EXPR_THINK)
            self._last_error = ""
            request_started = time.ticks_ms()
            self.suspend_input()
            self._release_buffers_for_network()
            try:
                self.audio.release_for_network()
            except AttributeError:
                self.audio.shutdown()
            meta = fetch_voice_reply(
                self._input_path, self._reply_path, stream_audio=None,
                on_playback_start=None
            )
            response_ms = time.ticks_diff(time.ticks_ms(), request_started)
            if not meta or not meta.get("ok"):
                self._last_error = (meta or {}).get("error", "")
                self._show_error()
                return False
            self._reply_path = meta.get("audio_path") or self._reply_path
        finally:
            try:
                self.audio.shutdown()
                gc.collect()
                if VOICE_DEBUG:
                    print("[AUDIO] Released I2S before mic resume; RAM:", gc.mem_free())
            except Exception:
                pass
            self.resume_input()
        return self._finish_response(meta, response_ms, show_recording_size=True)
    def record_voice(self):
        """Record voice (auto-detect start, silence-stop). Returns True if
        a valid recording is ready to send."""
        if not self.available:
            return False
        gc.collect()
        if VOICE_DEBUG:
            print("[MIC] Free RAM:", gc.mem_free())
            print("[MIC] Voice trigger detected")
        self._hot_hits = 0
        self._cooldown_until = time.ticks_add(time.ticks_ms(), MIC_COOLDOWN_MS)
        self._input_path = runtime_voice_in_path()
        self._reply_path = runtime_voice_reply_path()
        self._pending = False
        self.audio.suspend()
        try:
            if not self._record_wav(self._input_path, MIC_RECORD_MS):
                if self._touch_cancelled_recording:
                    return False
                self._last_error = "record"
                self._show_error()
                return False
        finally:
            self.resume_input()
            self.audio.resume()
        self._pending = True
        print("[MIC] Recording ready — waiting for tap to send")
        return True
    def send_and_play(self):
        """Send the pending recording to the API and play the response."""
        if not self._pending:
            return False
        self._pending = False
        gc.collect()
        meta = None
        self.audio.suspend()
        try:
            self._show_phase("Thinking", EXPR_THINK)
            self._last_error = ""
            request_started = time.ticks_ms()
            self.suspend_input()
            self._release_buffers_for_network()
            try:
                self.audio.release_for_network()
            except AttributeError:
                self.audio.shutdown()
            meta = fetch_voice_reply(
                self._input_path, self._reply_path, stream_audio=None,
                on_playback_start=None
            )
            response_ms = time.ticks_diff(time.ticks_ms(), request_started)
            if not meta or not meta.get("ok"):
                self._last_error = (meta or {}).get("error", "")
                self._show_error()
                return False
            self._reply_path = meta.get("audio_path") or self._reply_path
        finally:
            try:
                self.audio.shutdown()
                gc.collect()
                if VOICE_DEBUG:
                    print("[AUDIO] Released I2S before mic resume; RAM:", gc.mem_free())
            except Exception:
                pass
            self.resume_input()
        return self._finish_response(meta, response_ms)
    def show_send_prompt(self):
        """Show the 'Tap to send' screen while waiting for confirmation."""
        self.face.set_talk(False)
        self.face.set_expression(EXPR_THINK, 1.0)
        self.face.update()
        self.face.render(self.oled)
        self.oled.fill_rect(0, 0, 128, 10, 0)
        self.oled.text("Recorded", 32, 0, 1)
        self.oled.fill_rect(0, 54, 128, 10, 0)
        self.oled.text("TapSend HoldBk", 0, 56, 1)
        self.oled.show()
    def cancel_pending(self):
        """Cancel a pending recording without sending."""
        if self._pending:
            self._pending = False
            self._cleanup_temp_input()
            print("[MIC] Pending recording cancelled")
    @property
    def has_pending(self):
        """True if a recording is waiting to be sent."""
        return getattr(self, '_pending', False)
    def _finish_response(self, meta, response_ms, show_recording_size=False):
        self._remember_meta(meta)
        asked = (meta.get("transcript") or "").strip()
        if asked:
            print("[VOICE] You asked:", asked)
        if show_recording_size:
            try:
                f_size = os.stat(self._input_path)[6]
                if VOICE_DEBUG:
                    print("[VOICE] Recording size: {} bytes".format(f_size))
            except Exception:
                pass
        timing = meta.get("timing") or {}
        if timing:
            if "first_audio" not in timing:
                timing["first_audio"] = timing.get("total", 0)
        perceived_ms = timing.get("first_audio", response_ms) if meta.get("played") else response_ms
        print("[VOICE] Response time: {} ms".format(perceived_ms))
        if VOICE_DEBUG and response_ms != perceived_ms:
            print("[VOICE] Full voice flow: {} ms".format(response_ms))
        if VOICE_DEBUG and timing:
            print("[VOICE] Net dns={dns} tcp={tcp} tls={tls} up={upload} wait={wait} first_audio={first_audio} down={download} bytes={bytes}".format(
                **timing
            ))
        if meta.get("played"):
            played = True
        else:
            self._show_speaking_phase(False, False)
            self.suspend_input()
            reply_path = self._resolve_reply_path(meta.get("audio_path") or self._reply_path)
            self._reply_path = reply_path
            try:
                played = self.audio.play_wav(reply_path)
            finally:
                try:
                    self.audio.shutdown()
                    gc.collect()
                    if VOICE_DEBUG:
                        print("[AUDIO] Released I2S after playback; RAM:", gc.mem_free())
                except Exception:
                    pass
                self.resume_input()
        if not played:
            self._last_error = "audio"
            print("[VOICE] Reply playback failed:", self._reply_path)
            self._show_error()
        self.face.set_talk(False)
        self.face.set_expression(EXPR_NEUTRAL, 1.0)
        self.face.update()
        self.face.render(self.oled)
        self.oled.show()
        learned, saved = self._save_study_pack_from_meta(meta)
        if learned:
            print("[STUDY] Deferred study save complete:", saved)
        self._cooldown_until = time.ticks_add(time.ticks_ms(), MIC_COOLDOWN_MS)
        self._cleanup_temp_input()
        return played
    def _resolve_reply_path(self, path):
        try:
            os.stat(path)
            return path
        except Exception:
            pass
        if isinstance(path, str) and path.startswith("/sd/"):
            fallback = path.split("/")[-1]
            try:
                os.stat(fallback)
                print("[VOICE] Reply fallback local", fallback)
                return fallback
            except Exception:
                pass
        return path
    def _save_study_pack_from_meta(self, meta):
        pack = (meta or {}).pop("study_pack", None)
        if not pack and not VOICE_SAVE_STUDY_PACKS:
            return False, False
        if not pack:
            question = ((meta or {}).get("transcript") or "").strip()
            answer = ((meta or {}).get("reply_text") or "").strip()
            if question and answer:
                try:
                    from voice_client import fetch_study_pack
                    print("[STUDY] Fetching compact study pack")
                    pack = fetch_study_pack(question[:240], answer[:480])
                except Exception as e:
                    print("[STUDY] Fetch failed:", e)
                    pack = None
            if not pack:
                return False, False
        try:
            from study_sync import save_study_pack
            saved = save_study_pack(pack)
            if saved:
                print("[STUDY] Saved flashcards, quiz, analysis, and map")
            else:
                print("[STUDY] Empty study pack")
            del pack
            gc.collect()
            return True, saved
        except Exception as e:
            print("[STUDY] Save failed:", e)
            try:
                del pack
            except Exception:
                pass
            gc.collect()
            return True, False
    def _remember_meta(self, meta):
        if not meta:
            self._last_meta = None
            return
        self._last_meta = {
            "ok": meta.get("ok", False),
            "intent": (meta.get("intent") or "")[:24],
            "transcript": (meta.get("transcript") or "")[:160],
            "reply_text": (meta.get("reply_text") or "")[:200],
            "audio_path": meta.get("audio_path") or self._reply_path,
        }
    def _record_fixed_wav(self, filename, duration_ms):
        target_bytes = (MIC_SAMPLE_RATE * duration_ms // 1000) * 2
        self._show_phase("Listening", EXPR_SURPRISE)
        time.sleep_ms(180)
        if VOICE_DEBUG:
            print("[MIC] Recording voice")
        filename = self._record_to_path(filename, target_bytes, fixed=True)
        if not filename:
            return False
        try:
            self._input_path = filename
            return os.stat(filename)[6] > 4000
        except Exception:
            return False
    def _record_wav(self, filename, max_duration_ms):
        self._touch_cancelled_recording = False
        max_bytes = (MIC_SAMPLE_RATE * max_duration_ms // 1000) * 2
        min_bytes = (MIC_SAMPLE_RATE * MIC_MIN_RECORD_MS // 1000) * 2
        written = 0
        silence_run_ms = 0
        speech_started = False
        speech_level = max(MIC_SILENCE_LEVEL + 250, MIC_TRIGGER_LEVEL - 100)
        speech_hits = 0
        self._show_phase("Listening", EXPR_SURPRISE)
        if VOICE_DEBUG:
            print("[MIC] Recording voice")
        filename = self._record_to_path(
            filename, max_bytes, fixed=False, min_bytes=min_bytes,
            speech_level=speech_level, speech_hits=speech_hits,
            silence_run_ms=silence_run_ms, start_immediately=True
        )
        if not filename:
            return False
        try:
            self._input_path = filename
            return os.stat(filename)[6] > 4000
        except Exception:
            return False
    def _record_to_path(self, filename, max_bytes, fixed=False, min_bytes=0,
                        speech_level=0, speech_hits=0, silence_run_ms=0,
                        start_immediately=False):
        self._ensure_buffers()
        written = 0
        speech_started = fixed or start_immediately
        path = filename
        fallback_path = "voice_in.wav" if filename.startswith("/sd/") else filename
        max_duration_ms = (max_bytes * 1000) // (MIC_SAMPLE_RATE * 2)
        for attempt in (path, fallback_path):
            written = 0
            speech_started = fixed or start_immediately
            silence_run = silence_run_ms
            hits = speech_hits
            voice_peak = 0
            record_deadline = time.ticks_add(time.ticks_ms(), max_duration_ms + 1200)
            try:
                with open(attempt, "wb") as f:
                    f.write(self._wav_header(max_bytes))
                    self.i2s.readinto(self._record_buf)
                    touch_last = bool(self.touch_pin.value()) if self.touch_pin else False
                    loops = 0
                    while written < max_bytes:
                        if time.ticks_diff(record_deadline, time.ticks_ms()) <= 0:
                            print("[MIC] Record timeout bytes={} peak={}".format(
                                written, voice_peak))
                            break
                        loops += 1
                        if loops % 15 == 0:
                            gc.collect()
                        n = self.i2s.readinto(self._record_buf)
                        if not n or n < 4:
                            time.sleep_ms(5)
                            continue
                        last_chunk_ms = (n // _MIC_SAMPLE_BYTES) * 1000 // MIC_SAMPLE_RATE
                        level = self._measure_level(self._record_buf, n)
                        if level > voice_peak:
                            voice_peak = level
                        self.level = int(self.level * 0.6 + level * 0.4)
                        if not fixed and not speech_started:
                            if level >= speech_level:
                                hits += 1
                                if hits >= 2:
                                    speech_started = True
                                    silence_run = 0
                                    print("[MIC] Started talking")
                            else:
                                hits = 0
                                if loops % 8 == 0:
                                    self._show_listening_frame(0)
                                continue
                        out = self._convert_to_pcm16(self._record_buf, n)
                        if not out:
                            continue
                        remain = max_bytes - written
                        if len(out) > remain:
                            out = out[:remain]
                        f.write(out)
                        written += len(out)
                        if loops % 8 == 0:
                            self._show_listening_frame(written / float(max_bytes))
                        if not fixed:
                            adaptive_silence = voice_peak // 4
                            if adaptive_silence > 2600:
                                adaptive_silence = 2600
                            stop_level = max(MIC_SILENCE_LEVEL, adaptive_silence)
                            if level <= stop_level:
                                silence_run += last_chunk_ms
                            else:
                                silence_run = 0
                            if written >= min_bytes and silence_run >= MIC_SILENCE_MS:
                                if VOICE_DEBUG:
                                    print("[MIC] Silence stop level={} gate={}".format(
                                        level, stop_level))
                                break
                            if self.touch_pin:
                                touch_now = bool(self.touch_pin.value())
                                if touch_now != touch_last:
                                    touch_last = touch_now
                                    if not fixed and written < min_bytes:
                                        self._touch_cancelled_recording = True
                                        print("[MIC] Touch cancel")
                                        break
                                    if written >= min_bytes:
                                        print("[MIC] Tap stop")
                                        break
                    if written >= max_bytes:
                        print("[MIC] Max record length reached")
                if self._touch_cancelled_recording:
                    try:
                        os.remove(attempt)
                    except Exception:
                        pass
                    return None
                if not speech_started:
                    print("[MIC] No speech detected")
                    try:
                        os.remove(attempt)
                    except Exception:
                        pass
                    return None
                if not fixed and written < min_bytes:
                    print("[MIC] Recording too short bytes={} min={}".format(
                        written, min_bytes))
                    try:
                        os.remove(attempt)
                    except Exception:
                        pass
                    return None
                with open(attempt, "r+b") as f:
                    f.seek(0)
                    f.write(self._wav_header(written))
                if attempt != filename:
                    print("[MIC] Fallback local record path:", attempt)
                if VOICE_DEBUG:
                    print("[MIC] Recording saved bytes={} peak={}".format(
                        written, voice_peak))
                if fixed:
                    print("[MIC] Message sent")
                return attempt
            except OSError as e:
                if attempt == fallback_path:
                    print("[MIC] Record failed:", e)
                    return None
                print("[MIC] SD write failed, falling back local")
        return None
    def _cleanup_temp_input(self):
        try:
            os.remove(self._input_path)
        except Exception:
            pass
    def _measure_level(self, buf, nbytes):
        peak = 0
        if _MIC_I2S_BITS == 16:
            for i in range(0, nbytes - 1, 8):
                sample16 = struct.unpack_from("<h", buf, i)[0]
                mag = -sample16 if sample16 < 0 else sample16
                if mag > peak:
                    peak = mag
            return peak
        for i in range(0, nbytes - 3, 16):
            sample32 = struct.unpack_from("<i", buf, i)[0]
            sample16 = sample32 >> 16
            mag = -sample16 if sample16 < 0 else sample16
            if mag > peak:
                peak = mag
        return peak
    def _convert_to_pcm16(self, buf, nbytes):
        self._ensure_buffers()
        out = self._pcm_buf
        o = 0
        if _MIC_I2S_BITS == 16:
            for i in range(0, nbytes - 1, 2):
                s = struct.unpack_from("<h", buf, i)[0] * MIC_GAIN
                if s < -32768: s = -32768
                elif s > 32767: s = 32767
                struct.pack_into("<h", out, o, s)
                o += 2
            return memoryview(out)[:o]
        for i in range(0, nbytes - 3, 4):
            sample32 = struct.unpack_from("<i", buf, i)[0]
            s = (sample32 >> 16) * MIC_GAIN
            if s < -32768: s = -32768
            elif s > 32767: s = 32767
            struct.pack_into("<h", out, o, s)
            o += 2
        return memoryview(out)[:o]
    def _wav_header(self, data_size):
        byte_rate = MIC_SAMPLE_RATE * 2
        return struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF",
            36 + data_size,
            b"WAVE",
            b"fmt ",
            16,
            1,
            1,
            MIC_SAMPLE_RATE,
            byte_rate,
            2,
            16,
            b"data",
            data_size,
        )
    def _show_phase(self, label, expr):
        self.face.set_talk(False)
        self.face.set_expression(expr, 1.0)
        self.face.update()
        self.face.render(self.oled)
        self.oled.fill_rect(0, 0, 128, 10, 0)
        self.oled.text(label[:16], 24, 0, 1)
        self.oled.show()
    def _show_listening_frame(self, progress):
        self.face.set_talk(False)
        self.face.set_expression(EXPR_SURPRISE, 1.0)
        self.face.update()
        self.face.render(self.oled)
        self.oled.fill_rect(0, 0, 128, 10, 0)
        self.oled.text("Listening", 28, 0, 1)
        bars = 5
        center_x = 64
        base_y = 56
        amp = max(2, min(12, self.level // 2500))
        for i in range(bars):
            x = center_x - 20 + i * 10
            h = amp + (i % 2) * 3
            self.oled.fill_rect(x, base_y - h, 6, h, 1)
        self.oled.rect(12, 60, 104, 3, 1)
        self.oled.fill_rect(13, 61, int(102 * progress), 1, 1)
        self.oled.show()
    def _show_error(self):
        self.face.set_talk(False)
        self.face.set_expression(EXPR_THINK, 1.0)
        self.face.update()
        self.face.render(self.oled)
        self.oled.fill_rect(0, 0, 128, 10, 0)
        label = "WiFi lost" if self._last_error == "wifi" else "Voice failed"
        self.oled.text(label[:16], 24, 0, 1)
        self.oled.show()
        time.sleep_ms(900)
    def _show_live_speaking_phase(self):
        self._show_speaking_phase(False, False)
    def _show_speaking_phase(self, learned, saved):
        self.face.set_expression(EXPR_TALK, 1.0)
        self.face.set_talk(True)
        self.face.update()
        self.face.render(self.oled)
        self.oled.fill_rect(0, 0, 128, 10, 0)
        self.oled.text("Speaking", 28, 0, 1)
        if learned:
            self.oled.fill_rect(0, 54, 128, 10, 0)
            if saved:
                self.oled.text("Cards+Quiz ready", 0, 54, 1)
            else:
                self.oled.text("Learning mode", 12, 54, 1)
        self.oled.show()
