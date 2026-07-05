"""
╔══════════════════════════════════════════════════════╗
║        AIDO OS — Expressive Face Engine v3.0          ║
║   10 Emotions • Smooth Blinking • MPU Eye Tracking    ║
║    Animated Eyebrows • Talking Sine Wave • Hearts     ║
╚══════════════════════════════════════════════════════╝
"""
import math
import time
from config import (
    LEFT_EYE_CX, LEFT_EYE_CY, RIGHT_EYE_CX, RIGHT_EYE_CY,
    EYE_WIDTH, EYE_HEIGHT, EYE_RADIUS, PUPIL_RADIUS, PUPIL_MAX_MOVE,
    IRIS_RADIUS, BROW_WIDTH, BROW_HEIGHT, BROW_Y_OFFSET,
    MOUTH_Y, MOUTH_WIDTH, MOUTH_CX, EYE_SMOOTH_FACTOR,
    BLINK_INTERVAL_MS, BLINK_DURATION_MS, BLINK_RANDOM_MS,
    OLED_WIDTH, OLED_HEIGHT,
    EXPR_NEUTRAL, EXPR_HAPPY, EXPR_SAD, EXPR_ANGRY,
    EXPR_SURPRISE, EXPR_SLEEPY, EXPR_LOVE, EXPR_THINK,
    EXPR_BLINK, EXPR_WINK, EXPR_TALK,
)
from graphics import (
    draw_rounded_rect, draw_circle, draw_circle_outline,
    draw_ellipse, draw_heart, draw_sine_wave,
    draw_thick_hline, lerp, clamp, ease_in_out_cubic,
    draw_rounded_rect_outline
)
class FaceEngine:
    """
    The heart of Aido — a living, breathing, reactive face.
    Features:
    - 10 distinct expressions with smooth transitions
    - Automatic blink cycle with random timing
    - MPU-6050 reactive pupil tracking
    - Animated talking sine-wave mouth
    - Emotion-driven eyebrow system
    - Idle micro-animations (breathing, subtle movement)
    """
    def __init__(self):
        self._rng_state = time.ticks_ms() & 0xFFFF
        self._pupil_x = 0.0
        self._pupil_y = 0.0
        self._target_px = 0.0
        self._target_py = 0.0
        self._blink_timer = time.ticks_ms()
        self._next_blink = BLINK_INTERVAL_MS + self._pseudo_random(BLINK_RANDOM_MS)
        self._blink_phase = 0.0
        self._is_blinking = False
        self._blink_start = 0
        self._expression = EXPR_NEUTRAL
        self._expr_intensity = 1.0
        self._expr_transition = 0.0
        self._prev_expression = EXPR_NEUTRAL
        self._talk_phase = 0.0
        self._talk_active = False
        self._talk_amplitude = 3.0
        self._breath_phase = 0.0
        self._frame = 0
    def _pseudo_random(self, max_val):
        """Simple LCG pseudo-random for blink timing variance."""
        self._rng_state = (self._rng_state * 1103515245 + 12345) & 0x7FFFFFFF
        return self._rng_state % max_val
    def set_expression(self, expr, intensity=1.0):
        """Change facial expression with smooth transition."""
        if expr != self._expression:
            self._prev_expression = self._expression
            self._expression = expr
            self._expr_transition = 0.0
        self._expr_intensity = intensity
    def set_talk(self, active):
        """Enable/disable talking animation."""
        self._talk_active = active
    def set_pupil_target(self, tx, ty):
        """Set target pupil position from MPU tilt data."""
        self._target_px = clamp(tx, -1.0, 1.0)
        self._target_py = clamp(ty, -1.0, 1.0)
    def update(self, dt_ms=33):
        """Update all animation states. Call once per frame."""
        now = time.ticks_ms()
        self._frame += 1
        self._pupil_x = lerp(self._pupil_x, self._target_px, EYE_SMOOTH_FACTOR)
        self._pupil_y = lerp(self._pupil_y, self._target_py, EYE_SMOOTH_FACTOR)
        if self._is_blinking:
            elapsed = time.ticks_diff(now, self._blink_start)
            if elapsed < BLINK_DURATION_MS:
                t = elapsed / BLINK_DURATION_MS
                if t < 0.5:
                    self._blink_phase = ease_in_out_cubic(t * 2.0)
                else:
                    self._blink_phase = 1.0 - ease_in_out_cubic((t - 0.5) * 2.0)
            else:
                self._is_blinking = False
                self._blink_phase = 0.0
                self._blink_timer = now
                self._next_blink = BLINK_INTERVAL_MS + self._pseudo_random(BLINK_RANDOM_MS)
        else:
            if time.ticks_diff(now, self._blink_timer) >= self._next_blink:
                self._is_blinking = True
                self._blink_start = now
        if self._expr_transition < 1.0:
            self._expr_transition = min(1.0, self._expr_transition + 0.08)
        if self._talk_active:
            self._talk_phase += 0.25
        self._breath_phase += 0.03
    def render(self, fb):
        """Render the complete face to the framebuffer."""
        fb.fill(0)
        expr = self._expression
        intensity = self._expr_intensity
        params = self._get_expr_params(expr, intensity)
        blink_squeeze = self._blink_phase
        breath_offset = math.sin(self._breath_phase) * 0.5
        self._draw_eye(
            fb,
            LEFT_EYE_CX, LEFT_EYE_CY + breath_offset,
            params, blink_squeeze,
            self._pupil_x, self._pupil_y,
            is_left=True
        )
        wink_squeeze = 0.0
        if expr == EXPR_WINK:
            wink_squeeze = intensity * 0.95
        self._draw_eye(
            fb,
            RIGHT_EYE_CX, RIGHT_EYE_CY + breath_offset,
            params, blink_squeeze + wink_squeeze,
            self._pupil_x, self._pupil_y,
            is_left=False
        )
        if params.get("brows", True):
            self._draw_eyebrows(fb, params, breath_offset)
        self._draw_mouth(fb, params)
        if expr == EXPR_LOVE:
            self._draw_love_particles(fb)
        if expr == EXPR_THINK:
            self._draw_think_bubbles(fb)
    def _get_expr_params(self, expr, intensity):
        """Return rendering parameters for the given expression."""
        base = {
            "eye_w": EYE_WIDTH,
            "eye_h": EYE_HEIGHT,
            "eye_r": EYE_RADIUS,
            "pupil_r": PUPIL_RADIUS,
            "brow_angle_l": 0,
            "brow_angle_r": 0,
            "brow_y": BROW_Y_OFFSET,
            "brows": True,
            "mouth": "none",
            "mouth_size": 1.0,
            "eye_squint": 0.0,
        }
        if expr == EXPR_NEUTRAL:
            base["mouth"] = "line"
            base["mouth_size"] = 0.3
        elif expr == EXPR_HAPPY:
            base["eye_squint"] = 0.1
            base["mouth"] = "smile"
            base["mouth_size"] = intensity
            base["mask_bottom"] = True
        elif expr == EXPR_SAD:
            base["brow_angle_l"] = 25 * intensity
            base["brow_angle_r"] = 25 * intensity
            base["brow_y"] = BROW_Y_OFFSET - 4
            base["mouth"] = "frown"
            base["mouth_size"] = intensity
            base["mask_top_angle"] = True
        elif expr == EXPR_ANGRY:
            base["brow_angle_l"] = -30 * intensity
            base["brow_angle_r"] = -30 * intensity
            base["brow_y"] = BROW_Y_OFFSET + int(5 * intensity)
            base["mouth"] = "line"
            base["mouth_size"] = 0.6
            base["mask_top_angle"] = True
        elif expr == EXPR_SURPRISE:
            base["eye_w"] = int(EYE_WIDTH * (1.0 + 0.3 * intensity))
            base["eye_h"] = int(EYE_HEIGHT * (1.0 + 0.35 * intensity))
            base["pupil_r"] = max(2, int(PUPIL_RADIUS * (1.0 - 0.3 * intensity)))
            base["brow_y"] = BROW_Y_OFFSET - int(5 * intensity)
            base["mouth"] = "open"
            base["mouth_size"] = intensity
        elif expr == EXPR_SLEEPY:
            base["eye_squint"] = 0.6 * intensity
            base["brow_angle_l"] = 8 * intensity
            base["brow_angle_r"] = 8 * intensity
            base["mouth"] = "none"
            base["eye_h"] = int(EYE_HEIGHT * (1.0 - 0.4 * intensity))
        elif expr == EXPR_LOVE:
            base["eye_w"] = int(EYE_WIDTH * 0.8)
            base["eye_h"] = int(EYE_HEIGHT * 0.8)
            base["mouth"] = "smile"
            base["mouth_size"] = 0.7
            base["brows"] = False
        elif expr == EXPR_THINK:
            base["pupil_r"] = max(2, PUPIL_RADIUS - 1)
            base["brow_angle_l"] = 12
            base["brow_angle_r"] = -5
            base["mouth"] = "line"
            base["mouth_size"] = 0.2
            self._target_px = 0.6
            self._target_py = -0.4
        elif expr == EXPR_TALK:
            base["mouth"] = "wave"
            base["mouth_size"] = 1.0
        return base
    def _draw_eye(self, fb, cx, cy, params, blink, px, py, is_left):
        """Draw a single eye with all effects."""
        ew = params["eye_w"]
        eh = params["eye_h"]
        er = params["eye_r"]
        pr = params["pupil_r"]
        squint = params.get("eye_squint", 0.0)
        blink_factor = 1.0 - blink
        render_h = max(2, int(eh * blink_factor * (1.0 - squint * 0.5)))
        y_offset = int((eh - render_h) * 0.5)
        ey = int(cy) - render_h // 2
        expr = self._expression
        if expr == EXPR_LOVE and blink < 0.3:
            heart_size = min(ew, eh) // 2
            beat = 1.0 + math.sin(self._frame * 0.15) * 0.15
            draw_heart(fb, int(cx), int(cy), int(heart_size * beat), 1)
            return
        draw_rounded_rect(
            fb,
            int(cx) - ew // 2,
            ey,
            ew, render_h,
            min(er, render_h // 2),
            1
        )
        if render_h > 8:
            if params.get("mask_bottom", False):
                mask_r = min(ew, render_h)
                draw_circle(fb, int(cx), ey + render_h + 2, mask_r, 0)
            elif params.get("mask_top_angle", False):
                angle = params["brow_angle_l"] if is_left else -params["brow_angle_r"]
                self._draw_angled_brow(fb, cx, ey, ew + 8, render_h // 2, angle, color=0)
        if render_h < 6:
            return
        max_dx = (ew // 2) - pr - 2
        max_dy = (render_h // 2) - pr - 2
        pupil_cx = int(cx + px * min(max_dx, PUPIL_MAX_MOVE))
        pupil_cy = ey + render_h // 2 + int(py * min(max_dy, PUPIL_MAX_MOVE))
        draw_circle(fb, pupil_cx, pupil_cy, pr, 0)
        if pr >= 3:
            hx = pupil_cx - pr // 3
            hy = pupil_cy - pr // 3
            fb.pixel(hx, hy, 1)
            if pr >= 4:
                fb.pixel(hx + 1, hy, 1)
                fb.pixel(hx, hy + 1, 1)
    def _draw_eyebrows(self, fb, params, breath_offset):
        """Draw expressive eyebrows above the eyes."""
        brow_w = BROW_WIDTH
        brow_h = BROW_HEIGHT
        brow_y_off = params["brow_y"]
        angle_l = params["brow_angle_l"]
        angle_r = params["brow_angle_r"]
        self._draw_angled_brow(
            fb,
            LEFT_EYE_CX, LEFT_EYE_CY + brow_y_off + breath_offset,
            brow_w, brow_h, angle_l
        )
        self._draw_angled_brow(
            fb,
            RIGHT_EYE_CX, RIGHT_EYE_CY + brow_y_off + breath_offset,
            brow_w, brow_h, -angle_r
        )
    def _draw_angled_brow(self, fb, cx, cy, w, h, angle_deg, color=1):
        """Draw a thick line at an angle. Can be used for drawing brows or erasing masks."""
        angle_rad = math.radians(angle_deg)
        half_w = w // 2
        x1 = int(cx - half_w * math.cos(angle_rad))
        y1 = int(cy - half_w * math.sin(angle_rad))
        x2 = int(cx + half_w * math.cos(angle_rad))
        y2 = int(cy + half_w * math.sin(angle_rad))
        for dy in range(h):
            self._draw_line(fb, x1, y1 + dy, x2, y2 + dy, color)
    def _draw_line(self, fb, x0, y0, x1, y1, c):
        """Bresenham's line algorithm."""
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            if 0 <= x0 < OLED_WIDTH and 0 <= y0 < OLED_HEIGHT:
                fb.pixel(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy
    def _draw_mouth(self, fb, params):
        """Draw the mouth based on expression type."""
        mtype = params["mouth"]
        size = params["mouth_size"]
        if mtype == "none":
            return
        cx = MOUTH_CX
        my = MOUTH_Y
        mw = int(MOUTH_WIDTH * size)
        half_w = mw // 2
        if mtype == "smile":
            for x in range(-half_w, half_w + 1):
                t = x / max(1, half_w)
                curve_y = int(t * t * 4 * size)
                px = cx + x
                py = my + curve_y
                if 0 <= px < OLED_WIDTH and 0 <= py < OLED_HEIGHT:
                    fb.pixel(px, py, 1)
                    if size > 0.5:
                        fb.pixel(px, py + 1, 1)
        elif mtype == "frown":
            for x in range(-half_w, half_w + 1):
                t = x / max(1, half_w)
                curve_y = -int(t * t * 4 * size)
                px = cx + x
                py = my + curve_y + 4
                if 0 <= px < OLED_WIDTH and 0 <= py < OLED_HEIGHT:
                    fb.pixel(px, py, 1)
                    fb.pixel(px, py + 1, 1)
        elif mtype == "open":
            r = int(4 * size)
            draw_circle_outline(fb, cx, my + 2, max(2, r), 1)
        elif mtype == "wave":
            amp = self._talk_amplitude * (0.5 + 0.5 * math.sin(self._frame * 0.3))
            draw_sine_wave(fb, cx - half_w, my, mw, amp, self._talk_phase, 1)
            draw_sine_wave(fb, cx - half_w, my + 1, mw, amp * 0.8, self._talk_phase + 0.5, 1)
        elif mtype == "line":
            line_w = int(12 * size)
            draw_thick_hline(fb, cx - line_w // 2, my + 2, line_w, 1, 1)
    def _draw_love_particles(self, fb):
        """Draw floating heart particles around the face."""
        for i in range(3):
            t = (self._frame * 0.05 + i * 2.1) % 6.28
            hx = int(64 + math.cos(t) * 40 + math.sin(t * 1.7) * 10)
            hy = int(32 + math.sin(t * 0.8) * 20 - 10)
            if 3 <= hx <= 124 and 3 <= hy <= 60:
                size = 2 + int(math.sin(t * 2) * 1.5)
                draw_heart(fb, hx, hy, max(2, size), 1)
    def _draw_think_bubbles(self, fb):
        """Draw thought bubbles trailing from the head."""
        base_x = RIGHT_EYE_CX + 18
        base_y = RIGHT_EYE_CY - 18
        sizes = [2, 3, 5]
        for i, s in enumerate(sizes):
            bx = base_x + i * 6
            by = base_y - i * 6
            if 0 <= bx < OLED_WIDTH - s and 0 <= by < OLED_HEIGHT - s:
                draw_circle_outline(fb, bx, by, s, 1)
