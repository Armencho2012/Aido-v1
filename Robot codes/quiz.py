"""
╔══════════════════════════════════════════════════════╗
║          AIDO OS — Interactive Quiz Engine             ║
║   Multiple Choice • Timer • Scoring • Animations      ║
╚══════════════════════════════════════════════════════╝
"""
import math
import time
try:
    import ujson as json
except ImportError:
    import json
from config import (
    OLED_WIDTH, OLED_HEIGHT, QUIZ_TIME_S,
    EXPR_HAPPY, EXPR_SAD, EXPR_SURPRISE, EXPR_THINK,
)
from graphics import (
    draw_rounded_rect, draw_rounded_rect_outline,
    draw_progress_bar, draw_circle, draw_circle_outline,
    clamp, ease_out_quad,
)
QZ_SHOWING    = 0
QZ_ANSWERED   = 1
QZ_COMPLETE   = 2
QZ_COUNTDOWN  = 3
CHAR_W = 8
LINE_H = 9
def _clip_text(text, max_chars):
    text = str(text or "").replace("\n", " ")
    if max_chars <= 0:
        return ""
    if len(text) <= max_chars:
        return text
    if max_chars <= 1:
        return text[:max_chars]
    return text[:max_chars - 1] + "."
def _wrap_text(text, max_chars, max_lines):
    lines = []
    for raw in str(text or "").replace("\r", "").split("\n"):
        words = raw.split(" ")
        current = ""
        for word in words:
            if not word:
                continue
            while len(word) > max_chars:
                if current:
                    lines.append(current)
                    current = ""
                    if len(lines) >= max_lines:
                        return lines
                lines.append(word[:max_chars])
                word = word[max_chars:]
                if len(lines) >= max_lines:
                    return lines
            candidate = word if not current else current + " " + word
            if len(candidate) <= max_chars:
                current = candidate
            else:
                lines.append(current)
                current = word
                if len(lines) >= max_lines:
                    return lines
        if current:
            lines.append(current)
            if len(lines) >= max_lines:
                return lines
    return lines or [""]
class Question:
    """A single quiz question with up to 4 choices."""
    def __init__(self, text, choices, correct_idx, explanation=""):
        self.text = text
        self.choices = choices
        self.correct_idx = correct_idx
        self.explanation = explanation
    def is_correct(self, idx):
        return idx == self.correct_idx
