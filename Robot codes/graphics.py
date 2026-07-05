"""
╔══════════════════════════════════════════════════════╗
║       AIDO OS — Graphics Primitives Engine            ║
║   Circles, Rounded Rects, Arcs, Bezier, Easing       ║
╚══════════════════════════════════════════════════════╝
"""
import math
def ease_in_out_cubic(t):
    """Smooth ease-in-out for animations. t: 0.0 to 1.0"""
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        p = 2.0 * t - 2.0
        return 0.5 * p * p * p + 1.0
def ease_out_elastic(t):
    """Bouncy elastic ease-out."""
    if t == 0.0 or t == 1.0:
        return t
    return math.pow(2, -10 * t) * math.sin((t - 0.075) * (2 * math.pi) / 0.3) + 1.0
def ease_out_quad(t):
    return t * (2.0 - t)
def ease_in_quad(t):
    return t * t
def lerp(a, b, t):
    """Linear interpolation."""
    return a + (b - a) * t
def clamp(val, lo, hi):
    return max(lo, min(hi, val))
class Spring:
    """True physics-based spring animation for unmatched fluidity."""
    def __init__(self, value, tension=120, friction=12):
        self.value = value
        self.target = value
        self.velocity = 0.0
        self.tension = tension
        self.friction = friction
    def update(self, dt=0.033):
        displacement = self.value - self.target
        spring_force = -self.tension * displacement
        damping_force = -self.friction * self.velocity
        acceleration = spring_force + damping_force
        self.velocity += acceleration * dt
        self.value += self.velocity * dt
        return self.value
def draw_dither_rect(fb, x, y, w, h, pattern=0):
    """Draw a dithered rectangle for 'transparent' dark mode look.
    pattern 0: 50% checkerboard, 1: 25% dots"""
    for dy in range(h):
        py = y + dy
        if py < 0 or py >= 64: continue
        for dx in range(w):
            px = x + dx
            if px < 0 or px >= 128: continue
            if pattern == 0:
                if (px + py) % 2 == 0:
                    fb.pixel(px, py, 1)
            else:
                if (px % 2 == 0) and (py % 2 == 0):
                    fb.pixel(px, py, 1)
def draw_circle(fb, cx, cy, r, c=1):
    """Bresenham circle — filled."""
    x = r
    y = 0
    err = 1 - r
    while x >= y:
        fb.hline(cx - x, cy + y, 2 * x + 1, c)
        fb.hline(cx - x, cy - y, 2 * x + 1, c)
        fb.hline(cx - y, cy + x, 2 * y + 1, c)
        fb.hline(cx - y, cy - x, 2 * y + 1, c)
        y += 1
        if err < 0:
            err += 2 * y + 1
        else:
            x -= 1
            err += 2 * (y - x) + 1
def draw_circle_outline(fb, cx, cy, r, c=1):
    """Bresenham circle — outline only."""
    x = r
    y = 0
    err = 1 - r
    while x >= y:
        fb.pixel(cx + x, cy + y, c)
        fb.pixel(cx - x, cy + y, c)
        fb.pixel(cx + x, cy - y, c)
        fb.pixel(cx - x, cy - y, c)
        fb.pixel(cx + y, cy + x, c)
        fb.pixel(cx - y, cy + x, c)
        fb.pixel(cx + y, cy - x, c)
        fb.pixel(cx - y, cy - x, c)
        y += 1
        if err < 0:
            err += 2 * y + 1
        else:
            x -= 1
            err += 2 * (y - x) + 1
