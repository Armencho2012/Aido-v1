import math
import time
from config import EXPR_HAPPY, EXPR_LOVE, EXPR_SURPRISE
from graphics import draw_circle, draw_heart
from vl53l0x import VL53L0X
TOF_ADDR = 0x29
FAR_MM = 420
LOVE_MM = 240
KISS_MM = 115
SMOOCH_MM = 70
def _clamp(val, lo, hi):
    return max(lo, min(hi, val))
class ToFKissController:
    def __init__(self, i2c):
        self.available = False
        self.sensor = None
        self.distance_mm = 600
        self._heart_until = 0
        self._mood = "idle"
        try:
            if TOF_ADDR in i2c.scan():
                self.sensor = VL53L0X(i2c, TOF_ADDR)
                self.sensor.start_continuous(40)
                self.available = True
                print("[TOF] VL53L0X online at 0x29")
            else:
                print("[TOF] VL53L0X not detected")
        except Exception as e:
            print("[TOF] Disabled:", e)
            self.sensor = None
            self.available = False
    def update(self):
        if not self.available:
            return
        try:
            raw = self.sensor.read_range_mm()
            if 20 <= raw <= 2000:
                self.distance_mm = int(self.distance_mm * 0.72 + raw * 0.28)
        except Exception:
            return
        if self.distance_mm <= SMOOCH_MM:
            self._mood = "smooch"
            self._heart_until = time.ticks_add(time.ticks_ms(), 900)
        elif self.distance_mm <= KISS_MM:
            self._mood = "kiss"
        elif self.distance_mm <= LOVE_MM:
            self._mood = "love"
        elif self.distance_mm <= FAR_MM:
            self._mood = "curious"
        else:
            if time.ticks_diff(self._heart_until, time.ticks_ms()) > 0:
                self._mood = "glow"
            else:
                self._mood = "idle"
    def apply(self, face):
        if not self.available:
            return False
        if self._mood == "smooch":
            face.set_expression(EXPR_LOVE, 1.0)
            face.set_pupil_target(0.0, 0.0)
            return True
        if self._mood == "kiss":
            face.set_expression(EXPR_HAPPY, 1.0)
            face.set_pupil_target(0.0, 0.15)
            return True
        if self._mood == "love":
            face.set_expression(EXPR_LOVE, 1.0)
            face.set_pupil_target(0.0, 0.0)
            return True
        if self._mood == "curious":
            face.set_expression(EXPR_SURPRISE, 0.65)
            face.set_pupil_target(0.0, -0.1)
            return True
        return False
    def render_overlay(self, fb, frame):
        if not self.available:
            return
        if self._mood in ("kiss", "smooch"):
            close_power = _clamp(
                (LOVE_MM - self.distance_mm) / float(max(1, LOVE_MM - SMOOCH_MM)),
                0.0,
                1.0,
            )
            self._draw_blush(fb, 1 + int(close_power * 2))
            self._draw_kiss_mouth(fb, frame, close_power)
        if self._mood == "love":
            self._draw_soft_hearts(fb, frame)
        elif self._mood == "smooch" or time.ticks_diff(self._heart_until, time.ticks_ms()) > 0:
            self._draw_heart_burst(fb, frame)
    def _draw_blush(self, fb, pulse):
        base = 2 + pulse
        for x in (26, 102):
            fb.fill_rect(x, 42, 8, 2, 1)
            fb.fill_rect(x + 1, 45, 6, 1, 1)
            draw_circle(fb, x + 4, 43, base, 0)
    def _draw_kiss_mouth(self, fb, frame, close_power):
        cx = 64
        cy = 48
        lip = 5 + int(close_power * 3)
        pulse = int((math.sin(frame * 0.25) + 1) * 1.5)
        draw_circle(fb, cx - 4, cy, lip + pulse, 1)
        draw_circle(fb, cx + 4, cy, lip + pulse, 1)
        draw_circle(fb, cx - 2, cy, lip - 2 + pulse, 0)
        draw_circle(fb, cx + 2, cy, lip - 2 + pulse, 0)
        fb.fill_rect(cx - 1, cy - 2, 2, 5, 1)
    def _draw_heart_burst(self, fb, frame):
        for i in range(5):
            angle = frame * 0.12 + i * 1.25
            x = int(64 + math.cos(angle) * (16 + i * 4))
            y = int(34 + math.sin(angle) * (10 + i * 3))
            draw_heart(fb, x, y, 2 + (i % 2), 1)
    def _draw_soft_hearts(self, fb, frame):
        for i in range(3):
            angle = frame * 0.08 + i * 2.1
            x = int(64 + math.cos(angle) * 34)
            y = int(26 + math.sin(angle * 1.3) * 10)
            draw_heart(fb, x, y, 2, 1)
