'''
[BOOT] CPU @ 125MHz
[BOOT] Free RAM: 185KB
[SD] Pins sck=10 mosi=11 miso=12 cs=13
[SD] Idle MISO=1, CS=1
[SD] Probe MISO after clocks @ 100000Hz: 1
[SD] Mounted at /sd init=100000Hz bus=1000000Hz
[SD] Files: ['.aido_sd_mounted', 'flashcards.json', 'voice_in.wav', 'quiz.json', 'analyse.json', 'map.json', 'voice_reply.wav']
[BOOT] Boosted CPU @ 250MHz
[WiFi] Early already connected: 10.73.216.137
========================================
  AIDO OS v3.0 — Booting...
========================================
[I2C] Scanning bus...
[I2C] Found 3 device(s): ['0x29', '0x3C', '0x68']
[OLED] 128x64 initialized
[TOUCH] Auto idle=1
[TOUCH] GPIO16 ready
[LED] GPIO18 ready
[MPU] Initialized OK
[MPU] Calibrating...
[MPU] Calibration complete
[TOF] VL53L0X online at 0x29
[MIC] INMP441 ready on I2S1
[OS] Core systems loaded
[OS] Free RAM: 55792 bytes
[OS] Entering main loop...
[OS] Controls:
  Voice    = Talk on face
  1x Tap   = Scroll / Navigate
  2x Tap   = Confirm / Select
  3x Tap   = Go Back
[SD] Removed voice_in.wav
[SD] Removed voice_reply.wav
'''
import machine
import time
import gc
import os
import sys
from config import (
    I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ,
    TOUCH_PIN, LED_PIN, OLED_WIDTH, OLED_HEIGHT, OLED_ADDR,
    FRAME_DELAY_MS, STATE_INPUT_LOCK_MS,
    STATE_BOOT, STATE_FACE, STATE_MENU, STATE_ACTION,
    STATE_FLASHCARD, STATE_QUIZ, STATE_TALK,
    STATE_SETTINGS, STATE_NEURAL, STATE_GAMES, STATE_ANALYSE,
    EXPR_NEUTRAL, EXPR_HAPPY, EXPR_SAD, EXPR_ANGRY,
    EXPR_SURPRISE, EXPR_SLEEPY, EXPR_LOVE, EXPR_THINK,
    EXPR_BLINK, EXPR_WINK, EXPR_TALK,
    MPU_EYE_GAIN,
    SD_WELCOME_WAV,
    VOICE_PUSH_TO_TALK,
)
print("\n" + "=" * 40)
print("  AIDO OS v3.0 — Booting...")
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
from lib.ssd1306 import SSD1306_I2C
oled = SSD1306_I2C(OLED_WIDTH, OLED_HEIGHT, i2c, addr=OLED_ADDR)
oled.contrast(255)
print("[OLED] {}x{} initialized".format(OLED_WIDTH, OLED_HEIGHT))
touch_pin = machine.Pin(TOUCH_PIN, machine.Pin.IN, machine.Pin.PULL_DOWN)
try:
    from touch import (
        TouchEngine,
        GESTURE_NAMES,
        GESTURE_TAP,
        GESTURE_DOUBLE_TAP,
        GESTURE_TRIPLE_TAP,
    )
