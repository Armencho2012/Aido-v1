import machine
import gc
import os
import time
from config import (
    ENABLE_SD_CARD,
    SD_REQUIRED,
    SD_SPI_ID,
    SD_SCK_PIN,
    SD_MOSI_PIN,
    SD_MISO_PIN,
    SD_CS_PIN,
    SD_BAUDRATE,
    SD_MOUNT_POINT,
    SD_MOUNT_MARKER,
    WIFI_SSID,
    WIFI_PASS,
)
gc.enable()
gc.threshold(8192)
DEFAULT_CPU_FREQ = 125_000_000
BOOSTED_CPU_FREQ = 250_000_000
machine.freq(DEFAULT_CPU_FREQ)
print("[BOOT] CPU @ {}MHz".format(machine.freq() // 1_000_000))
print("[BOOT] Free RAM: {}KB".format(gc.mem_free() // 1024))
def _start_wifi_early():
    """Start joining WiFi as early as possible; the main app will reuse it."""
    if not WIFI_SSID:
        print("[WiFi] No SSID configured")
        return None
    try:
        import network
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        try:
            wlan.config(pm=0xa11140)
        except Exception:
            pass
        if wlan.isconnected():
            try:
                print("[WiFi] Early already connected: {}".format(wlan.ifconfig()[0]))
            except Exception:
                print("[WiFi] Early already connected")
            return wlan
        try:
            status = wlan.status()
        except Exception:
            status = 0
        if status == 1:
            print("[WiFi] Early connect already in progress")
            return wlan
        wlan.connect(WIFI_SSID, WIFI_PASS)
        print("[WiFi] Early connect started")
        return wlan
    except Exception as e:
        print("[WiFi] Early start failed:", e)
        return None
def _sd_marker_path():
    return "{}/{}".format(SD_MOUNT_POINT, SD_MOUNT_MARKER)
def _clear_stale_sd_marker():
    """Remove the marker from a plain /sd folder before mount probing."""
    try:
        os.remove(_sd_marker_path())
        print("[SD] Cleared stale mount marker")
    except Exception:
        pass
def _mark_sd_mounted():
    """Leave a tiny proof file so storage code knows /sd is a real mount."""
    try:
        with open(_sd_marker_path(), "w") as f:
            f.write("mounted\n")
        return True
    except Exception as e:
        print("[SD] Marker write failed:", e)
        return False
def _mount_sd_card():
    """Mount the SPI microSD card at boot if one is present."""
    if not ENABLE_SD_CARD:
        print("[SD] Disabled in config — using local storage")
        return False
    try:
        from sdcard import SDCard
    except Exception as e:
        print("[SD] Driver unavailable:", e)
        return False
    original_freq = machine.freq()
    machine.freq(DEFAULT_CPU_FREQ)
    try:
        sck = machine.Pin(SD_SCK_PIN, machine.Pin.OUT, value=0)
        mosi = machine.Pin(SD_MOSI_PIN, machine.Pin.OUT, value=1)
        miso = machine.Pin(SD_MISO_PIN, machine.Pin.IN, machine.Pin.PULL_UP)
        cs = machine.Pin(SD_CS_PIN, machine.Pin.OUT)
        cs.value(1)
        time.sleep_ms(80)
        print("[SD] Pins sck={} mosi={} miso={} cs={}".format(
            SD_SCK_PIN, SD_MOSI_PIN, SD_MISO_PIN, SD_CS_PIN))
        print("[SD] Idle MISO={}, CS={}".format(miso.value(), cs.value()))
        baudrates = []
        for baudrate in (100_000, 400_000, SD_BAUDRATE):
            if baudrate not in baudrates:
                baudrates.append(baudrate)
        for baudrate in baudrates:
            try:
                spi = machine.SPI(
                    SD_SPI_ID,
                    baudrate=baudrate,
                    polarity=0,
                    phase=0,
                    sck=sck,
                    mosi=mosi,
                    miso=miso,
                )
                spi.write(b"\xff" * 16)
                print("[SD] Probe MISO after clocks @ {}Hz: {}".format(
                    baudrate, miso.value()))
                sd = SDCard(spi, cs, baudrate=SD_BAUDRATE)
                try:
                    os.umount(SD_MOUNT_POINT)
                except Exception:
                    pass
                vfs = os.VfsFat(sd)
                os.mount(vfs, SD_MOUNT_POINT)
                _mark_sd_mounted()
                print("[SD] Mounted at {} init={}Hz bus={}Hz".format(
                    SD_MOUNT_POINT, baudrate, SD_BAUDRATE))
                try:
                    print("[SD] Files:", os.listdir(SD_MOUNT_POINT))
                except Exception:
                    pass
                return True
            except OSError as e:
                print("[SD] Init failed @ {}Hz: {}".format(baudrate, e))
            except Exception as e:
                print("[SD] Mount failed @ {}Hz: {}".format(baudrate, e))
        print("[SD] No usable card detected")
        return False
    except OSError as e:
        print("[SD] No card mounted:", e)
    except Exception as e:
        print("[SD] Mount failed:", e)
    finally:
        machine.freq(original_freq)
    return False
def _mount_builtin_sd_card():
    """Try MicroPython's native SDCard driver if this firmware provides it."""
    try:
        NativeSD = machine.SDCard
    except AttributeError:
        return False
    try:
        print("[SD] Trying native SDCard driver")
        sd = NativeSD(
            slot=SD_SPI_ID,
            sck=machine.Pin(SD_SCK_PIN),
            mosi=machine.Pin(SD_MOSI_PIN),
            miso=machine.Pin(SD_MISO_PIN, machine.Pin.IN, machine.Pin.PULL_UP),
            cs=machine.Pin(SD_CS_PIN),
            baudrate=SD_BAUDRATE,
        )
        try:
            os.umount(SD_MOUNT_POINT)
        except Exception:
            pass
        vfs = os.VfsFat(sd)
        os.mount(vfs, SD_MOUNT_POINT)
        _mark_sd_mounted()
        print("[SD] Mounted native at {}".format(SD_MOUNT_POINT))
        try:
            print("[SD] Files:", os.listdir(SD_MOUNT_POINT))
        except Exception:
            pass
        return True
    except Exception as e:
        print("[SD] Native failed:", e)
        return False
_sd_retry_count = 0
_SD_OPTIONAL_TRIES = 12
def _reset_sd_bus():
    try:
        machine.SPI(SD_SPI_ID).deinit()
    except Exception:
        pass
    try:
        machine.Pin(SD_CS_PIN, machine.Pin.OUT, value=1)
        machine.Pin(SD_SCK_PIN, machine.Pin.OUT, value=0)
        machine.Pin(SD_MOSI_PIN, machine.Pin.OUT, value=1)
        machine.Pin(SD_MISO_PIN, machine.Pin.IN, machine.Pin.PULL_UP)
    except Exception:
        pass
_clear_stale_sd_marker()
while True:
    if not ENABLE_SD_CARD:
        break
    if _sd_retry_count:
        print("[SD] Retry mount {}/{}".format(
            _sd_retry_count + 1,
            3 if SD_REQUIRED else _SD_OPTIONAL_TRIES,
        ))
    if _mount_sd_card() or _mount_builtin_sd_card():
        break
    _sd_retry_count += 1
    max_tries = 3 if SD_REQUIRED else _SD_OPTIONAL_TRIES
    if _sd_retry_count >= max_tries:
        if SD_REQUIRED:
            print("[SD] Required card unavailable after {} tries; stopping boot".format(
                _sd_retry_count
            ))
            raise OSError("Required SD card unavailable")
        print("[SD] Continuing without card after {} tries".format(_sd_retry_count))
        break
    print("[SD] Retrying mount in 500ms")
    _reset_sd_bus()
    time.sleep_ms(500)
machine.freq(BOOSTED_CPU_FREQ)
print("[BOOT] Boosted CPU @ {}MHz".format(machine.freq() // 1_000_000))
_start_wifi_early()
