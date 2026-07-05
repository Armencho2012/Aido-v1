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
current_state = STATE_BOOT
prev_state = STATE_BOOT
state_stack = []
expression_timer = 0
expression_auto = True
frame_count = 0
last_frame_time = time.ticks_ms()
fps = 0
fps_counter = 0
fps_timer = last_frame_time
input_lock_until = 0
voice_poll_block_until = 0
def _lock_input(duration_ms=STATE_INPUT_LOCK_MS):
    global input_lock_until
    input_lock_until = time.ticks_add(time.ticks_ms(), duration_ms)
def _input_locked():
    return time.ticks_diff(input_lock_until, time.ticks_ms()) > 0
def _block_voice_poll(duration_ms=800):
    global voice_poll_block_until
    voice_poll_block_until = time.ticks_add(time.ticks_ms(), duration_ms)
def _voice_poll_blocked():
    return time.ticks_diff(voice_poll_block_until, time.ticks_ms()) > 0
def _reset_touch_for_state_change():
    touch.reset()
    _lock_input()
def change_state(new_state):
    """Transition to a new OS state with stack tracking."""
    global current_state, prev_state
    if new_state == current_state:
        return
    state_stack.append(current_state)
    if len(state_stack) > 10:
        state_stack.pop(0)
    prev_state = current_state
    current_state = new_state
    print("[OS] State: {} -> {}".format(prev_state, current_state))
    _reset_touch_for_state_change()
    _on_state_enter(new_state)
def go_back():
    """Navigate back one level in the state stack."""
    global current_state, prev_state
    if state_stack:
        prev_state = current_state
        current_state = state_stack.pop()
        print("[OS] Back to state {}".format(current_state))
        _reset_touch_for_state_change()
        _on_state_enter(current_state)
    else:
        if current_state != STATE_FACE:
            prev_state = current_state
            current_state = STATE_FACE
            print("[OS] Back to face (stack empty)")
            _reset_touch_for_state_change()
            _on_state_enter(current_state)
def _on_state_enter(state):
    """Called when entering a new state — initialize subsystems."""
    global flashcards, quiz, neural, games, wifi, analysis_data
    gc.collect()
    if state == STATE_MENU:
        menu.open()
        face.set_expression(EXPR_NEUTRAL)
    elif state == STATE_FACE:
        _release_feature_memory("face")
        face.set_expression(EXPR_NEUTRAL)
        face.set_talk(False)
        voice.flush_mic()
    elif state == STATE_FLASHCARD:
        if flashcards is None:
            from flashcards import FlashcardEngine
            flashcards = FlashcardEngine()
            flashcards.on_expression = _set_temp_expression
        flashcards_path = runtime_flashcards_path()
        if file_exists(flashcards_path):
            flashcards.load_deck(flashcards_path)
        flashcards.reset_session()
        face.set_expression(EXPR_THINK)
    elif state == STATE_QUIZ:
        if quiz is None:
            from quiz import QuizEngine
            quiz = QuizEngine()
            quiz.on_expression = _set_temp_expression
        quiz_path = runtime_quiz_path()
        if file_exists(quiz_path):
            quiz.load_questions(quiz_path)
        quiz.start()
    elif state == STATE_NEURAL:
        if neural is None:
            from neural import NeuralMapEngine
            neural = NeuralMapEngine()
        neural.load_map(load_map())
    elif state == STATE_GAMES:
        if games is None:
            from games import GamesEngine
            games = GamesEngine(audio.play_fx)
    elif state == STATE_TALK:
        face.set_expression(EXPR_TALK)
        face.set_talk(True)
    elif state == STATE_SETTINGS:
        if wifi is None:
            from wifi import WiFiManager
            wifi = WiFiManager()
    elif state == STATE_ANALYSE:
        analysis_data = load_analysis()
    print("[OS] Free RAM: {} bytes".format(gc.mem_free()))