except ImportError:
    print("[TOUCH] touch.py missing; using built-in touch reader")
    try:
        import config as _touch_config
    except ImportError:
        _touch_config = None
    def _touch_cfg(name, default):
        if _touch_config is None:
            return default
        return getattr(_touch_config, name, default)
    _TOUCH_DEBOUNCE_MS = _touch_cfg("DEBOUNCE_MS", 18)
    _TOUCH_DOUBLE_TAP_MS = _touch_cfg("DOUBLE_TAP_MS", 340)
    _TOUCH_TRIPLE_TAP_MS = _touch_cfg("TRIPLE_TAP_MS", 260)
    _TOUCH_MODE = _touch_cfg("TOUCH_MODE", "auto")
    _TOUCH_IDLE_LEARN_MS = _touch_cfg("TOUCH_IDLE_LEARN_MS", 700)
    _TOUCH_TOGGLE_LEARN_MS = _touch_cfg("TOUCH_TOGGLE_LEARN_MS", 220)
    GESTURE_NONE       = 0
    GESTURE_TAP        = 1
    GESTURE_DOUBLE_TAP = 2
    GESTURE_TRIPLE_TAP = 3
    GESTURE_NAMES = {
        0: "NONE",
        1: "TAP",
        2: "DOUBLE",
        3: "BACK",
    }
    _TOUCH_MODE_AUTO = "auto"
    _TOUCH_MODE_MOMENTARY = "momentary"
    _TOUCH_MODE_TOGGLE = "toggle"
    class TouchEngine:
        def __init__(self, pin):
            self.pin = pin
            self._configured_mode = self._normalize_mode(_TOUCH_MODE)
            self._mode = None if self._configured_mode == _TOUCH_MODE_AUTO else self._configured_mode
            self._idle = self._learn_idle()
            self._raw = int(self.pin.value())
            self._stable = self._raw
            now = time.ticks_ms()
            self._last_raw_change = now
            self._active_since = now if self._stable != self._idle else 0
            self._clear_taps()
            print("[TOUCH] Built-in idle={}".format(self._idle))
        def _normalize_mode(self, mode):
            mode = str(mode).lower()
            if mode in ("toggle", "latched", "latch", "edge"):
                return _TOUCH_MODE_TOGGLE
            if mode in ("momentary", "press", "button"):
                return _TOUCH_MODE_MOMENTARY
            return _TOUCH_MODE_AUTO
        def _learn_idle(self):
            zeroes = 0
            ones = 0
            start = time.ticks_ms()
            while time.ticks_diff(time.ticks_ms(), start) < _TOUCH_IDLE_LEARN_MS:
                if int(self.pin.value()):
                    ones += 1
                else:
                    zeroes += 1
                time.sleep_ms(5)
            return 1 if ones > zeroes else 0
        def _clear_taps(self):
            self._tap_count = 0
            self._tap_deadline = None
        def _set_auto_mode(self, mode):
            if self._configured_mode != _TOUCH_MODE_AUTO:
                return
            if self._mode != mode:
                self._mode = mode
                print("[TOUCH] Auto mode -> {}".format(mode))
        def reset(self):
            now = time.ticks_ms()
            self._raw = int(self.pin.value())
            self._stable = self._raw
            self._last_raw_change = now
            self._active_since = now if self._stable != self._idle else 0
            self._clear_taps()
        def cancel_pending(self):
            self._clear_taps()
            self._active_since = time.ticks_ms() if self._stable != self._idle else 0
        def update(self):
            now = time.ticks_ms()
            raw = int(self.pin.value())
            if raw != self._raw:
                self._raw = raw
                self._last_raw_change = now
            if raw != self._stable:
                if time.ticks_diff(now, self._last_raw_change) >= _TOUCH_DEBOUNCE_MS:
                    self._stable = raw
                    gesture = self._handle_edge(now)
                    if gesture:
                        return gesture
            if (
                self._mode is None
                and self._stable != self._idle
                and self._active_since
                and time.ticks_diff(now, self._active_since) >= _TOUCH_TOGGLE_LEARN_MS
            ):
                self._set_auto_mode(_TOUCH_MODE_TOGGLE)
            return self._finish_waiting_gesture(now)
        def _handle_edge(self, now):
            active = self._stable != self._idle
            if self._mode == _TOUCH_MODE_TOGGLE:
                return self._count_tap(now)
            if active:
                self._active_since = now
                return self._count_tap(now)
            self._active_since = 0
            if self._mode is None:
                self._set_auto_mode(_TOUCH_MODE_MOMENTARY)
            return GESTURE_NONE
        def _count_tap(self, now):
            if self._tap_deadline is not None and time.ticks_diff(now, self._tap_deadline) > 0:
                self._clear_taps()
            self._tap_count += 1
            if self._tap_count >= 3:
                self._clear_taps()
                return GESTURE_TRIPLE_TAP
            wait_ms = _TOUCH_DOUBLE_TAP_MS if self._tap_count == 1 else _TOUCH_TRIPLE_TAP_MS
            self._tap_deadline = time.ticks_add(now, wait_ms)
            return GESTURE_NONE
        def _finish_waiting_gesture(self, now):
            if self._tap_deadline is None:
                return GESTURE_NONE
            if time.ticks_diff(now, self._tap_deadline) < 0:
                return GESTURE_NONE
            gesture = GESTURE_TAP if self._tap_count == 1 else GESTURE_DOUBLE_TAP
            self._clear_taps()
            return gesture
        @property
        def is_active(self):
            if self._mode == _TOUCH_MODE_TOGGLE:
                return bool(self._tap_count)
            return bool(self._tap_count or self._stable != self._idle)
        @property
        def blocks_voice_poll(self):
            return self.is_active
        @property
        def is_pressed(self):
            return self._stable != self._idle
