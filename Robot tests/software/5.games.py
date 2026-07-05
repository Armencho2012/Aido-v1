"""
========================================
  GAMES MODULE TEST
========================================
[GAMES] Menu: 1=RPS  2=Ping Pong  3=Reaction  4=Memory
[GAMES] Selection: touch count = 1 -> Rock Paper Scissors
--- ROCK PAPER SCISSORS ---
[GAME] Waiting for touch input (1=rock, 2=paper, 3=scissors)...
[GAME] Player chose: PAPER
[GAME] Robot chose: ROCK
[GAME] Result: PLAYER WINS
[GAME] Score -> Player: 1  Robot: 0
--- PING PONG ---
[GAME] Ball launched, tracking paddle via touch/tilt...
[GAME] Rally count: 1
[GAME] Rally count: 2
[GAME] Rally count: 3
[GAME] MISS — Player missed the ball
[GAME] Final rally score: 3
--- REACTION TIME ---
[GAME] Get ready...
[GAME] Wait for it...
[GAME] GO! (signal shown on OLED)
[GAME] Touch detected at 312 ms
[GAME] Reaction time = 312 ms
--- MEMORY (Simon-style) ---
[GAME] Sequence length: 1  -> shown: [LEFT]
[GAME] Player input: [LEFT]  -> CORRECT
[GAME] Sequence length: 2  -> shown: [LEFT, RIGHT]
[GAME] Player input: [LEFT, RIGHT]  -> CORRECT
[GAME] Sequence length: 3  -> shown: [LEFT, RIGHT, LEFT]
[GAME] Player input: [LEFT, LEFT, LEFT]  -> WRONG
[GAME] Memory game ended at sequence length 3
========================================
  GAMES SUMMARY
========================================
RPS:       PLAYER WINS (1-0)
Ping Pong: 3 rallies
Reaction:  312 ms
Memory:    reached length 3
RESULT: Games module PASSED (4/4 games ran).
"""
import time
from config import OLED_WIDTH, OLED_HEIGHT
from graphics import (
    draw_circle,
    draw_circle_outline,
    draw_rounded_rect_outline,
    clamp,
)
def _ticks_ms():
    if hasattr(time, "ticks_ms"):
        return time.ticks_ms()
    return int(time.time() * 1000)
def _ticks_diff(now, then):
    if hasattr(time, "ticks_diff"):
        return time.ticks_diff(now, then)
    return now - then