def _set_temp_expression(expr, duration_ms=1500):
    """Set a temporary expression that auto-resets."""
    global expression_timer
    face.set_expression(expr)
    expression_timer = time.ticks_add(time.ticks_ms(), duration_ms)
def _transition_to_state(new_state):
    """Play the short car transition before changing screens."""
    play_car_transition(oled)
    change_state(new_state)
def handle_input(gesture):
    """Route touch gestures to the current state handler."""
    global current_state
    if gesture == 0:
        return
    print("[TOUCH] {}".format(GESTURE_NAMES.get(gesture, gesture)))
    if gesture == GESTURE_TAP:
        audio.play_fx("tap")
    elif gesture == GESTURE_DOUBLE_TAP:
        audio.play_fx("double_tap")
    elif gesture == GESTURE_TRIPLE_TAP:
        audio.play_fx("double_tap")
    if gesture == GESTURE_TRIPLE_TAP:
        go_back()
        return
    if current_state == STATE_FACE:
        _input_face(gesture)
    elif current_state == STATE_MENU:
        _input_menu(gesture)
    elif current_state == STATE_FLASHCARD:
        _input_flashcard(gesture)
    elif current_state == STATE_QUIZ:
        _input_quiz(gesture)
    elif current_state == STATE_NEURAL:
        _input_neural(gesture)
    elif current_state == STATE_GAMES:
        _input_games(gesture)
    elif current_state == STATE_SETTINGS:
        _input_settings(gesture)
    elif current_state == STATE_TALK:
        _input_talk(gesture)
    elif current_state == STATE_ANALYSE:
        _input_analyse(gesture)
def _input_face(gesture):
    if gesture == GESTURE_TAP:
        _transition_to_state(STATE_MENU)
    elif gesture == GESTURE_DOUBLE_TAP:
        _transition_to_state(STATE_MENU)
def _input_menu(gesture):
    if gesture == GESTURE_TAP:
        menu.navigate_down()
    elif gesture == GESTURE_DOUBLE_TAP:
        item = menu.select_current()
        if item:
            target_state = item.get("state", STATE_FACE)
            _transition_to_state(target_state)
def _input_flashcard(gesture):
    if flashcards is None:
        return
    if gesture == GESTURE_TAP:
        if flashcards.card_state == 0:
            flashcards.flip_card()
        else:
            flashcards.mark_correct()
            flashcards.save_progress(runtime_flashcards_path())
    elif gesture == GESTURE_DOUBLE_TAP:
        if flashcards.card_state == 0:
            flashcards.flip_card()
        elif flashcards.card_state == 1:
            flashcards.mark_wrong()
            flashcards.save_progress(runtime_flashcards_path())
def _input_quiz(gesture):
    if quiz is None:
        return
    if gesture == GESTURE_TAP:
        from quiz import QZ_SHOWING, QZ_COMPLETE
        if quiz.state == QZ_SHOWING:
            quiz.cycle_choice()
        elif quiz.state == QZ_COMPLETE:
            go_back()
    elif gesture == GESTURE_DOUBLE_TAP:
        from quiz import QZ_SHOWING
        if quiz.state == QZ_SHOWING:
            quiz.submit_answer()
def _input_neural(gesture):
    if neural is None:
        return
    if gesture == GESTURE_TAP:
        neural.select_next()
def _input_games(gesture):
    if games is None:
        return
    from games import GAME_SELECT
    if gesture == GESTURE_TAP:
        games.navigate()
    elif gesture == GESTURE_DOUBLE_TAP:
        games.select()
def _input_settings(gesture):
    if gesture == GESTURE_TAP:
        if wifi and not wifi.connected and not wifi.connecting:
            wifi.connect()
    elif gesture == GESTURE_DOUBLE_TAP:
        if wifi and not wifi.connected and not wifi.connecting:
            wifi.connect()
def _input_talk(gesture):
    if gesture == GESTURE_TAP:
        face.set_talk(not face._talk_active)
def _input_analyse(gesture):
    if gesture == GESTURE_TAP:
        _set_temp_expression(EXPR_THINK, 2000)
