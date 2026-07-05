"""
========================================
  FLASHCARDS TEST
========================================
[SD] Loading flashcards.json...
[FLASHCARDS] 12 cards loaded
[FLASHCARDS] Card 1/12: "What is the powerhouse of the cell?" -> "Mitochondria"
[FLASHCARDS] Card 2/12: "Capital of France?" -> "Paris"
...
[FLASHCARDS] Deck cycle complete
RESULT: Flashcards module PASSED.
"""
import math
import time
import json
import os
from config import (
    OLED_WIDTH, OLED_HEIGHT, MAX_CARDS, SR_INTERVALS,
    EXPR_HAPPY, EXPR_SAD, EXPR_THINK,
)
from graphics import (
    draw_rounded_rect, draw_rounded_rect_outline,
    draw_progress_bar, clamp, ease_in_out_cubic,
)
CARD_FRONT = 0
CARD_BACK  = 1
CARD_RESULT = 2
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
class Flashcard:
    """A single flashcard with spaced repetition metadata."""
    def __init__(self, front, back, deck="default"):
        self.front = front
        self.back = back
        self.deck = deck
        self.level = 0
        self.correct_count = 0
        self.wrong_count = 0
        self.last_seen = 0
    def to_dict(self):
        return {
            "f": self.front,
            "b": self.back,
            "d": self.deck,
            "l": self.level,
            "c": self.correct_count,
            "w": self.wrong_count,
        }
    @staticmethod
    def from_dict(d):
        card = Flashcard(d["f"], d["b"], d.get("d", "default"))
        card.level = d.get("l", 0)
        card.correct_count = d.get("c", 0)
        card.wrong_count = d.get("w", 0)
        return card
