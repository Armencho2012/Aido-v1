import network
import socket
import time
import gc
import os
import struct
try:
    import ujson as json
except ImportError:
    import json
from config import WIFI_SSID, WIFI_PASS, TTS_SERVER_HOST, TTS_SERVER_PATH, WELCOME_TEXT, SD_WELCOME_WAV
from storage_paths import runtime_welcome_path
_WIFI_STAT_CONNECTING = 1
def _connect_wifi(timeout_s=15):
    """
    Blocking WiFi connect used only at boot (before the main loop starts).
    Returns True if connected, False on timeout.
    """
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    try:
        wlan.config(pm=0xa11140)
    except Exception:
        pass
    if wlan.isconnected():
        print("[TTS] WiFi already connected: {}".format(wlan.ifconfig()[0]))
        return wlan, True
    try:
        status = wlan.status()
    except Exception:
        status = 0
    if status == _WIFI_STAT_CONNECTING:
        print("[TTS] Waiting for WiFi connect...")
    else:
        print("[TTS] Connecting to '{}'...".format(WIFI_SSID))
        wlan.connect(WIFI_SSID, WIFI_PASS)
    deadline = time.ticks_add(time.ticks_ms(), timeout_s * 1000)
    while not wlan.isconnected():
        if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
            print("[TTS] WiFi timeout")
            return wlan, False
        time.sleep_ms(200)
    print("[TTS] Connected: {}".format(wlan.ifconfig()[0]))
    return wlan, True
def _normalise_lang(lang):
    """Keep the wire format simple for the Vercel TTS proxy."""
    lang = (lang or "en").strip()
    if not lang:
        return "en"
    return lang
def _local_fallback_path(filename):
    if isinstance(filename, str) and filename.startswith("/sd/"):
        return filename.split("/")[-1]
    return filename