def render_frame():
    """Render the current state to the OLED."""
    if current_state == STATE_BOOT:
        boot_anim.render(oled)
    elif current_state == STATE_FACE:
        face.render(oled)
        status.render_minimal(oled)
        tof.render_overlay(oled, frame_count)
    elif current_state == STATE_MENU:
        menu.render(oled)
    elif current_state == STATE_FLASHCARD:
        if flashcards:
            flashcards.render(oled)
    elif current_state == STATE_QUIZ:
        if quiz:
            quiz.render(oled)
    elif current_state == STATE_NEURAL:
        if neural:
            neural.render(oled)
    elif current_state == STATE_GAMES:
        if games:
            games.render(oled)
    elif current_state == STATE_TALK:
        face.render(oled)
        oled.text("~TALK~", 40, 0, 1)
    elif current_state == STATE_SETTINGS:
        _render_settings()
    elif current_state == STATE_ANALYSE:
        _render_analyse()
    oled.show()
def _render_settings():
    """Render the settings/system info screen."""
    oled.fill(0)
    oled.text("= SETTINGS =", 12, 0, 1)
    oled.hline(0, 10, OLED_WIDTH, 1)
    oled.text("RAM: {}KB".format(gc.mem_free() // 1024), 4, 14, 1)
    oled.text("MPU: {}".format("OK" if mpu.available else "N/A"), 4, 24, 1)
    if wifi:
        if wifi.connected:
            oled.text("WiFi: Connected", 4, 34, 1)
            oled.text("IP:" + wifi.ip[:15], 4, 44, 1)
        elif wifi.connecting:
            oled.text("WiFi: Connecting", 4, 34, 1)
        else:
            oled.text("WiFi: Tap connect", 4, 34, 1)
    else:
        oled.text("WiFi: Not init", 4, 34, 1)
    oled.text("1x WiFi 3xBack", 0, 56, 1)
def _render_analyse():
    """Render the analyse/AI thinking screen."""
    oled.fill(0)
    oled.text("= ANALYSE =", 16, 0, 1)
    oled.hline(0, 10, OLED_WIDTH, 1)
    if analysis_data:
        title = (analysis_data.get("title") or "Study Pack")[:16]
        summary = (analysis_data.get("summary") or "")[:20]
        bullets = analysis_data.get("analysis") or []
        oled.text(title, 0, 14, 1)
        oled.text(summary[:16], 0, 26, 1)
        if len(summary) > 16:
            oled.text(summary[16:32], 0, 36, 1)
        if bullets:
            bullet = ("* " + str(bullets[(frame_count // 90) % len(bullets)]))[:20]
            oled.text(bullet[:16], 0, 48, 1)
            if len(bullet) > 16:
                oled.text(bullet[16:32], 0, 56, 1)
        else:
            oled.text("3x Tap = Back", 12, 56, 1)
        return
    dots = "." * ((frame_count // 15) % 4)
    oled.text("Processing" + dots, 8, 24, 1)
    import math
    for i in range(8):
        bar_h = int(6 + math.sin(frame_count * 0.1 + i * 0.8) * 5)
        bar_x = 16 + i * 12
        oled.fill_rect(bar_x, 44 - bar_h, 8, bar_h, 1)
    oled.text("3x Tap = Back", 12, 56, 1)
def main():
    """The main OS event loop — runs forever."""
    global current_state, frame_count, fps, fps_counter, fps_timer
    global last_frame_time, expression_timer
    boot_anim.start()
    print("\n[OS] Entering main loop...")
    print("[OS] Controls:")
    print("  Voice    = Talk on face")
    print("  1x Tap   = Scroll / Navigate")
    print("  2x Tap   = Confirm / Select")
    print("  3x Tap   = Go Back")
    print()
    _cleanup_sd_runtime_files()
    try:
        ensure_study_files()
    except Exception as e:
        print("[STUDY] Default files skipped:", e)
    while True:
        frame_start = time.ticks_ms()
        frame_count += 1
        gesture = touch.update()
        if _input_locked():
            touch.cancel_pending()
            gesture = 0
        mpu.update()
        tilt_x, tilt_y = mpu.get_tilt_xy()
        tof.update()
        if current_state == STATE_BOOT:
            boot_anim.update()
            if boot_anim.is_done:
                current_state = STATE_FACE
                _on_state_enter(STATE_FACE)
                face.update()
                render_frame()
                voice_played = False
                try:
                    voice_played = _play_startup_welcome_voice()
                except Exception as e:
                    print("[OS] Voice subsystem skipped:", e)
                if not voice_played:
                    print("[OS] Falling back to musical chime")
                    audio.play_fx("welcome")
                try:
                    from voice_client import warm_wifi
                    warm_wifi()
                except Exception:
                    pass
                print("[OS] Boot complete — entering face mode")
                voice.flush_mic()
        else:
            touch_active = touch.blocks_voice_poll
            if gesture or touch_active:
                _block_voice_poll(900)
            handle_input(gesture)
            if (not VOICE_PUSH_TO_TALK and not gesture and current_state == STATE_FACE
                    and not touch_active and not _voice_poll_blocked() and voice.poll()):
                _release_feature_memory("voice")
                voice.run_conversation()
        if current_state == STATE_FACE and tof.apply(face):
            pass
        else:
            face.set_pupil_target(
                tilt_x * MPU_EYE_GAIN,
                tilt_y * MPU_EYE_GAIN
            )
        face.update()
        status.update()
        if wifi:
            wifi.update()
            status.set_wifi_status(wifi.connected, wifi.rssi)
        if mpu.available:
            status.set_temperature(mpu.temp)
        if current_state == STATE_MENU:
            menu.update()
        elif current_state == STATE_FLASHCARD and flashcards:
            flashcards.update()
        elif current_state == STATE_QUIZ and quiz:
            quiz.update()
        elif current_state == STATE_NEURAL and neural:
            try:
                neural.update()
                neural.set_pan(tilt_x, tilt_y)
            except Exception as e:
                print("[NEURAL] Runtime error:", e)
                change_state(STATE_MENU)
        elif current_state == STATE_GAMES and games:
            games.update()
            games.set_tilt(tilt_x, tilt_y)
        if expression_timer > 0 and time.ticks_diff(time.ticks_ms(), expression_timer) >= 0:
            expression_timer = 0
            if current_state == STATE_FACE:
                face.set_expression(EXPR_NEUTRAL)
        render_frame()
        frame_elapsed = time.ticks_diff(time.ticks_ms(), frame_start)
        sleep_time = max(1, FRAME_DELAY_MS - frame_elapsed)
        time.sleep_ms(sleep_time)
        fps_counter += 1
        if time.ticks_diff(time.ticks_ms(), fps_timer) >= 5000:
            fps = fps_counter / 5.0
            fps_counter = 0
            fps_timer = time.ticks_ms()
            gc.collect()
        if gc.mem_free() < 8192:
            gc.collect()
        if frame_count % 30 == 0:
            led.toggle()
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        oled.fill(0)
        oled.text("Goodbye!", 32, 28, 1)
        oled.show()
        time.sleep(1)
        oled.poweroff()
        print("[OS] Safe shutdown complete")
    except Exception as e:
        import sys
        print("\n[OS] FATAL ERROR:")
        sys.print_exception(e)
        try:
            oled.fill(0)
            oled.text("! CRASH !", 28, 4, 1)
            oled.hline(0, 14, OLED_WIDTH, 1)
            err_str = str(e)
            for i in range(0, len(err_str), 16):
                line = err_str[i:i+16]
                oled.text(line, 0, 18 + (i // 16) * 10, 1)
            oled.text("Reset to retry", 8, 54, 1)
            oled.show()
        except Exception:
            pass
        while True:
            time.sleep(1)