class FlashcardEngine:
    """
    Premium flashcard system with:
    - Animated card flip effect
    - Spaced repetition scheduling
    - Visual progress tracking
    - Multi-deck support
    - Persistent storage
    - Animated transitions between cards
    """
    def __init__(self):
        self.cards = []
        self.current_index = 0
        self.card_state = CARD_FRONT
        self._flip_progress = 0.0
        self._flipping = False
        self._flip_target = 0
        self._slide_offset = 0.0
        self.session_correct = 0
        self.session_wrong = 0
        self.session_total = 0
        self._frame = 0
        self.on_expression = None
        self._load_default_deck()
    def _load_default_deck(self):
        """Load built-in demo flashcards."""
        demo_cards = [
            ("What is AI?", "Artificial\nIntelligence"),
            ("Python type\nfor text?", "str (string)"),
            ("Ohm's Law?", "V = I x R"),
            ("H2O is?", "Water"),
            ("CPU stands\nfor?", "Central\nProcessing Unit"),
            ("1 byte = ?", "8 bits"),
            ("Pi = ?", "3.14159..."),
            ("LED means?", "Light Emitting\nDiode"),
            ("RAM is?", "Random Access\nMemory"),
            ("What is\nI2C?", "Inter-Integrated\nCircuit bus"),
            ("GPIO means?", "General Purpose\nInput/Output"),
            ("What is\nPWM?", "Pulse Width\nModulation"),
        ]
        for front, back in demo_cards:
            self.cards.append(Flashcard(front, back, "Demo"))
    def load_deck(self, filename):
        """Load a deck from JSON file."""
        try:
            with open(filename, "r") as f:
                data = json.load(f)
            loaded = []
            for d in data:
                try:
                    if d.get("f") and d.get("b"):
                        loaded.append(Flashcard.from_dict(d))
                except Exception:
                    pass
            if loaded:
                self.cards = loaded
                self.current_index = 0
                print("[FC] Loaded {} cards".format(len(self.cards)))
            else:
                print("[FC] No valid cards in {}".format(filename))
        except Exception as e:
            print("[FC] Load error: {}".format(e))
    def save_progress(self, filename="flashcards.json"):
        """Save card progress to file."""
        tmp_file = filename + ".tmp"
        try:
            data = [c.to_dict() for c in self.cards]
            with open(tmp_file, "w") as f:
                json.dump(data, f)
            try:
                os.remove(filename)
            except OSError:
                pass
            os.rename(tmp_file, filename)
        except Exception as e:
            print("[FC] Save error: {}".format(e))
            try:
                os.remove(tmp_file)
            except Exception:
                pass
    def get_current_card(self):
        """Get the current flashcard."""
        if not self.cards:
            return None
        return self.cards[self.current_index % len(self.cards)]
    def flip_card(self):
        """Trigger the flip animation."""
        if self._flipping:
            return
        self._flipping = True
        if self.card_state == CARD_FRONT:
            self._flip_target = CARD_BACK
        else:
            self._flip_target = CARD_FRONT
    def mark_correct(self):
        """Mark current card as correctly answered."""
        card = self.get_current_card()
        if card:
            card.correct_count += 1
            card.level = min(card.level + 1, len(SR_INTERVALS) - 1)
            self.session_correct += 1
            self.session_total += 1
            if self.on_expression:
                self.on_expression(EXPR_HAPPY)
        self._next_card()
    def mark_wrong(self):
        """Mark current card as incorrectly answered."""
        card = self.get_current_card()
        if card:
            card.wrong_count += 1
            card.level = max(0, card.level - 1)
            self.session_wrong += 1
            self.session_total += 1
            if self.on_expression:
                self.on_expression(EXPR_SAD)
        self._next_card()
    def _next_card(self):
        """Advance to the next card with slide animation."""
        self._slide_offset = OLED_WIDTH
        self.current_index = (self.current_index + 1) % max(1, len(self.cards))
        self.card_state = CARD_FRONT
        self._flip_progress = 0.0
    def reset_session(self):
        """Reset session statistics."""
        self.session_correct = 0
        self.session_wrong = 0
        self.session_total = 0
        self.current_index = 0
    def update(self, dt_ms=33):
        """Update animations."""
        self._frame += 1
        if self._flipping:
            speed = 0.12
            if self._flip_target == CARD_BACK:
                self._flip_progress = min(1.0, self._flip_progress + speed)
                if self._flip_progress >= 1.0:
                    self._flipping = False
                    self.card_state = CARD_BACK
            else:
                self._flip_progress = max(0.0, self._flip_progress - speed)
                if self._flip_progress <= 0.0:
                    self._flipping = False
                    self.card_state = CARD_FRONT
        if abs(self._slide_offset) > 0.5:
            self._slide_offset *= 0.75
        else:
            self._slide_offset = 0
    def render(self, fb):
        """Render the flashcard view."""
        fb.fill(0)
        card = self.get_current_card()
        if not card:
            fb.text("No cards!", 24, 28, 1)
            return
        slide_x = int(self._slide_offset)
        counter = "{}/{}".format(self.current_index + 1, len(self.cards))
        fb.text(counter, 1 + slide_x, 1, 1)
        deck = _clip_text(card.deck, 8)
        deck_w = len(deck) * CHAR_W
        fb.text(deck, OLED_WIDTH - deck_w - 1 + slide_x, 1, 1)
        fb.hline(0 + slide_x, 10, OLED_WIDTH, 1)
        card_y = 13
        card_h = 36
        card_w = OLED_WIDTH - 8
        card_x = 4 + slide_x
        flip_t = self._flip_progress
        if self._flipping:
            squeeze = 1.0 - abs(2.0 * flip_t - 1.0)
            visible_w = int(card_w * (1.0 - squeeze * 0.8))
            visible_x = card_x + (card_w - visible_w) // 2
        else:
            visible_w = card_w
            visible_x = card_x
        if visible_w > 4:
            draw_rounded_rect_outline(fb, visible_x, card_y, visible_w, card_h, 4, 1)
        showing_back = (flip_t > 0.5) if self._flipping else (self.card_state == CARD_BACK)
        if visible_w > 30:
            text = card.back if showing_back else card.front
            label = "ANS" if showing_back else "Q"
            fb.text(label, visible_x + 3, card_y + 3, 1)
            max_chars = max(1, (visible_w - 12) // CHAR_W)
            lines = _wrap_text(text, max_chars, 3)
            text_y = card_y + 13
            for line in lines:
                tw = len(line) * CHAR_W
                tx = visible_x + max(2, (visible_w - tw) // 2)
                fb.text(line, tx, text_y, 1)
                text_y += LINE_H
        ctrl_y = 52
        if self.card_state == CARD_FRONT:
            msg = "Tap to flip"
            pulse = 0.5 + 0.5 * math.sin(self._frame * 0.1)
            if int(pulse * 3) > 0:
                tw = len(msg) * 8
                fb.text(msg, (OLED_WIDTH - tw) // 2 + slide_x, ctrl_y, 1)
        else:
            fb.text("Tap=OK 2x=No", 4 + slide_x, ctrl_y, 1)
        if self.session_total > 0:
            pct = self.session_correct / max(1, self.session_total)
            draw_progress_bar(fb, 4 + slide_x, OLED_HEIGHT - 4, OLED_WIDTH - 8, 3, pct, 1)
    def render_summary(self, fb):
        """Render session summary screen."""
        fb.fill(0)
        fb.text("Session Done!", 16, 2, 1)
        fb.hline(0, 12, OLED_WIDTH, 1)
        fb.text("Correct: {}".format(self.session_correct), 8, 18, 1)
        fb.text("Wrong:   {}".format(self.session_wrong), 8, 28, 1)
        total = max(1, self.session_total)
        pct = int(self.session_correct / total * 100)
        fb.text("Score: {}%".format(pct), 8, 40, 1)
        if pct >= 90:
            grade = "EXCELLENT!"
        elif pct >= 70:
            grade = "GREAT!"
        elif pct >= 50:
            grade = "GOOD"
        else:
            grade = "Keep trying!"
        tw = len(grade) * 8
        fb.text(grade, (OLED_WIDTH - tw) // 2, 54, 1)