touch = TouchEngine(touch_pin)
print("[TOUCH] GPIO{} ready".format(TOUCH_PIN))
led = machine.Pin(LED_PIN, machine.Pin.OUT)
led.value(0)
print("[LED] GPIO{} ready".format(LED_PIN))
from mpu6050 import MPU6050, VirtualMPU
try:
    mpu = MPU6050(i2c)
    if not mpu.available:
        raise OSError("MPU not responding")
except Exception:
    print("[MPU] Using virtual fallback")
    mpu = VirtualMPU()
from face import FaceEngine
from menu import MenuSystem
from status import StatusBar
from boot_anim import BootAnimation
from audio import AudioEngine
from car_anim import play as play_car_transition
from mic import VoiceAssistant
from tof_behavior import ToFKissController
try:
    import study_sync as _study_sync
except Exception as e:
    print("[STUDY] Module unavailable:", e)
    _study_sync = None
from storage_paths import (
    runtime_flashcards_path,
    runtime_quiz_path,
    runtime_welcome_path,
    sd_available,
)
def file_exists(path):
    if _study_sync and hasattr(_study_sync, "file_exists"):
        return _study_sync.file_exists(path)
    try:
        os.stat(path)
        return True
    except OSError:
        return False
def load_analysis():
    if _study_sync and hasattr(_study_sync, "load_analysis"):
        return _study_sync.load_analysis()
    return None
def load_map():
    if _study_sync and hasattr(_study_sync, "load_map"):
        return _study_sync.load_map()
    return None
def ensure_study_files():
    if _study_sync and hasattr(_study_sync, "ensure_study_files"):
        return _study_sync.ensure_study_files()
    return False
face = FaceEngine()
menu = MenuSystem()
status = StatusBar(position="top")
boot_anim = BootAnimation()
audio = AudioEngine()
tof = ToFKissController(i2c)
voice = VoiceAssistant(oled, audio, face, touch_pin)
flashcards = None
quiz = None
neural = None
games = None
wifi = None
analysis_data = None
def _release_feature_memory(reason=""):
    """Drop optional app state before voice/TLS work needs a large heap."""
    global flashcards, quiz, neural, games, wifi, analysis_data
    before = gc.mem_free()
    flashcards = None
    quiz = None
    neural = None
    games = None
    wifi = None
    analysis_data = None
    try:
        modules = sys.modules
        for name in ("flashcards", "quiz", "neural", "games", "wifi"):
            try:
                del modules[name]
            except Exception:
                pass
    except Exception:
        pass
    gc.collect()
    after = gc.mem_free()
    if after > before + 1024:
        label = " for " + reason if reason else ""
        print("[OS] Freed RAM{}: {} -> {} bytes".format(label, before, after))
