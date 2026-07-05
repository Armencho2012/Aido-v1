import math
import time
from graphics import draw_circle
def _draw_car(fb, x, y, bounce):
    fb.fill_rect(x + 8, y + 6 + bounce, 26, 8, 1)
    fb.fill_rect(x + 14, y + 1 + bounce, 14, 7, 1)
    fb.fill_rect(x + 16, y + 3 + bounce, 4, 3, 0)
    fb.fill_rect(x + 22, y + 3 + bounce, 4, 3, 0)
    fb.fill_rect(x + 5, y + 9 + bounce, 3, 2, 1)
    fb.fill_rect(x + 34, y + 9 + bounce, 4, 2, 1)
    fb.pixel(x + 35, y + 8 + bounce, 1)
    fb.pixel(x + 36, y + 7 + bounce, 1)
    fb.fill_rect(x + 11, y + 14 + bounce, 8, 2, 0)
    fb.fill_rect(x + 23, y + 14 + bounce, 8, 2, 0)
    draw_circle(fb, x + 15, y + 15 + bounce, 5, 1)
    draw_circle(fb, x + 27, y + 15 + bounce, 5, 1)
    draw_circle(fb, x + 15, y + 15 + bounce, 2, 0)
    draw_circle(fb, x + 27, y + 15 + bounce, 2, 0)
def play(oled, frames=26, delay_ms=22):
    for frame in range(frames):
        oled.fill(0)
        horizon = 44
        oled.hline(0, horizon, 128, 1)
        for sx in range(0, 128, 18):
            star_y = 6 + ((sx * 7 + frame * 3) % 22)
            oled.pixel((sx + frame * 5) % 128, star_y, 1)
        for i in range(7):
            dash_x = (frame * 11 + i * 24) % 152 - 12
            oled.fill_rect(dash_x, 52, 10, 2, 1)
        for i in range(5):
            pole_x = (frame * 13 + i * 30) % 168 - 12
            pole_h = 8 + (i % 2) * 4
            oled.vline(pole_x, horizon - pole_h, pole_h, 1)
        car_x = int(-42 + frame * 6.7)
        bounce = int(math.sin(frame * 0.7) * 2)
        _draw_car(oled, car_x, 30, bounce)
        for s in range(3):
            streak_x = car_x - 10 - s * 7
            if 0 <= streak_x < 128:
                oled.hline(streak_x, 39 + s, 5, 1)
        oled.show()
        time.sleep_ms(delay_ms)
