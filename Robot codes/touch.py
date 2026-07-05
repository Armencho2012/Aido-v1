import time
try:
    import config as _config
except ImportError:
    _config = None
def _cfg(name, default):
    if _config is None:
        return default
    return getattr(_config, name, default)
DEBOUNCE_MS = _cfg("DEBOUNCE_MS", 18)
DOUBLE_TAP_MS = _cfg("DOUBLE_TAP_MS", 340)
TRIPLE_TAP_MS = _cfg("TRIPLE_TAP_MS", 260)
TOUCH_MODE = _cfg("TOUCH_MODE", "auto")
TOUCH_IDLE_LEARN_MS = _cfg("TOUCH_IDLE_LEARN_MS", 700)
TOUCH_TOGGLE_LEARN_MS = _cfg("TOUCH_TOGGLE_LEARN_MS", 220)
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
_MODE_AUTO = "auto"
_MODE_MOMENTARY = "momentary"
_MODE_TOGGLE = "toggle"
class TouchEngine:
    """
    Touch-only tap counter.
    The engine learns the untouched GPIO level on startup, so it works with
    active-high or active-low wiring. In auto mode, a level that stays changed
    is treated as a toggle/latched sensor; otherwise only press edges count.
    """
    def __init__(self, pin):
        self.pin = pin
        self._configured_mode = self._normalize_mode(TOUCH_MODE)
        self._mode = None if self._configured_mode == _MODE_AUTO else self._configured_mode
        self._idle = self._learn_idle()
        self._raw = int(self.pin.value())
        self._stable = self._raw
        self._last_raw_change = time.ticks_ms()
        self._active_since = time.ticks_ms() if self._stable != self._idle else 0
        self._clear_taps()
        if self._mode:
            print("[TOUCH] Mode {}".format(self._mode))
        else:
            print("[TOUCH] Auto idle={}".format(self._idle))
    def _normalize_mode(self, mode):
        mode = str(mode).lower()
        if mode in ("toggle", "latched", "latch", "edge"):
            return _MODE_TOGGLE
        if mode in ("momentary", "press", "button"):
            return _MODE_MOMENTARY
        return _MODE_AUTO
    def _learn_idle(self):
        zeroes = 0
        ones = 0
        start = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), start) < TOUCH_IDLE_LEARN_MS:
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
        if self._configured_mode != _MODE_AUTO:
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
            if time.ticks_diff(now, self._last_raw_change) >= DEBOUNCE_MS:
                self._stable = raw
                gesture = self._handle_edge(now)
                if gesture:
                    return gesture
        if (
            self._mode is None
            and self._stable != self._idle
            and self._active_since
            and time.ticks_diff(now, self._active_since) >= TOUCH_TOGGLE_LEARN_MS
        ):
            self._set_auto_mode(_MODE_TOGGLE)
        return self._finish_waiting_gesture(now)
    def _handle_edge(self, now):
        active = self._stable != self._idle
        if self._mode == _MODE_TOGGLE:
            return self._count_tap(now)
        if active:
            self._active_since = now
            return self._count_tap(now)
        self._active_since = 0
        if self._mode is None:
            self._set_auto_mode(_MODE_MOMENTARY)
        return GESTURE_NONE
    def _count_tap(self, now):
        if self._tap_deadline is not None and time.ticks_diff(now, self._tap_deadline) > 0:
            self._clear_taps()
        self._tap_count += 1
        if self._tap_count >= 3:
            self._clear_taps()
            return GESTURE_TRIPLE_TAP
        wait_ms = DOUBLE_TAP_MS if self._tap_count == 1 else TRIPLE_TAP_MS
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
        if self._mode == _MODE_TOGGLE:
            return bool(self._tap_count)
        return bool(self._tap_count or self._stable != self._idle)
    @property
    def blocks_voice_poll(self):
        return self.is_active
    @property
    def is_pressed(self):
        return self._stable != self._idle