def _cleanup_sd_runtime_files():
    runtime_files = (
        "voice_in.wav",
        "voice_reply.wav",
        "voice_reply.wav.tmp",
        "welcome.wav.tmp",
        "voice_confirm.wav",
        "voice_yesno.wav",
    )
    for name in runtime_files:
        try:
            os.remove(name)
            print("[FS] Removed", name)
        except Exception:
            pass
    if sd_available():
        for name in runtime_files:
            path = "/sd/" + name
            try:
                os.remove(path)
                print("[SD] Removed", name)
            except OSError:
                pass
            except Exception as e:
                print("[SD] Skip {}: {}".format(name, e))
print("[OS] Core systems loaded")
print("[OS] Free RAM: {} bytes".format(gc.mem_free()))
def _existing_file(*paths):
    """Return the first readable file path from the given candidates."""
    for path in paths:
        try:
            os.stat(path)
            return path
        except OSError:
            pass
    return paths[0] if paths else None
def _play_wav_without_mic(path):
    """Play speaker audio while the mic RX engine is paused."""
    try:
        voice.suspend_input()
    except Exception:
        pass
    try:
        return audio.play_wav(path)
    finally:
        try:
            audio.shutdown()
            gc.collect()
            print("[AUDIO] Released I2S after playback; RAM:", gc.mem_free())
        except Exception:
            pass
        try:
            voice.resume_input()
        except Exception:
            pass
def _welcome_wav_supported(meta):
    """Return True only for WAVs the speaker path can actually play."""
    return bool(
        meta
        and meta.get("format") == 1
        and meta.get("rate") == 22050
        and meta.get("channels") == 1
        and meta.get("bits") == 16
        and meta.get("data_size", 0) > 4096
        and not meta.get("stream_size")
    )
def _welcome_path_candidates():
    """Try local first, then SD/runtime welcome if the SD card has one."""
    runtime_path = runtime_welcome_path()
    paths = ("welcome.wav", runtime_path)
    result = []
    for path in paths:
        if path not in result:
            result.append(path)
    return result
def _play_startup_welcome_voice():
    """Play cached welcome.wav, refreshing it first when the cache is unusable."""
    from config import PLAY_WELCOME_VOICE, REFRESH_WELCOME_WAV
    from tts_client import fetch_and_save_welcome
    if not PLAY_WELCOME_VOICE:
        print("[OS] Welcome voice disabled")
        return False
    welcome_path = None
    meta = None
    for candidate in _welcome_path_candidates():
        candidate_meta = audio.inspect_wav(candidate)
        if _welcome_wav_supported(candidate_meta):
            welcome_path = candidate
            meta = candidate_meta
            break
        if candidate_meta:
            print(
                "[OS] Skipping unsupported welcome WAV {}: fmt={}, {}Hz, {}bit, {}ch, data={}".format(
                    candidate,
                    candidate_meta.get("format", "?"),
                    candidate_meta.get("rate", "?"),
                    candidate_meta.get("bits", "?"),
                    candidate_meta.get("channels", "?"),
                    candidate_meta.get("data_size", "?"),
                )
            )
    if not meta and REFRESH_WELCOME_WAV:
        print("[OS] Cached welcome missing/invalid; fetching voice...")
        welcome_path = runtime_welcome_path()
        if fetch_and_save_welcome(welcome_path, lang="en"):
            meta = audio.inspect_wav(welcome_path)
    if not _welcome_wav_supported(meta):
        return False
    print("[OS] Playing welcome voice")
    if _play_wav_without_mic(welcome_path):
        return True
    if REFRESH_WELCOME_WAV:
        print("[OS] Welcome playback failed; fetching a fresh copy...")
        if fetch_and_save_welcome("welcome.wav", lang="en"):
            return _play_wav_without_mic("welcome.wav")
    return False