def draw_rounded_rect(fb, x, y, w, h, r, c=1):
    """Filled rounded rectangle using quarters of circles at corners."""
    r = min(r, w // 2, h // 2)
    fb.fill_rect(x + r, y, w - 2 * r, h, c)
    fb.fill_rect(x, y + r, r, h - 2 * r, c)
    fb.fill_rect(x + w - r, y + r, r, h - 2 * r, c)
    _fill_quarter(fb, x + r, y + r, r, 0, c)
    _fill_quarter(fb, x + w - r - 1, y + r, r, 1, c)
    _fill_quarter(fb, x + r, y + h - r - 1, r, 2, c)
    _fill_quarter(fb, x + w - r - 1, y + h - r - 1, r, 3, c)
def draw_rounded_rect_outline(fb, x, y, w, h, r, c=1):
    """Outline-only rounded rectangle."""
    r = min(r, w // 2, h // 2)
    fb.hline(x + r, y, w - 2 * r, c)
    fb.hline(x + r, y + h - 1, w - 2 * r, c)
    fb.vline(x, y + r, h - 2 * r, c)
    fb.vline(x + w - 1, y + r, h - 2 * r, c)
    _draw_quarter_arc(fb, x + r, y + r, r, 0, c)
    _draw_quarter_arc(fb, x + w - r - 1, y + r, r, 1, c)
    _draw_quarter_arc(fb, x + r, y + h - r - 1, r, 2, c)
    _draw_quarter_arc(fb, x + w - r - 1, y + h - r - 1, r, 3, c)
def _fill_quarter(fb, cx, cy, r, quadrant, c):
    """Fill a quarter-circle. Quadrants: 0=TL, 1=TR, 2=BL, 3=BR."""
    x = r
    y = 0
    err = 1 - r
    while x >= y:
        if quadrant == 0:
            fb.hline(cx - x, cy - y, x + 1, c)
            fb.hline(cx - y, cy - x, y + 1, c)
        elif quadrant == 1:
            fb.hline(cx, cy - y, x + 1, c)
            fb.hline(cx, cy - x, y + 1, c)
        elif quadrant == 2:
            fb.hline(cx - x, cy + y, x + 1, c)
            fb.hline(cx - y, cy + x, y + 1, c)
        elif quadrant == 3:
            fb.hline(cx, cy + y, x + 1, c)
            fb.hline(cx, cy + x, y + 1, c)
        y += 1
        if err < 0:
            err += 2 * y + 1
        else:
            x -= 1
            err += 2 * (y - x) + 1
def _draw_quarter_arc(fb, cx, cy, r, quadrant, c):
    """Draw a quarter-circle arc outline."""
    x = r
    y = 0
    err = 1 - r
    while x >= y:
        if quadrant == 0:
            fb.pixel(cx - x, cy - y, c)
            fb.pixel(cx - y, cy - x, c)
        elif quadrant == 1:
            fb.pixel(cx + x, cy - y, c)
            fb.pixel(cx + y, cy - x, c)
        elif quadrant == 2:
            fb.pixel(cx - x, cy + y, c)
            fb.pixel(cx - y, cy + x, c)
        elif quadrant == 3:
            fb.pixel(cx + x, cy + y, c)
            fb.pixel(cx + y, cy + x, c)
        y += 1
        if err < 0:
            err += 2 * y + 1
        else:
            x -= 1
            err += 2 * (y - x) + 1
def draw_ellipse(fb, cx, cy, rx, ry, c=1, filled=True):
    """Draw an ellipse (filled or outline)."""
    for y in range(-ry, ry + 1):
        if ry == 0:
            wx = rx
        else:
            fy = y / ry
            if abs(fy) > 1.0:
                continue
            wx = int(rx * math.sqrt(1.0 - fy * fy))
        if filled:
            fb.hline(cx - wx, cy + y, 2 * wx + 1, c)
        else:
            fb.pixel(cx - wx, cy + y, c)
            fb.pixel(cx + wx, cy + y, c)
def draw_heart(fb, cx, cy, size, c=1):
    """Draw a filled heart shape."""
    for y in range(-size, size + 1):
        for x in range(-size, size + 1):
            nx = x / (size * 0.7)
            ny = -y / (size * 0.7)
            val = (nx*nx + ny*ny - 1.0)
            val = val * val * val - nx*nx * ny*ny*ny
            if val <= 0:
                fb.pixel(cx + x, cy + y, c)
def draw_sine_wave(fb, x_start, y_center, width, amplitude, phase, c=1):
    """Draw a sine wave — used for talking animation."""
    prev_y = None
    for x in range(width):
        angle = (x / width) * 4.0 * math.pi + phase
        y = int(y_center + math.sin(angle) * amplitude)
        py = clamp(y, 0, 63)
        fb.pixel(x_start + x, py, c)
        if prev_y is not None and abs(py - prev_y) > 1:
            step = 1 if py > prev_y else -1
            for iy in range(prev_y, py, step):
                fb.pixel(x_start + x, clamp(iy, 0, 63), c)
        prev_y = py
def draw_thick_hline(fb, x, y, w, thickness, c=1):
    """Draw a thick horizontal line."""
    for dy in range(thickness):
        fb.hline(x, y + dy, w, c)
def draw_progress_bar(fb, x, y, w, h, progress, c=1):
    """Draw a progress bar. progress: 0.0 to 1.0"""
    draw_rounded_rect_outline(fb, x, y, w, h, 2, c)
    pad = 1 if h <= 4 else 2
    inner_w = max(0, w - pad * 2)
    inner_h = max(1, h - pad * 2)
    fill_w = int(inner_w * clamp(progress, 0.0, 1.0))
    if fill_w > 0:
        fb.fill_rect(x + pad, y + pad, fill_w, inner_h, c)
def draw_battery_icon(fb, x, y, percent, c=1):
    """Draw a tiny battery icon with fill level."""
    fb.rect(x, y, 12, 7, c)
    fb.fill_rect(x + 12, y + 2, 2, 3, c)
    bars = int(percent / 25.0)
    bars = clamp(bars, 0, 4)
    for i in range(bars):
        fb.fill_rect(x + 1 + i * 3, y + 1, 2, 5, c)
def draw_wifi_icon(fb, x, y, connected, c=1):
    """Draw a tiny WiFi icon."""
    if connected:
        for r in [2, 5, 8]:
            _draw_quarter_arc(fb, x + 4, y + 8, r, 0, c)
            _draw_quarter_arc(fb, x + 4, y + 8, r, 1, c)
        fb.pixel(x + 4, y + 8, c)
    else:
        for i in range(5):
            fb.pixel(x + i, y + 3 + i, c)
            fb.pixel(x + 4 - i, y + 3 + i, c)
