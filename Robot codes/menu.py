"""
╔══════════════════════════════════════════════════════╗
║         AIDO OS — Premium Animated Menu System        ║
║    Smooth Scrolling • Icons • Transition Animations   ║
╚══════════════════════════════════════════════════════╝
"""
import math
import time
from config import (
    OLED_WIDTH, OLED_HEIGHT, MENU_ITEMS, MENU_SCROLL_SPEED,
)
from graphics import (
    draw_rounded_rect, draw_rounded_rect_outline,
    draw_circle, draw_progress_bar, lerp, clamp,
    ease_out_quad, ease_in_out_cubic, Spring, draw_dither_rect
)
from icons import draw_icon
HEADER_H      = 12
ITEM_H        = 18
ITEM_PAD      = 2
VISIBLE_ITEMS = 3
ICON_SIZE     = 16
ICON_PAD      = 4
SCROLL_X      = ICON_SIZE + ICON_PAD + 8
SEL_MARGIN    = 2
TRANS_NONE   = 0
TRANS_IN     = 1
TRANS_OUT    = 2
TRANS_SELECT = 3
class MenuSystem:
    """
    Premium animated menu with:
    - Smooth vertical scrolling with easing
    - Animated selection indicator with glow effect
    - 16x16 icon support for each item
    - Slide-in/slide-out transitions
    - Item selection animation
    """
    def __init__(self):
        self.items = MENU_ITEMS
        self.selected = 0
        self.num_items = len(self.items)
        self._scroll_y = Spring(0.0, tension=180, friction=14)
        self._sel_anim = Spring(0.0, tension=200, friction=20)
        self._transition = TRANS_NONE
        self._trans_progress = 0.0
        self._trans_start = 0
        self._trans_duration = 300
        self._selected_item = None
        self._frame = 0
    def open(self):
        """Start the menu open animation."""
        self._transition = TRANS_IN
        self._trans_progress = 0.0
        self._trans_start = time.ticks_ms()
        self.selected = 0
        self._scroll_y.value = 0.0
        self._scroll_y.target = 0.0
        self._sel_anim.value = 1.0
        self._sel_anim.target = 1.0
    def close(self):
        """Start the menu close animation."""
        self._transition = TRANS_OUT
        self._trans_progress = 0.0
        self._trans_start = time.ticks_ms()
    def is_transitioning(self):
        return self._transition != TRANS_NONE
    def is_open_complete(self):
        return self._transition == TRANS_NONE
    def navigate_down(self):
        """Move selection down."""
        self.selected = (self.selected + 1) % self.num_items
        self._update_scroll_target()
        self._sel_anim.value = 0.0
        self._sel_anim.target = 1.0
    def navigate_up(self):
        """Move selection up."""
        self.selected = (self.selected - 1) % self.num_items
        self._update_scroll_target()
        self._sel_anim.value = 0.0
        self._sel_anim.target = 1.0
    def select_current(self):
        """Select the current item. Returns the menu item dict or None."""
        self._selected_item = self.items[self.selected]
        self._transition = TRANS_SELECT
        self._trans_progress = 0.0
        self._trans_start = time.ticks_ms()
        self._trans_duration = 250
        return self._selected_item
    def get_selected_state(self):
        """Get the state associated with the selected menu item."""
        if self._selected_item:
            return self._selected_item.get("state", None)
        return None
    def _update_scroll_target(self):
        """Calculate scroll target so selected item is visible."""
        item_top = self.selected * (ITEM_H + ITEM_PAD)
        view_h = VISIBLE_ITEMS * (ITEM_H + ITEM_PAD)
        if item_top < self._scroll_y.target:
            self._scroll_y.target = item_top
        elif item_top + ITEM_H > self._scroll_y.target + view_h:
            self._scroll_y.target = item_top + ITEM_H - view_h
        self._scroll_y.target = max(0, self._scroll_y.target)
    def update(self, dt_ms=33):
        """Update animations. Call once per frame."""
        self._frame += 1
        now = time.ticks_ms()
        if self._transition != TRANS_NONE:
            elapsed = time.ticks_diff(now, self._trans_start)
            self._trans_progress = clamp(elapsed / self._trans_duration, 0.0, 1.0)
            if self._trans_progress >= 1.0:
                if self._transition == TRANS_SELECT:
                    pass
                self._transition = TRANS_NONE
                self._trans_progress = 1.0
        self._scroll_y.update(0.033)
        self._sel_anim.update(0.033)
    def render(self, fb):
        """Render the menu to the framebuffer."""
        fb.fill(0)
        if self._transition == TRANS_IN:
            slide = int((1.0 - ease_out_quad(self._trans_progress)) * OLED_WIDTH)
            self._render_content(fb, slide_x=slide)
        elif self._transition == TRANS_OUT:
            slide = int(ease_out_quad(self._trans_progress) * OLED_WIDTH)
            self._render_content(fb, slide_x=-slide)
        elif self._transition == TRANS_SELECT:
            self._render_content(fb, flash=self._trans_progress)
        else:
            self._render_content(fb)
    def _render_content(self, fb, slide_x=0, flash=0.0):
        """Render the actual menu content."""
        start_y = HEADER_H + 2
        scroll_int = int(self._scroll_y.value)
        for i, item in enumerate(self.items):
            item_y = start_y + i * (ITEM_H + ITEM_PAD) - scroll_int
            if item_y < HEADER_H or item_y > OLED_HEIGHT:
                continue
            stagger = slide_x + (i * 8 if slide_x != 0 else 0)
            draw_x = stagger
            is_selected = (i == self.selected)
            if is_selected:
                pulse = self._sel_anim.value
                if flash > 0.0:
                    if int(flash * 8) % 2 == 0:
                        fb.fill_rect(draw_x + 1, item_y, OLED_WIDTH - 4, ITEM_H, 1)
                        fb.text(item["label"], draw_x + SCROLL_X, item_y + 5, 0)
                        if 0 <= draw_x + 4 < OLED_WIDTH - ICON_SIZE:
                            draw_icon(fb, item["icon"], draw_x + 4, item_y + 1, 0)
                        continue
                    else:
                        draw_rounded_rect_outline(fb, draw_x + 1, item_y, OLED_WIDTH - 4, ITEM_H, 4, 1)
                else:
                    fb.fill_rect(draw_x + 1, item_y, OLED_WIDTH - 4, ITEM_H, 1)
                    fb.text(item["label"], draw_x + SCROLL_X, item_y + 5, 0)
                    arrow_x = draw_x + OLED_WIDTH - 12
                    bounce = int(math.sin(self._frame * 0.2) * 3 * pulse)
                    fb.text(">", arrow_x + bounce, item_y + 5, 0)
            else:
                fb.text(item["label"], draw_x + SCROLL_X, item_y + 5, 1)
            icon_x = draw_x + 4
            icon_y = item_y + 1
            if 0 <= icon_x < OLED_WIDTH - ICON_SIZE and start_y <= icon_y <= OLED_HEIGHT - ICON_SIZE:
                color = 0 if is_selected else 1
                draw_icon(fb, item["icon"], icon_x, icon_y, color)
        fb.fill_rect(0, 0, OLED_WIDTH, HEADER_H + 1, 0)
        header_y = 0 + slide_x // 4
        fb.text("AIDO OS", 30 + slide_x, max(0, min(2, header_y)), 1)
        fb.hline(0 + slide_x, HEADER_H, OLED_WIDTH, 1)
        if self.num_items > VISIBLE_ITEMS:
            self._draw_scrollbar(fb)
    def _draw_scrollbar(self, fb):
        """Draw a subtle scrollbar on the right edge."""
        bar_x = OLED_WIDTH - 2
        bar_h = OLED_HEIGHT - HEADER_H - 4
        bar_y = HEADER_H + 2
        fb.vline(bar_x, bar_y, bar_h, 1)
        total_h = self.num_items * (ITEM_H + ITEM_PAD)
        view_h = VISIBLE_ITEMS * (ITEM_H + ITEM_PAD)
        if total_h > 0:
            thumb_h = max(4, int(bar_h * (view_h / total_h)))
            thumb_y = bar_y + int((bar_h - thumb_h) * (self._scroll_y.value / max(1, total_h - view_h)))
            thumb_y = clamp(thumb_y, bar_y, bar_y + bar_h - thumb_h)
            fb.fill_rect(bar_x - 1, thumb_y, 3, thumb_h, 1)