class QuizEngine:
    """
    Premium quiz system with:
    - Multiple choice questions (2-4 options)
    - Animated countdown timer
    - Score tracking with streaks
    - Correct/wrong feedback animations
    - Progress bar
    - Final score summary with grade
    """
    def __init__(self):
        self.questions = []
        self.current_q = 0
        self.selected_choice = 0
        self.state = QZ_COUNTDOWN
        self.score = 0
        self.streak = 0
        self.max_streak = 0
        self.answers = []
        self.time_limit = QUIZ_TIME_S
        self._q_start_time = 0
        self._time_remaining = QUIZ_TIME_S
        self._frame = 0
        self._result_timer = 0
        self._result_duration = 1500
        self._countdown_val = 3
        self._countdown_start = 0
        self._slide_x = 0.0
        self.on_expression = None
        self._load_default_questions()
    def _load_default_questions(self):
        """Built-in demo quiz questions."""
        self.questions = [
            Question(
                "What does CPU\nstand for?",
                ["Central Pro.\nUnit", "Computer\nPro. Unit"],
                0
            ),
            Question(
                "1 Kilobyte = ?",
                ["1000 bytes", "1024 bytes"],
                1
            ),
            Question(
                "Python is?",
                ["Compiled", "Interpreted"],
                1
            ),
            Question(
                "GPIO stands\nfor?",
                ["General\nPurpose I/O", "Global\nPower I/O"],
                0
            ),
            Question(
                "Pico W has\nWiFi?",
                ["Yes", "No"],
                0
            ),
            Question(
                "I2C uses how\nmany wires?",
                ["2 (SDA+SCL)", "4 wires"],
                0
            ),
            Question(
                "LED needs a\nresistor?",
                ["Yes", "No"],
                0
            ),
            Question(
                "MicroPython\nis based on?",
                ["Python 3", "Python 2"],
                0
            ),
        ]
    def load_questions(self, filename):
        try:
            with open(filename, "r") as f:
                data = json.load(f)
            loaded = []
            for item in data:
                text = item.get("text", "")
                choices = item.get("choices", [])
                correct_idx = int(item.get("answer", 0))
                explanation = item.get("explanation", "")
                if text and len(choices) >= 2 and 0 <= correct_idx < len(choices):
                    loaded.append(Question(text, choices[:4], correct_idx, explanation))
            if loaded:
                self.questions = loaded
                print("[QUIZ] Loaded {} question(s)".format(len(loaded)))
        except Exception as e:
            print("[QUIZ] Load error:", e)
    def start(self):
        """Start the quiz from the beginning."""
        self.current_q = 0
        self.selected_choice = 0
        self.score = 0
        self.streak = 0
        self.max_streak = 0
        self.answers = []
        self.state = QZ_COUNTDOWN
        self._countdown_val = 3
        self._countdown_start = time.ticks_ms()
        if self.on_expression:
            self.on_expression(EXPR_THINK)
    def cycle_choice(self):
        """Cycle through answer choices."""
        if self.state != QZ_SHOWING:
            return
        q = self.get_current_question()
        if q:
            self.selected_choice = (self.selected_choice + 1) % len(q.choices)
    def submit_answer(self):
        """Submit the currently selected answer."""
        if self.state != QZ_SHOWING:
            return
        q = self.get_current_question()
        if not q:
            return
        correct = q.is_correct(self.selected_choice)
        self.answers.append(correct)
        if correct:
            self.score += 1
            self.streak += 1
            self.max_streak = max(self.max_streak, self.streak)
            if self.on_expression:
                self.on_expression(EXPR_HAPPY)
        else:
            self.streak = 0
            if self.on_expression:
                self.on_expression(EXPR_SAD)
        self.state = QZ_ANSWERED
        self._result_timer = time.ticks_ms()
    def get_current_question(self):
        if self.current_q < len(self.questions):
            return self.questions[self.current_q]
        return None
    def update(self, dt_ms=33):
        """Update quiz state and animations."""
        self._frame += 1
        now = time.ticks_ms()
        if self.state == QZ_COUNTDOWN:
            elapsed = time.ticks_diff(now, self._countdown_start)
            self._countdown_val = 3 - elapsed // 1000
            if self._countdown_val <= 0:
                self.state = QZ_SHOWING
                self._q_start_time = now
                self._slide_x = OLED_WIDTH
        if self.state == QZ_SHOWING:
            elapsed = time.ticks_diff(now, self._q_start_time) / 1000.0
            self._time_remaining = max(0, self.time_limit - elapsed)
            if self._time_remaining <= 0:
                self.answers.append(False)
                self.streak = 0
                self.state = QZ_ANSWERED
                self._result_timer = now
                if self.on_expression:
                    self.on_expression(EXPR_SURPRISE)
        if self.state == QZ_ANSWERED:
            if time.ticks_diff(now, self._result_timer) >= self._result_duration:
                self.current_q += 1
                self.selected_choice = 0
                if self.current_q >= len(self.questions):
                    self.state = QZ_COMPLETE
                else:
                    self.state = QZ_SHOWING
                    self._q_start_time = now
                    self._slide_x = OLED_WIDTH
        if abs(self._slide_x) > 0.5:
            self._slide_x *= 0.7
        else:
            self._slide_x = 0
    def render(self, fb):
        """Render the current quiz state."""
        fb.fill(0)
        if self.state == QZ_COUNTDOWN:
            self._render_countdown(fb)
        elif self.state == QZ_SHOWING:
            self._render_question(fb)
        elif self.state == QZ_ANSWERED:
            self._render_result(fb)
        elif self.state == QZ_COMPLETE:
            self._render_summary(fb)
    def _render_countdown(self, fb):
        """Render the 3-2-1 countdown."""
        num = max(1, self._countdown_val)
        num_str = str(num)
        pulse = 1.0 + math.sin(self._frame * 0.3) * 0.2
        r = int(18 * pulse)
        draw_circle_outline(fb, 64, 28, r, 1)
        fb.text(num_str, 60, 24, 1)
        fb.text("Get Ready!", 24, 50, 1)
    def _render_question(self, fb):
        """Render question with choices."""
        sx = int(self._slide_x)
        q = self.get_current_question()
        if not q:
            return
        header = "Q{}/{}".format(self.current_q + 1, len(self.questions))
        fb.text(header, 1 + sx, 0, 1)
        timer_pct = self._time_remaining / self.time_limit
        bar_w = 50
        bar_x = OLED_WIDTH - bar_w - 2 + sx
        fb.rect(bar_x, 0, bar_w, 6, 1)
        fill_w = int((bar_w - 2) * timer_pct)
        if fill_w > 0:
            fb.fill_rect(bar_x + 1, 1, fill_w, 4, 1)
        if self._time_remaining < 5 and int(self._frame * 0.3) % 2 == 0:
            time_str = "{:.0f}s".format(self._time_remaining)
            fb.text(time_str, bar_x - 24, 0, 1)
        fb.hline(sx, 8, OLED_WIDTH, 1)
        max_q_chars = (OLED_WIDTH - 4) // CHAR_W
        lines = _wrap_text(q.text, max_q_chars, 2)
        qy = 11
        for line in lines:
            fb.text(line, 2 + sx, qy, 1)
            qy += LINE_H
        choice_y = 32 if len(lines) > 1 else 29
        choice_count = max(1, len(q.choices))
        compact = choice_count > 2
        row_h = 8 if compact else 15
        box_h = 8 if compact else 13
        text_y_offset = 0 if compact else 1
        max_choice_chars = (OLED_WIDTH - 18) // CHAR_W
        for i, choice in enumerate(q.choices):
            is_sel = (i == self.selected_choice)
            cy = choice_y + i * row_h
            if cy > OLED_HEIGHT - 9:
                break
            choice_text = _clip_text(choice, max_choice_chars)
            if is_sel:
                draw_rounded_rect(fb, sx + 1, cy, OLED_WIDTH - 4, box_h, 2, 1)
                fb.text(choice_text, sx + 14, cy + text_y_offset, 0)
                fb.text(">", sx + 4, cy + text_y_offset, 0)
            else:
                draw_rounded_rect_outline(fb, sx + 1, cy, OLED_WIDTH - 4, box_h, 2, 1)
                fb.text(choice_text, sx + 14, cy + text_y_offset, 1)
                fb.text(chr(65 + i), sx + 4, cy + text_y_offset, 1)
    def _render_result(self, fb):
        """Render correct/wrong feedback."""
        q = self.get_current_question()
        was_correct = self.answers[-1] if self.answers else False
        if was_correct:
            fb.text("CORRECT!", 28, 10, 1)
            fb.text("/", 56, 26, 1)
            if self.streak > 1:
                streak_str = "Streak: {}!".format(self.streak)
                tw = len(streak_str) * 8
                fb.text(streak_str, (OLED_WIDTH - tw) // 2, 44, 1)
        else:
            fb.text("WRONG!", 36, 10, 1)
            fb.text("X", 60, 26, 1)
            if q:
                ans = "Ans: " + q.choices[q.correct_idx].split("\n")[0]
                fb.text(_clip_text(ans, 15), 4, 44, 1)
        score_str = "Score: {}/{}".format(self.score, self.current_q + 1)
        fb.text(score_str, 20, 56, 1)
    def _render_summary(self, fb):
        """Render final quiz summary."""
        fb.text("Quiz Complete!", 12, 0, 1)
        fb.hline(0, 10, OLED_WIDTH, 1)
        total = len(self.questions)
        pct = int(self.score / max(1, total) * 100)
        fb.text("Score: {}/{}".format(self.score, total), 4, 14, 1)
        fb.text("Accuracy: {}%".format(pct), 4, 24, 1)
        fb.text(_clip_text("Best Streak: {}".format(self.max_streak), 15), 4, 34, 1)
        if pct >= 90:
            grade = "A+ AMAZING!"
        elif pct >= 80:
            grade = "A  GREAT!"
        elif pct >= 70:
            grade = "B  GOOD!"
        elif pct >= 60:
            grade = "C  OK"
        else:
            grade = "Keep Learning!"
        pulse = int(math.sin(self._frame * 0.15) * 2)
        tw = len(grade) * 8
        fb.text(grade, (OLED_WIDTH - tw) // 2, 48 + pulse, 1)
        draw_progress_bar(fb, 4, OLED_HEIGHT - 5, OLED_WIDTH - 8, 4, pct / 100.0, 1)
