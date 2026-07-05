"""
╔══════════════════════════════════════════════════════╗
║           AIDO OS — WiFi Manager Module               ║
║    Async Connect • Status Monitor • Auto-Reconnect    ║
╚══════════════════════════════════════════════════════╝
"""
import time
import network
from config import WIFI_SSID, WIFI_PASS, WIFI_TIMEOUT_S
class WiFiManager:
    """
    Non-blocking WiFi management for Pico W.
    Features:
    - Non-blocking connection (doesn't freeze the OS)
    - Auto-reconnect on disconnect
    - Signal strength monitoring
    - Status reporting for the status bar
    """
    def __init__(self):
        self._wlan = None
        self._connected = False
        self._connecting = False
        self._connect_start = 0
        self._ssid = WIFI_SSID
        self._password = WIFI_PASS
        self._rssi = 0
        self._ip = ""
        self._last_check = 0
        self._check_interval = 5000
        self._retry_count = 0
        self._max_retries = 3
        self._init_wlan()
    def _init_wlan(self):
        """Initialize the WLAN interface."""
        try:
            self._wlan = network.WLAN(network.STA_IF)
            self._wlan.active(True)
            try:
                self._wlan.config(pm=0xa11140)
            except Exception:
                pass
            if self._wlan.isconnected():
                self._connected = True
                self._connecting = False
                self._ip = self._wlan.ifconfig()[0]
                try:
                    self._rssi = self._wlan.status('rssi')
                except Exception:
                    self._rssi = 0
                print("[WiFi] Already connected! IP: {}".format(self._ip))
            else:
                print("[WiFi] Interface ready")
        except Exception as e:
            print("[WiFi] Init error: {}".format(e))
            self._wlan = None
    def configure(self, ssid, password):
        """Set WiFi credentials."""
        self._ssid = ssid
        self._password = password
    def connect(self, ssid=None, password=None):
        """Start non-blocking WiFi connection."""
        if self._wlan is None:
            return
        if ssid:
            self._ssid = ssid
        if password:
            self._password = password
        if not self._ssid:
            print("[WiFi] No SSID configured")
            return
        try:
            if self._wlan.isconnected():
                self._connected = True
                self._connecting = False
                self._ip = self._wlan.ifconfig()[0]
                print("[WiFi] Already connected! IP: {}".format(self._ip))
                return
            print("[WiFi] Connecting to '{}'...".format(self._ssid))
            self._wlan.connect(self._ssid, self._password)
            self._connecting = True
            self._connect_start = time.ticks_ms()
        except Exception as e:
            print("[WiFi] Connect error: {}".format(e))
            self._connecting = False
    def disconnect(self):
        """Disconnect from WiFi."""
        if self._wlan:
            try:
                self._wlan.disconnect()
                self._wlan.active(False)
            except Exception:
                pass
        self._connected = False
        self._connecting = False
    def update(self, dt_ms=33):
        """
        Non-blocking WiFi state update. Call every frame.
        Returns True if connection status changed.
        """
        if self._wlan is None:
            return False
        now = time.ticks_ms()
        changed = False
        if self._connecting:
            try:
                status = self._wlan.status()
            except Exception:
                status = -1
            if self._wlan.isconnected():
                self._connected = True
                self._connecting = False
                self._ip = self._wlan.ifconfig()[0]
                self._retry_count = 0
                print("[WiFi] Connected! IP: {}".format(self._ip))
                changed = True
            elif time.ticks_diff(now, self._connect_start) >= WIFI_TIMEOUT_S * 1000:
                self._connecting = False
                self._retry_count += 1
                print("[WiFi] Connection timeout (attempt {})".format(self._retry_count))
                if self._retry_count < self._max_retries:
                    time.sleep_ms(500)
                    self.connect()
                else:
                    print("[WiFi] Max retries reached")
                changed = True
        if time.ticks_diff(now, self._last_check) >= self._check_interval:
            self._last_check = now
            if self._connected:
                try:
                    if not self._wlan.isconnected():
                        print("[WiFi] Lost connection")
                        self._connected = False
                        changed = True
                        self._retry_count = 0
                        self.connect()
                    else:
                        try:
                            self._rssi = self._wlan.status('rssi')
                        except Exception:
                            self._rssi = 0
                except Exception:
                    self._connected = False
                    changed = True
        return changed
    @property
    def connected(self):
        return self._connected
    @property
    def connecting(self):
        return self._connecting
    @property
    def rssi(self):
        return self._rssi
    @property
    def ip(self):
        return self._ip
    @property
    def ssid(self):
        return self._ssid
    def scan(self):
        """Scan for available networks. Returns list of (ssid, rssi) tuples."""
        if self._wlan is None:
            return []
        try:
            results = self._wlan.scan()
            networks = []
            for r in results:
                ssid = r[0].decode('utf-8') if isinstance(r[0], bytes) else r[0]
                rssi = r[3]
                if ssid:
                    networks.append((ssid, rssi))
            networks.sort(key=lambda x: x[1], reverse=True)
            return networks
        except Exception as e:
            print("[WiFi] Scan error: {}".format(e))
            return []