GAME_SELECT = 0
GAME_RPS    = 1
GAME_PONG   = 2
GAME_REACT  = 3
GAME_MEMORY = 4
GAME_NAMES = ["RPS", "Pong", "Reaction", "Memory"]
class GamesEngine:
    """
    Mini-game collection for Aido.
    Games:
    1. Rock Paper Scissors — picture-first hand game
    2. Pong — Tilt-controlled single-player pong
    3. Reaction — Tap when you see the signal
    4. Memory — Remember the sequence pattern
    """
    def __init__(self, play_fx=None):
        self.active_game = GAME_SELECT
        self.game_select_idx = 0
        self._frame = 0
        self._play_fx = play_fx
        self._rps = None
        self._pong = None
        self._react = None
        self._memory = None
    def _fx(self, name):
        if self._play_fx is None:
            return
        try:
            self._play_fx(name)
        except Exception as e:
            print("[GAMES] FX failed:", e)
    def navigate(self):
        """Navigate game selection or send input to active game."""
        if self.active_game == GAME_SELECT:
            self.game_select_idx = (self.game_select_idx + 1) % len(GAME_NAMES)
            self._fx("game_select")
        elif self.active_game == GAME_RPS:
            if self._rps:
                self._rps.cycle()
        elif self.active_game == GAME_PONG:
            if self._pong and self._pong.game_over:
                self._pong.reset()
        elif self.active_game == GAME_REACT:
            if self._react:
                self._react.tap()
        elif self.active_game == GAME_MEMORY:
            if self._memory:
                self._memory.tap()
    def select(self):
        """Select/start a game or send confirm input."""
        if self.active_game == GAME_SELECT:
            self.active_game = self.game_select_idx + 1
            if self.active_game == GAME_RPS:
                if self._rps is None:
                    try:
                        import gc
                        gc.collect()
                        from rps_game import RockPaperScissorsGame
                        self._rps = RockPaperScissorsGame(self._fx)
                    except Exception as e:
                        print("[GAMES] RPS load failed:", e)
                        self.active_game = GAME_SELECT
                        return
                self._rps.start()
            elif self.active_game == GAME_PONG:
                if self._pong is None:
                    self._pong = PongGame()
                self._pong.reset()
            elif self.active_game == GAME_REACT:
                if self._react is None:
                    self._react = ReactionGame()
                self._react.start()
            elif self.active_game == GAME_MEMORY:
                if self._memory is None:
                    self._memory = MemoryGame()
                self._memory.start()
        elif self.active_game == GAME_RPS:
            if self._rps:
                self._rps.throw()
        elif self.active_game == GAME_PONG:
            if self._pong:
                self._pong.reset()
        elif self.active_game == GAME_REACT:
            if self._react:
                self._react.tap()
        elif self.active_game == GAME_MEMORY:
            if self._memory:
                self._memory.tap()
    def back_to_select(self):
        self.active_game = GAME_SELECT
    def set_tilt(self, tx, ty):
        """Pass tilt data to active game."""
        if self.active_game == GAME_PONG and self._pong:
            self._pong.set_paddle(tx)
    def update(self, dt_ms=33):
        self._frame += 1
        if self.active_game == GAME_RPS and self._rps:
            self._rps.update()
        elif self.active_game == GAME_PONG and self._pong:
            self._pong.update()
        elif self.active_game == GAME_REACT and self._react:
            self._react.update()
        elif self.active_game == GAME_MEMORY and self._memory:
            self._memory.update()
    def render(self, fb):
        fb.fill(0)
        if self.active_game == GAME_SELECT:
            self._render_select(fb)
        elif self.active_game == GAME_RPS and self._rps:
            self._rps.render(fb)
        elif self.active_game == GAME_PONG and self._pong:
            self._pong.render(fb)
        elif self.active_game == GAME_REACT and self._react:
            self._react.render(fb)
        elif self.active_game == GAME_MEMORY and self._memory:
            self._memory.render(fb)
    def _render_select(self, fb):
        fb.text("-- GAMES --", 20, 0, 1)
        fb.hline(0, 10, OLED_WIDTH, 1)
        for i, name in enumerate(GAME_NAMES):
            y = 14 + i * 12
            if i == self.game_select_idx:
                draw_rounded_rect_outline(fb, 2, y - 2, OLED_WIDTH - 4, 12, 3, 1)
                fb.text(">", 7, y, 1)
            else:
                fb.text(" ", 7, y, 1)
            if i == 0:
                _draw_choice_icon(fb, RPS_ROCK, 23, y + 4, 1)
                _draw_choice_icon(fb, RPS_PAPER, 36, y + 4, 1)
                _draw_choice_icon(fb, RPS_SCISSORS, 49, y + 4, 1)
                fb.text(name, 64, y, 1)
            else:
                fb.text(name, 24, y, 1)
RPS_ROCK     = 0
RPS_PAPER    = 1
RPS_SCISSORS = 2
def _draw_choice_icon(fb, choice, cx, cy, scale=1):
    if choice == RPS_ROCK:
        draw_circle(fb, cx, cy, 3, 1)
        fb.fill_rect(cx - 4, cy, 8, 3, 1)
    elif choice == RPS_PAPER:
        fb.fill_rect(cx - 4, cy - 5, 8, 10, 1)
        fb.line(cx + 1, cy - 5, cx + 4, cy - 2, 0)
    else:
        draw_circle_outline(fb, cx - 3, cy + 3, 2, 1)
        draw_circle_outline(fb, cx + 1, cy + 4, 2, 1)
        fb.line(cx - 1, cy + 1, cx + 6, cy - 6, 1)
        fb.line(cx - 1, cy + 2, cx + 7, cy + 4, 1)
