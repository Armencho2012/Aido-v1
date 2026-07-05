import network
import time
SSID = ""
PASSWORD = ""
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(SSID, PASSWORD)
    print("Connecting to WiFi", end="")
    timeout = 10
    start = time.time()
    while not wlan.isconnected():
        if time.time() - start > timeout:
            print("\nFailed to connect (timeout).")
            return None
        print(".", end="")
        time.sleep(0.5)
    print("\nConnected!")
    print("IP address:", wlan.ifconfig()[0])
    return wlan
if __name__ == "__main__":
    wlan = connect_wifi()
    if wlan:
        print("Pico W is online and ready.")
    else:
        print("Pico W is NOT connected. Check credentials/signal.")
'''
Connecting to WiFi.......
Connected!
IP address: 10.73.216.137
Pico W is online and ready.
'''
