import time
from config import OLED_WIDTH
from graphics import draw_circle, draw_circle_outline, draw_rounded_rect_outline
ROCK = 0
PAPER = 1
SCISSORS = 2
CHOOSE = 0
SHAKE = 1
RESULT = 2
def _ticks_ms():
    if hasattr(time, "ticks_ms"):
        return time.ticks_ms()
    return int(time.time() * 1000)
def _ticks_diff(now, then):
    if hasattr(time, "ticks_diff"):
        return time.ticks_diff(now, then)
    return now - then
def _px(fb, x, y, c=1):
    if 0 <= x < OLED_WIDTH and 0 <= y < 64:
        fb.pixel(x, y, c)
def _spark(fb, x, y):
    fb.vline(x, y - 2, 5, 1)
    fb.hline(x - 2, y, 5, 1)
    _px(fb, x - 1, y - 1)
    _px(fb, x + 1, y + 1)
def _heart(fb, x, y):
    _px(fb, x - 1, y)
    _px(fb, x + 1, y)
    fb.hline(x - 2, y + 1, 5, 1)
    fb.hline(x - 1, y + 2, 3, 1)
    _px(fb, x, y + 3)
def _face(fb, x, y):
    fb.rect(x - 10, y - 7, 20, 15, 1)
    fb.fill_rect(x - 5, y - 1, 3, 3, 1)
    fb.fill_rect(x + 3, y - 1, 3, 3, 1)
    fb.line(x - 5, y + 4, x - 2, y + 6, 1)
    fb.hline(x - 2, y + 6, 5, 1)
    fb.line(x + 3, y + 6, x + 6, y + 4, 1)
def _icon(fb, ch, cx, cy, s=1):
    if ch == ROCK:
        draw_circle(fb, cx, cy, 4 * s + 4, 1)
        fb.fill_rect(cx - 7 * s, cy, 14 * s, 4 * s + 2, 1)
        if s > 1:
            fb.vline(cx - 4, cy - 7, 7, 0)
            fb.vline(cx, cy - 8, 8, 0)
            fb.vline(cx + 4, cy - 7, 7, 0)
            fb.hline(cx - 7, cy + 4, 14, 0)
        return
    if ch == PAPER:
        w = 12 * s
        h = 15 * s
        x = cx - w // 2
        y = cy - h // 2
        fb.fill_rect(x, y, w, h, 1)
        fb.line(x + w - 4 * s, y, x + w - 1, y + 4 * s, 0)
        fb.line(x + w - 4 * s, y, x + w - 4 * s, y + 4 * s, 0)
        if s > 1:
            fb.hline(x + 3 * s, y + 6 * s, 6 * s, 0)
            fb.hline(x + 3 * s, y + 9 * s, 6 * s, 0)
        else:
            fb.hline(x + 3, y + 6, 6, 0)
        return
    r = 3 * s
    draw_circle_outline(fb, cx - 6 * s, cy + 5 * s, r, 1)
    draw_circle_outline(fb, cx + s, cy + 7 * s, r, 1)
    fb.line(cx - 2 * s, cy + 3 * s, cx + 10 * s, cy - 9 * s, 1)
    fb.line(cx - 2 * s, cy + 4 * s, cx + 12 * s, cy + 7 * s, 1)
    fb.line(cx + 8 * s, cy - 10 * s, cx + 13 * s, cy - 12 * s, 1)
    fb.line(cx + 10 * s, cy + 7 * s, cx + 15 * s, cy + 8 * s, 1)