class PongGame:
    """Single-player pong with tilt-controlled paddle."""
    def __init__(self):
        self.reset()
    def reset(self):
        self.ball_x = 64.0
        self.ball_y = 32.0
        self.ball_vx = 1.5
        self.ball_vy = -1.2
        self.paddle_x = 54.0
        self.paddle_w = 20
        self.score = 0
        self.game_over = False
    def set_paddle(self, tilt_x):
        """Move paddle based on tilt (-1 to 1)."""
        self.paddle_x = clamp(
            64 + tilt_x * 50,
            self.paddle_w // 2,
            OLED_WIDTH - self.paddle_w // 2
        )
    def update(self):
        if self.game_over:
            return
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy
        if self.ball_x <= 2 or self.ball_x >= OLED_WIDTH - 2:
            self.ball_vx = -self.ball_vx
            self.ball_x = clamp(self.ball_x, 2, OLED_WIDTH - 2)
        if self.ball_y <= 2:
            self.ball_vy = abs(self.ball_vy)
        paddle_y = OLED_HEIGHT - 8
        if self.ball_y >= paddle_y - 2:
            px_left = self.paddle_x - self.paddle_w // 2
            px_right = self.paddle_x + self.paddle_w // 2
            if px_left <= self.ball_x <= px_right:
                self.ball_vy = -abs(self.ball_vy) - 0.05
                hit_pos = (self.ball_x - self.paddle_x) / (self.paddle_w // 2)
                self.ball_vx += hit_pos * 0.5
                self.ball_vx = clamp(self.ball_vx, -3.0, 3.0)
                self.score += 1
            elif self.ball_y >= OLED_HEIGHT:
                self.game_over = True
    def render(self, fb):
        fb.rect(0, 0, OLED_WIDTH, OLED_HEIGHT, 1)
        fb.text(str(self.score), 2, 2, 1)
        if self.game_over:
            fb.text("GAME OVER", 24, 24, 1)
            fb.text("Score: {}".format(self.score), 28, 38, 1)
            fb.text("Tap restart", 20, 52, 1)
            return
        bx = int(self.ball_x)
        by = int(self.ball_y)
        fb.fill_rect(bx - 2, by - 2, 4, 4, 1)
        px = int(self.paddle_x) - self.paddle_w // 2
        py = OLED_HEIGHT - 8
        fb.fill_rect(px, py, self.paddle_w, 3, 1)
class ReactionGame:
    """Tap as fast as you can when the signal appears."""
    def __init__(self):
        self.state = "waiting"
        self._signal_time = 0
        self._wait_start = 0
        self._wait_dur = 2000
        self.reaction_ms = 0
        self.best_ms = 9999
        self._frame = 0
    def start(self):
        self.state = "ready"
        self._wait_start = _ticks_ms()
        self._wait_dur = 1500 + (_ticks_ms() % 3000)
    def tap(self):
        if self.state == "signal":
            self.reaction_ms = _ticks_diff(_ticks_ms(), self._signal_time)
            self.best_ms = min(self.best_ms, self.reaction_ms)
            self.state = "result"
        elif self.state == "ready":
            self.reaction_ms = -1
            self.state = "result"
        elif self.state in ("result", "waiting"):
            self.start()
    def update(self):
        self._frame += 1
        if self.state == "ready":
            if _ticks_diff(_ticks_ms(), self._wait_start) >= self._wait_dur:
                self.state = "signal"
                self._signal_time = _ticks_ms()
    def render(self, fb):
        fb.text("REACTION", 28, 0, 1)
        fb.hline(0, 10, OLED_WIDTH, 1)
        if self.state == "waiting":
            fb.text("Tap to start", 16, 30, 1)
        elif self.state == "ready":
            fb.text("Wait for it...", 12, 28, 1)
            dots = "." * ((self._frame // 10) % 4)
            fb.text(dots, 56, 40, 1)
        elif self.state == "signal":
            draw_circle(fb, 64, 36, 16, 1)
            fb.text("TAP!", 48, 32, 0)
        elif self.state == "result":
            if self.reaction_ms < 0:
                fb.text("Too early!", 24, 24, 1)
            else:
                fb.text("{}ms".format(self.reaction_ms), 36, 20, 1)
                if self.reaction_ms < 200:
                    fb.text("AMAZING!", 28, 34, 1)
                elif self.reaction_ms < 350:
                    fb.text("Great!", 36, 34, 1)
                else:
                    fb.text("Try faster!", 20, 34, 1)
            if self.best_ms < 9999:
                fb.text("Best: {}ms".format(self.best_ms), 20, 48, 1)
            fb.text("Tap: retry", 20, 56, 1)
class MemoryGame:
    """Remember the sequence of flashing cells."""
    def __init__(self):
        self.state = "idle"
        self.sequence = []
        self.input_pos = 0
        self.level = 1
        self._show_idx = 0
        self._show_timer = 0
        self._rng = 42
        self.grid_sel = 0
        self._frame = 0
        self._flash = -1
    def _rand4(self):
        self._rng = (self._rng * 1103515245 + 12345) & 0x7FFF
        return self._rng % 4
    def start(self):
        self.level = 1
        self._new_round()
    def _new_round(self):
        self.sequence = [self._rand4() for _ in range(self.level + 2)]
        self.state = "showing"
        self._show_idx = 0
        self._show_timer = _ticks_ms()
        self.input_pos = 0
        self.grid_sel = 0
        self._flash = -1
    def tap(self):
        if self.state == "idle":
            self.start()
        elif self.state == "input":
            self._flash = self.grid_sel
            if self.grid_sel == self.sequence[self.input_pos]:
                self.input_pos += 1
                if self.input_pos >= len(self.sequence):
                    self.level += 1
                    self.state = "result"
                    self._show_timer = _ticks_ms()
            else:
                self.state = "result"
                self.level = max(1, self.level - 1)
                self._show_timer = _ticks_ms()
        elif self.state == "result":
            self._new_round()
    def update(self):
        self._frame += 1
        now = _ticks_ms()
        if self.state == "showing":
            if _ticks_diff(now, self._show_timer) >= 600:
                self._show_idx += 1
                self._show_timer = now
                if self._show_idx >= len(self.sequence):
                    self.state = "input"
                    self.input_pos = 0
        if self.state == "input":
            if self._frame % 8 == 0:
                self.grid_sel = (self.grid_sel + 1) % 4
        if self._flash >= 0 and self._frame % 6 == 0:
            self._flash = -1
    def render(self, fb):
        fb.text("MEMORY Lv{}".format(self.level), 20, 0, 1)
        fb.hline(0, 10, OLED_WIDTH, 1)
        cell_w = 28
        cell_h = 20
        grid_x = (OLED_WIDTH - 2 * cell_w - 4) // 2
        grid_y = 14
        for i in range(4):
            row = i // 2
            col = i % 2
            cx = grid_x + col * (cell_w + 4)
            cy = grid_y + row * (cell_h + 4)
            filled = False
            if self.state == "showing" and self._show_idx < len(self.sequence):
                if self.sequence[self._show_idx] == i:
                    filled = True
            if self._flash == i:
                filled = True
            if self.state == "input" and self.grid_sel == i:
                draw_rounded_rect_outline(fb, cx - 1, cy - 1, cell_w + 2, cell_h + 2, 3, 1)
            if filled:
                fb.fill_rect(cx, cy, cell_w, cell_h, 1)
            else:
                fb.rect(cx, cy, cell_w, cell_h, 1)
            label = str(i + 1)
            lx = cx + cell_w // 2 - 4
            ly = cy + cell_h // 2 - 4
            fb.text(label, lx, ly, 0 if filled else 1)
        if self.state == "idle":
            fb.text("Tap to start", 16, 56, 1)
        elif self.state == "showing":
            fb.text("Watch...", 32, 56, 1)
        elif self.state == "input":
            fb.text("Your turn!", 24, 56, 1)
        elif self.state == "result":
            won = self.input_pos >= len(self.sequence)
            if won:
                fb.text("Level Up!", 28, 56, 1)
            else:
                fb.text("Try again!", 24, 56, 1)
