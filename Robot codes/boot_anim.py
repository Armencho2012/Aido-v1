"""
╔══════════════════════════════════════════════════════╗
║         AIDO OS — Boot Animation Sequence             ║
║   Premium Startup • Logo • Loading Bar • Eye Open     ║
╚══════════════════════════════════════════════════════╝
"""
import math
import time
from config import OLED_WIDTH, OLED_HEIGHT, BOOT_ANIM_MS, LEFT_EYE_CY
from graphics import (
    draw_rounded_rect, draw_circle, draw_circle_outline,
    draw_progress_bar, draw_rounded_rect_outline,
    ease_in_out_cubic, ease_out_quad, clamp,
)
class BootAnimation:
    """
    Cinematic boot sequence:
    1. Black screen → Fade in AIDO text
    2. Loading bar with percentage
    3. Eye-open animation (eyelids sliding open)
    4. Transition to idle face
    """
    PHASE_DARK      = 0
    PHASE_LOGO      = 1
    PHASE_LOADING   = 2
    PHASE_EYE_OPEN  = 3
    PHASE_DONE      = 4
    def __init__(self):
        self.phase = self.PHASE_DARK
        self._start_time = 0
        self._phase_start = 0
        self._frame = 0
        self._loading_pct = 0.0
        self._durations = {
            self.PHASE_DARK:     400,
            self.PHASE_LOGO:     800,
            self.PHASE_LOADING:  1200,
            self.PHASE_EYE_OPEN: 600,
        }
        self._load_msgs = [
            "Init hardware...",
            "Loading face...",
            "MPU calibrate...",
            "WiFi scan...",
            "System ready!",
        ]
    def start(self):
        """Begin the boot animation."""
        self.phase = self.PHASE_DARK
        self._start_time = time.ticks_ms()
        self._phase_start = self._start_time
        self._frame = 0
        self._loading_pct = 0.0
    @property
    def is_done(self):
        return self.phase == self.PHASE_DONE
    def update(self, dt_ms=33):
        """Update boot animation state."""
        self._frame += 1
        now = time.ticks_ms()
        if self.phase == self.PHASE_DONE:
            return
        elapsed = time.ticks_diff(now, self._phase_start)
        duration = self._durations.get(self.phase, 1000)
        if elapsed >= duration:
            self.phase += 1
            self._phase_start = now
            if self.phase == self.PHASE_DONE:
                return
        if self.phase == self.PHASE_LOADING:
            self._loading_pct = clamp(elapsed / duration, 0.0, 1.0)
        elif self.phase > self.PHASE_LOADING:
            self._loading_pct = 1.0
    def render(self, fb):
        """Render the current boot animation frame."""
        fb.fill(0)
        if self.phase == self.PHASE_DARK:
            pass
        elif self.phase == self.PHASE_LOGO:
            self._render_logo(fb)
        elif self.phase == self.PHASE_LOADING:
            self._render_loading(fb)
        elif self.phase == self.PHASE_EYE_OPEN:
            self._render_eye_open(fb)
    def _render_logo(self, fb):
        """Render the AIDO logo with reveal animation."""
        elapsed = time.ticks_diff(time.ticks_ms(), self._phase_start)
        duration = self._durations[self.PHASE_LOGO]
        t = clamp(elapsed / duration, 0.0, 1.0)
        letters = "A I D O"
        total_w = len(letters) * 8
        start_x = (OLED_WIDTH - total_w) // 2
        visible_chars = int(t * len(letters)) + 1
        visible_text = letters[:visible_chars]
        bounce_y = int(math.sin(t * math.pi) * 4)
        fb.text(visible_text, start_x, 22 - bounce_y, 1)
        if t > 0.5:
            sub_t = (t - 0.5) * 2.0
            sub = "Robot OS v3.0"
            sub_w = len(sub) * 8
            sub_x = (OLED_WIDTH - sub_w) // 2
            if sub_t > 0.3:
                fb.text(sub, sub_x, 36, 1)
        line_w = int(OLED_WIDTH * ease_out_quad(t) * 0.6)
        cx = OLED_WIDTH // 2
        fb.hline(cx - line_w // 2, 18, line_w, 1)
        fb.hline(cx - line_w // 2, 45, line_w, 1)
    def _render_loading(self, fb):
        """Render the loading screen with progress bar."""
        fb.text("A I D O", 36, 8, 1)
        fb.hline(20, 18, 88, 1)
        bar_x = 14
        bar_y = 30
        bar_w = 100
        bar_h = 8
        draw_rounded_rect_outline(fb, bar_x, bar_y, bar_w, bar_h, 3, 1)
        fill_w = int((bar_w - 4) * self._loading_pct)
        if fill_w > 0:
            fb.fill_rect(bar_x + 2, bar_y + 2, fill_w, bar_h - 4, 1)
        pct_str = "{}%".format(int(self._loading_pct * 100))
        pct_w = len(pct_str) * 8
        fb.text(pct_str, (OLED_WIDTH - pct_w) // 2, bar_y + bar_h + 4, 1)
        msg_idx = int(self._loading_pct * (len(self._load_msgs) - 1))
        msg_idx = clamp(msg_idx, 0, len(self._load_msgs) - 1)
        msg = self._load_msgs[msg_idx]
        msg_w = len(msg) * 8
        fb.text(msg, (OLED_WIDTH - msg_w) // 2, 52, 1)
    def _render_eye_open(self, fb):
        """Render the eye-opening animation — transition to face."""
        elapsed = time.ticks_diff(time.ticks_ms(), self._phase_start)
        duration = self._durations[self.PHASE_EYE_OPEN]
        t = ease_in_out_cubic(clamp(elapsed / duration, 0.0, 1.0))
        for cx in [38, 90]:
            ew = 24
            eh = 20
            ex = cx - ew // 2
            ey = LEFT_EYE_CY - eh // 2
            draw_rounded_rect(fb, ex, ey, ew, eh, 6, 1)
            lid_h = int(eh * (1.0 - t) * 0.5)
            if lid_h > 0:
                fb.fill_rect(ex - 1, ey - 1, ew + 2, lid_h + 1, 0)
            if lid_h > 0:
                fb.fill_rect(ex - 1, ey + eh - lid_h, ew + 2, lid_h + 1, 0)
            if t > 0.3:
                pupil_r = int(5 * min(1.0, (t - 0.3) / 0.7))
                if pupil_r > 0:
                    draw_circle(fb, cx, LEFT_EYE_CY, pupil_r, 0)
                    if pupil_r >= 3:
                        fb.pixel(cx - 2, LEFT_EYE_CY - 2, 1)