class RockPaperScissorsGame:
    def __init__(self, play_fx=None):
        self.fx = play_fx
        self.rng = _ticks_ms() & 0x7FFFFFFF
        self.sy = 0
        self.sa = 0
        self.pc = ROCK
        self.ac = -1
        self.res = 0
        self.st = CHOOSE
        self.t0 = _ticks_ms()
        self.pop = self.t0
        self.fr = 0
    def _fx(self, name):
        if self.fx:
            self.fx(name)
    def _rnd(self):
        self.rng ^= _ticks_ms() & 0xFFFF
        self.rng = (self.rng * 1103515245 + 12345) & 0x7FFFFFFF
        return (self.rng >> 8) % 3
    def start(self):
        self.sy = 0
        self.sa = 0
        self.pc = ROCK
        self.ac = -1
        self.res = 0
        self.st = CHOOSE
        self.t0 = _ticks_ms()
        self.pop = self.t0
        self._fx("rps_ready")
    def _round(self):
        self.st = CHOOSE
        self.ac = -1
        self.res = 0
        self.t0 = _ticks_ms()
        self.pop = self.t0
    def cycle(self):
        if self.st == SHAKE:
            return
        if self.st == RESULT:
            self._round()
        self.pc = (self.pc + 1) % 3
        self.pop = _ticks_ms()
        if self.pc == ROCK:
            self._fx("rps_rock")
        elif self.pc == PAPER:
            self._fx("rps_paper")
        else:
            self._fx("rps_scissors")
    def throw(self):
        if self.st == SHAKE:
            return
        if self.st == RESULT:
            self._round()
            return
        self.st = SHAKE
        self.ac = -1
        self.t0 = _ticks_ms()
        self._fx("rps_throw")
    def update(self):
        self.fr += 1
        now = _ticks_ms()
        if self.st == SHAKE and _ticks_diff(now, self.t0) >= 900:
            self.ac = self._rnd()
            self.res = 0 if self.pc == self.ac else (1 if (self.pc - self.ac) % 3 == 1 else -1)
            if self.res > 0:
                self.sy += 1
                self._fx("rps_win")
            elif self.res < 0:
                self.sa += 1
                self._fx("rps_lose")
            else:
                self._fx("rps_tie")
            self.st = RESULT
            self.t0 = now
        elif self.st == RESULT and _ticks_diff(now, self.t0) >= 3200:
            self._round()
    def render(self, fb):
        fb.fill(0)
        _heart(fb, 12, 4)
        fb.text(str(self.sy), 22, 3, 1)
        _face(fb, 106, 9)
        fb.text(str(self.sa), 86, 3, 1)
        fb.hline(0, 18, OLED_WIDTH, 1)
        if self.st == CHOOSE:
            b = (self.fr // 3) % 6
            if b > 3:
                b = 6 - b
            if _ticks_diff(_ticks_ms(), self.pop) < 220:
                b += 2
            _icon(fb, self.pc, 64, 36 - b, 2)
            _spark(fb, 39, 40 if (self.fr // 8) & 1 else 24)
            _spark(fb, 91, 24 if (self.fr // 8) & 1 else 39)
            for i, x in enumerate((25, 64, 103)):
                if i == self.pc:
                    draw_rounded_rect_outline(fb, x - 14, 50, 28, 13, 3, 1)
                _icon(fb, i, x, 57, 1)
            return
        if self.st == SHAKE:
            beat = min(3, _ticks_diff(_ticks_ms(), self.t0) // 300 + 1)
            wob = ((self.fr // 3) % 3) - 1
            for i in range(3):
                y = 25 + i * 5
                fb.line(19, y + wob, 27 - i * 2, y - 2, 1)
                fb.line(109, y - wob, 101 + i * 2, y - 2, 1)
            _icon(fb, ROCK, 39 + wob * 3, 36 - wob * 2, 2)
            _icon(fb, ROCK, 89 - wob * 3, 36 + wob * 2, 2)
            for i in range(3):
                x = 52 + i * 12
                if i < beat:
                    draw_circle(fb, x, 56, 3, 1)
                else:
                    draw_circle_outline(fb, x, 56, 3, 1)
            return
        _icon(fb, self.pc, 35, 35, 2)
        _icon(fb, self.ac, 93, 35, 2)
        fb.vline(64, 18, 38, 1)
        if self.res == 0:
            fb.fill_rect(55, 25, 18, 4, 1)
            fb.fill_rect(55, 38, 18, 4, 1)
            _spark(fb, 35, 21)
            _spark(fb, 93, 21)
            return
        x = 35 if self.res > 0 else 93
        _heart(fb, x, 19)
        party = 32 if self.res > 0 else 90
        drift = (self.fr // 2) % 5
        for dx, dy in ((-18, -6), (-8, -12), (5, -8), (15, -15), (20, -3)):
            _spark(fb, party + dx, 49 + dy + drift)
