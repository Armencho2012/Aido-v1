'''
========================================
  WIFI -> TTS SERVER ROUND-TRIP TEST
========================================
[WIFI] Already connected: 10.73.216.137
[TTS] Sending request to: https://aido-voice.vercel.app/api/voice
[TTS] Payload text: This is a test of the text to speech server.
[TTS] Status code: 200
[TTS] Round-trip time: 843 ms
[TTS] Content-Type: audio/wav
[TTS] Response size: 48044 bytes
[TTS] Response looks like a valid WAV file.
RESULT: WiFi -> TTS round-trip PASSED.
'''
import network
import time
import urequests
from config import (
    WIFI_SSID,
    WIFI_PASS,
    WIFI_TIMEOUT_S,
    TTS_SERVER_HOST,
    TTS_SERVER_PATH,
)
TEST_TEXT = "This is a test of the text to speech server."
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        print("[WIFI] Already connected:", wlan.ifconfig()[0])
        return wlan
    wlan.connect(WIFI_SSID, WIFI_PASS)
    print("[WIFI] Connecting to {}...".format(WIFI_SSID), end="")
    start = time.time()
    while not wlan.isconnected():
        if time.time() - start > WIFI_TIMEOUT_S:
            print("\n[WIFI] Connection timed out.")
            return None
        print(".", end="")
        time.sleep(0.5)
    print("\n[WIFI] Connected:", wlan.ifconfig()[0])
    return wlan
def test_tts_request():
    url = "https://{}{}".format(TTS_SERVER_HOST, TTS_SERVER_PATH)
    print("[TTS] Sending request to:", url)
    print("[TTS] Payload text:", TEST_TEXT)
    start = time.ticks_ms()
    try:
        response = urequests.post(
            url,
            json={"text": TEST_TEXT},
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        print("[TTS] Request failed:", e)
        return False
    elapsed = time.ticks_diff(time.ticks_ms(), start)
    print("[TTS] Status code:", response.status_code)
    print("[TTS] Round-trip time: {} ms".format(elapsed))
    content_type = response.headers.get("Content-Type", "unknown")
    print("[TTS] Content-Type:", content_type)
    body = response.content
    print("[TTS] Response size: {} bytes".format(len(body)))
    response.close()
    if response.status_code != 200:
        print("[TTS] Non-200 status code.")
        return False
    if len(body) < 100:
        print("[TTS] Response too small to be valid audio.")
        return False
    if body[0:4] == b"RIFF":
        print("[TTS] Response looks like a valid WAV file.")
    else:
        print("[TTS] Warning: response doesn't start with RIFF header.")
    return True
def run():
    print("\n" + "=" * 40)
    print("  WIFI -> TTS SERVER ROUND-TRIP TEST")
    print("=" * 40)
    wlan = connect_wifi()
    if wlan is None:
        print("RESULT: FAILED (WiFi did not connect).")
        return
    success = test_tts_request()
    if success:
        print("\nRESULT: WiFi -> TTS round-trip PASSED.")
    else:
        print("\nRESULT: WiFi -> TTS round-trip FAILED.")
if __name__ == "__main__":
    run()
