'''
==================================================
  WATCHDOG / CRASH RECOVERY TEST
==================================================
[WDT] Marker file found from previous run!
[WDT] Reset cause code: 3
[WDT] Confirmed: last reset was caused by the WATCHDOG.
RESULT: Starved watchdog test PASSED (board reset as expected).
[WDT] Marker file cleaned up.
'''
import machine
import time
import os
MARKER_FILE = "wdt_test_marker.txt"
WDT_TIMEOUT_MS = 3000
def run_fed_test():
    """Confirms the WDT does NOT reset the board if properly fed."""
    print("[WDT] --- Test 1: Fed watchdog (should NOT reset) ---")
    print("[WDT] Starting WDT with {} ms timeout".format(WDT_TIMEOUT_MS))
    wdt = machine.WDT(timeout=WDT_TIMEOUT_MS)
    for i in range(6):
        wdt.feed()
        print("[WDT] Fed watchdog, iteration {} (elapsed ~{} ms)".format(i + 1, i * 800))
        time.sleep_ms(800)
    print("[WDT] Completed 6 feed cycles over ~4.8s with a 3s timeout.")
    print("[WDT] If you're reading this, the fed watchdog did NOT reset the board. PASS.")
    print("[WDT] Note: WDT is now active and unfeedable from here without a reset.\n")
def run_starve_test():
    """
    Confirms the WDT DOES reset the board if not fed.
    Writes a marker file before starting so we can detect the reset
    happened on the next boot.
    """
    print("[WDT] --- Test 2: Starved watchdog (SHOULD reset the board) ---")
    with open(MARKER_FILE, "w") as f:
        f.write("armed")
    print("[WDT] Marker file written: {}".format(MARKER_FILE))
    print("[WDT] Starting WDT with {} ms timeout".format(WDT_TIMEOUT_MS))
    print("[WDT] NOT feeding it — board should reset in ~{} ms...\n".format(WDT_TIMEOUT_MS))
    wdt = machine.WDT(timeout=WDT_TIMEOUT_MS)
    while True:
        print("[WDT] Simulating a hung loop (no feed)...")
        time.sleep_ms(500)
def check_marker_after_reset():
    """Call this at the top of the test file (before run()) to detect
    whether we just rebooted from a starved-watchdog test."""
    try:
        os.stat(MARKER_FILE)
        reset_cause = machine.reset_cause()
        print("\n[WDT] Marker file found from previous run!")
        print("[WDT] Reset cause code: {}".format(reset_cause))
        if reset_cause == machine.WDT_RESET:
            print("[WDT] Confirmed: last reset was caused by the WATCHDOG.")
            print("RESULT: Starved watchdog test PASSED (board reset as expected).")
        else:
            print("[WDT] Reset cause was NOT the watchdog (code {}).".format(reset_cause))
            print("RESULT: Starved watchdog test INCONCLUSIVE (unexpected reset cause).")
        os.remove(MARKER_FILE)
        print("[WDT] Marker file cleaned up.\n")
        return True
    except OSError:
        return False
def run():
    print("\n" + "=" * 50)
    print("  WATCHDOG / CRASH RECOVERY TEST")
    print("=" * 50)
    if check_marker_after_reset():
        return
    run_fed_test()
    print("[WDT] Now starting the STARVE test. The board WILL reset itself")
    print("[WDT] in about {} seconds. Re-run this same script after reboot".format(WDT_TIMEOUT_MS / 1000))
    print("[WDT] to see the confirmation message.\n")
    time.sleep(2)
    run_starve_test()
if __name__ == "__main__":
    run()
