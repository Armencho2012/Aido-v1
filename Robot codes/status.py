"""
╔══════════════════════════════════════════════════════╗
║        AIDO OS — System Status Bar Module             ║
║     Battery % • WiFi Signal • Temperature • Clock     ║
╚══════════════════════════════════════════════════════╝
"""
import machine
import time
from config import (
    OLED_WIDTH, OLED_HEIGHT,
    BATTERY_ADC_PIN, BATT_FULL_V, BATT_EMPTY_V,
    BATT_DIVIDER, ADC_VREF, ADC_MAX,
)
from graphics import draw_battery_icon, draw_wifi_icon, clamp
class StatusBar:
    """
    Always-on status overlay showing:
    - Battery percentage with icon
    - WiFi connection status
    - Optional temperature from MPU
    - Uptime clock
    Renders as a transparent overlay on the top or bottom of screen.
    """
    def __init__(self, position="top"):
        self.position = position
        self.bar_height = 10
        try:
            self._adc = machine.ADC(BATTERY_ADC_PIN)
        except Exception:
            self._adc = None
        self._batt_percent = 100
        self._batt_voltage = 4.2
        self._last_batt_read = 0
        self._batt_read_interval = 5000
        self._wifi_connected = False
        self._wifi_rssi = 0
        self._temperature = 0.0
        self._boot_time = time.ticks_ms()
        self.visible = True
        self._alpha_anim = 0.0
    def set_wifi_status(self, connected, rssi=0):
        """Update WiFi connection status."""
        self._wifi_connected = connected
        self._wifi_rssi = rssi
    def set_temperature(self, temp_c):
        """Update temperature reading."""
        self._temperature = temp_c
    def update(self, dt_ms=33):
        """Update battery reading periodically."""
        now = time.ticks_ms()
        if self.visible and self._alpha_anim < 1.0:
            self._alpha_anim = min(1.0, self._alpha_anim + 0.1)
        elif not self.visible and self._alpha_anim > 0.0:
            self._alpha_anim = max(0.0, self._alpha_anim - 0.1)
        if time.ticks_diff(now, self._last_batt_read) >= self._batt_read_interval:
            self._last_batt_read = now
            self._read_battery()
    def _read_battery(self):
        """Read battery voltage from ADC and compute percentage."""
        if self._adc is None:
            return
        try:
            raw = self._adc.read_u16()
            voltage = (raw / ADC_MAX) * ADC_VREF * BATT_DIVIDER
            self._batt_voltage = voltage
            pct = (voltage - BATT_EMPTY_V) / (BATT_FULL_V - BATT_EMPTY_V)
            self._batt_percent = int(clamp(pct * 100, 0, 100))
        except Exception:
            pass
    def _format_uptime(self):
        """Format uptime as MM:SS or HH:MM."""
        elapsed_s = time.ticks_diff(time.ticks_ms(), self._boot_time) // 1000
        minutes = elapsed_s // 60
        seconds = elapsed_s % 60
        if minutes >= 60:
            hours = minutes // 60
            minutes = minutes % 60
            return "{:d}:{:02d}".format(hours, minutes)
        else:
            return "{:d}:{:02d}".format(minutes, seconds)
    def render(self, fb, force_bottom=False):
        """Render the status bar overlay."""
        if self._alpha_anim <= 0.01:
            return
        if self.position == "bottom" or force_bottom:
            y = OLED_HEIGHT - self.bar_height
        else:
            y = 0
        fb.fill_rect(0, y, OLED_WIDTH, self.bar_height, 0)
        fb.hline(0, y + self.bar_height - 1, OLED_WIDTH, 1)
        draw_battery_icon(fb, 1, y + 1, self._batt_percent, 1)
        pct_str = "{}%".format(self._batt_percent)
        fb.text(pct_str, 16, y + 1, 1)
        wifi_x = OLED_WIDTH - 12
        draw_wifi_icon(fb, wifi_x, y - 1, self._wifi_connected, 1)
        uptime = self._format_uptime()
        text_w = len(uptime) * 8
        fb.text(uptime, (OLED_WIDTH - text_w) // 2, y + 1, 1)
    def render_minimal(self, fb):
        """
        Render a minimal status overlay — just tiny icons in corners.
        Used when in Face mode to avoid clutter.
        """
        if self._alpha_anim <= 0.01:
            return
        bar_w = 16
        bar_h = 3
        fill_w = int(bar_w * self._batt_percent / 100.0)
        fb.rect(0, 0, bar_w + 2, bar_h + 2, 1)
        fb.fill_rect(1, 1, fill_w, bar_h, 1)
        if self._wifi_connected:
            fb.fill_rect(OLED_WIDTH - 4, 0, 4, 4, 1)
        else:
            fb.rect(OLED_WIDTH - 4, 0, 4, 4, 1)
            fb.pixel(OLED_WIDTH - 3, 1, 1)
            fb.pixel(OLED_WIDTH - 2, 2, 1)