def _build_request(text, lang="en"):
    """Build a raw HTTP POST request string."""
    body_bytes = json.dumps({"text": text, "lang": _normalise_lang(lang)}).encode("utf-8")
    request = (
        "POST {} HTTP/1.0\r\n"
        "Host: {}\r\n"
        "Content-Type: application/json\r\n"
        "X-Client: robot\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(TTS_SERVER_PATH, TTS_SERVER_HOST, len(body_bytes))
    return request.encode("utf-8") + body_bytes
def fetch_tts_to_file(text, output_file, lang="en"):
    gc.collect()
    wlan, ok = _connect_wifi(timeout_s=10)
    if not ok:
        print("[TTS] Skipping TTS — no WiFi")
        return False
    try:
        addr = socket.getaddrinfo(TTS_SERVER_HOST, 443)[0][-1]
    except Exception as e:
        print("[TTS] DNS failed:", e)
        return False
    sock = None
    try:
        import ssl
        raw_sock = socket.socket()
        raw_sock.settimeout(20)
        raw_sock.connect(addr)
        sock = ssl.wrap_socket(raw_sock, server_hostname=TTS_SERVER_HOST)
        request = _build_request(text, lang)
        sock.write(request)
        tmp_file = output_file + ".tmp"
        fallback_file = output_file.split("/")[-1]
        fallback_tmp = fallback_file + ".tmp"
        header_buf = b""
        body_start = b""
        while b"\r\n\r\n" not in header_buf:
            chunk = sock.read(1024)
            if not chunk:
                return False
            header_buf += chunk
        headers_raw, _, body_start = header_buf.partition(b"\r\n\r\n")
        status = 200
        try:
            first_line = headers_raw.split(b"\r\n")[0]
            status = int(first_line.split(b" ")[1])
        except Exception:
            pass
        if status != 200:
            return False
        total = 0
        active_tmp = tmp_file
        try:
            f = open(active_tmp, "wb")
        except OSError:
            active_tmp = fallback_tmp
            f = open(active_tmp, "wb")
        with f:
            if body_start:
                f.write(body_start)
                total += len(body_start)
            while True:
                chunk = sock.read(512)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
        meta = _inspect_wav_file(active_tmp)
        if not meta or total < 1024:
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return False
        try:
            try:
                os.remove(output_file)
            except Exception:
                pass
            os.rename(active_tmp, output_file)
        except Exception:
            try:
                os.rename(active_tmp, fallback_file)
            except Exception:
                return False
        return True
    except Exception:
        return False
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
def _inspect_wav_file(filename):
    """Return WAV metadata dict or None if the file is invalid."""
    try:
        with open(filename, "rb") as f:
            header = f.read(44)
            if len(header) < 44:
                return None
            if header[0:4] != b"RIFF" or header[8:12] != b"WAVE":
                return None
            return {
                "rate": struct.unpack("<I", header[24:28])[0],
                "channels": struct.unpack("<H", header[22:24])[0],
                "bits": struct.unpack("<H", header[34:36])[0],
            }
    except Exception:
        return None
def fetch_and_save_welcome(output_file=SD_WELCOME_WAV, lang="en"):
    """
    Main entry point called at boot:
    1. Connect to WiFi (blocking, short timeout)
    2. POST welcome text to TTS server
    3. Stream WAV response → save to output_file
    4. Returns True on success, False on any failure
    """
    gc.collect()
    if not output_file:
        output_file = runtime_welcome_path()
    wlan, ok = _connect_wifi(timeout_s=15)
    if not ok:
        print("[TTS] Skipping TTS — no WiFi")
        return False
    try:
        print("[TTS] Resolving {}...".format(TTS_SERVER_HOST))
        addr = socket.getaddrinfo(TTS_SERVER_HOST, 443)[0][-1]
    except Exception as e:
        print("[TTS] DNS failed:", e)
        return False
    sock = None
    try:
        import ssl
        raw_sock = socket.socket()
        raw_sock.settimeout(20)
        raw_sock.connect(addr)
        sock = ssl.wrap_socket(raw_sock, server_hostname=TTS_SERVER_HOST)
        request = _build_request(WELCOME_TEXT, lang)
        print("[TTS] Sending request ({} bytes)...".format(len(request)))
        sock.write(request)
        print("[TTS] Streaming response safely...")
        header_buf = b""
        body_start = b""
        while b"\r\n\r\n" not in header_buf:
            chunk = sock.read(1024)
            if not chunk:
                print("[TTS] Server closed early")
                return False
            header_buf += chunk
        headers_raw, _, body_start = header_buf.partition(b"\r\n\r\n")
        status = 200
        try:
            first_line = headers_raw.split(b"\r\n")[0]
            status = int(first_line.split(b" ")[1])
        except Exception:
            pass
        if status != 200:
            print("[TTS] Server error: HTTP {}".format(status))
            try:
                print("[TTS] Server said:", body_start.decode("utf-8")[:200])
            except:
                pass
            return False
        total = 0
        chunk_size = 512
        active_output = output_file
        active_tmp = output_file + ".tmp"
        try:
            f = open(active_tmp, "wb")
        except OSError:
            fallback_output = _local_fallback_path(output_file)
            if fallback_output == output_file:
                raise
            active_output = fallback_output
            active_tmp = fallback_output + ".tmp"
            print("[TTS] Welcome SD write failed, falling back local")
            f = open(active_tmp, "wb")
        with f:
            if body_start:
                f.write(body_start)
                total += len(body_start)
            while True:
                chunk = sock.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
                print(".", end="")
        meta = _inspect_wav_file(active_tmp)
        if not meta:
            print("\n[TTS] Invalid WAV downloaded; deleting temp file")
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return False
        if total < 1024:
            print("\n[TTS] Response too small; deleting temp file")
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return False
        if meta["bits"] != 16 or meta["rate"] != 22050 or meta["channels"] != 1:
            print(
                "\n[TTS] Rejecting unsafe WAV: {}Hz, {}bit, {}ch".format(
                    meta["rate"], meta["bits"], meta["channels"]
                )
            )
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return False
        try:
            try:
                os.remove(active_output)
            except Exception:
                pass
            os.rename(active_tmp, active_output)
        except Exception as e:
            print("\n[TTS] Could not replace {}: {}".format(active_output, e))
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return False
        print(
            "\n[TTS] Saved {} bytes → {} ({}Hz, {}bit, {}ch)".format(
                total, active_output, meta["rate"], meta["bits"], meta["channels"]
            )
        )
        gc.collect()
        return total > 44
    except Exception as e:
        print("[TTS] Fetch failed:", e)
        return False
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
