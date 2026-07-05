import machine
import time
from config import I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQ
print("\n" + "=" * 40)
print("  MPU6050 TEST (vertical mount)")
print("=" * 40)
i2c = machine.SoftI2C(
    sda=machine.Pin(I2C_SDA_PIN),
    scl=machine.Pin(I2C_SCL_PIN),
    freq=I2C_FREQ
)
print("[I2C] Scanning bus...")
devices = i2c.scan()
print("[I2C] Found {} device(s): {}".format(
    len(devices),
    ["0x{:02X}".format(d) for d in devices]
))
mpu = None
if 0x68 not in devices:
    print("[MPU] Not found at 0x68. Check wiring.")
else:
    try:
        from mpu6050 import MPU6050
        mpu = MPU6050(i2c)
        print("[MPU] Initialized OK")
    except Exception as e:
        print("[MPU] Init failed:", e)
        mpu = None
def detect_gravity_axis():
    """Take a resting sample and figure out which axis reads ~1g.
    Returns (axis_name, sign) e.g. ('x', 1) or ('y', -1)."""
    ax, ay, az = mpu.get_accel()
    readings = {"x": ax, "y": ay, "z": az}
    axis = max(readings, key=lambda k: abs(readings[k]))
    sign = 1 if readings[axis] >= 0 else -1
    print("[MPU] Calibration sample: x={:.2f} y={:.2f} z={:.2f}".format(ax, ay, az))
    print("[MPU] Detected gravity axis: {}{}".format("-" if sign < 0 else "", axis.upper()))
    return axis, sign
def run(duration_s=5):
    if mpu is None:
        print("RESULT: MPU6050 init FAILED (no sensor object created).")
        return
    print("[MPU] Keep the robot still for calibration...")
    time.sleep(1)
    mpu.update()
    readings = {"x": mpu.ax, "y": mpu.ay, "z": mpu.az}
    axis = max(readings, key=lambda k: abs(readings[k]))
    sign = 1 if readings[axis] >= 0 else -1
    print("[MPU] Detected gravity axis: {}{}".format("-" if sign < 0 else "", axis.upper()))
    print("[MPU] Streaming accel/gyro for {} seconds. Move the robot around.\n".format(duration_s))
    start = time.ticks_ms()
    samples = 0
    while time.ticks_diff(time.ticks_ms(), start) < duration_s * 1000:
        try:
            mpu.update()
            ax, ay, az = mpu.ax, mpu.ay, mpu.az
            gx, gy, gz = mpu.gx, mpu.gy, mpu.gz
            up_value = {"x": ax, "y": ay, "z": az}[axis] * sign
            print("accel(x={:.2f} y={:.2f} z={:.2f})  up-axis={:.2f}  gyro(x={:.1f} y={:.1f} z={:.1f})".format(
                ax, ay, az, up_value, gx, gy, gz
            ))
            samples += 1
        except Exception as e:
            print("[MPU] Read error:", e)
        time.sleep_ms(150)
    if samples:
        print("\nRESULT: MPU6050 PASSED ({} samples read).".format(samples))
    else:
        print("RESULT: MPU6050 FAILED (no valid readings).")
if __name__ == "__main__":
    run()
'''
========================================
  MPU6050 TEST (vertical mount)
========================================
[I2C] Scanning bus...
[I2C] Found 3 device(s): ['0x29', '0x3C', '0x68']
[MPU] Initialized OK
[MPU] Calibrating...
[MPU] Calibration complete
[MPU] Initialized OK
[MPU] Keep the robot still for calibration...
[MPU] Detected gravity axis: Z
[MPU] Streaming accel/gyro for 5 seconds. Move the robot around.
accel(x=-0.01 y=0.05 z=0.82)  up-axis=0.82  gyro(x=-31.4 y=-15.2 z=-0.2)
accel(x=-0.05 y=0.01 z=0.79)  up-axis=0.79  gyro(x=-14.5 y=-33.6 z=-17.5)
accel(x=-0.07 y=0.02 z=0.71)  up-axis=0.71  gyro(x=-12.2 y=-43.9 z=4.2)
accel(x=-0.13 y=-0.01 z=0.62)  up-axis=0.62  gyro(x=-7.4 y=-53.2 z=12.7)
accel(x=-0.15 y=0.02 z=0.63)  up-axis=0.63  gyro(x=-6.7 y=28.8 z=-15.4)
accel(x=-0.03 y=0.09 z=0.67)  up-axis=0.67  gyro(x=9.1 y=41.6 z=12.8)
accel(x=0.05 y=0.02 z=0.83)  up-axis=0.83  gyro(x=1.4 y=24.5 z=-9.0)
accel(x=-0.00 y=-0.02 z=0.87)  up-axis=0.87  gyro(x=-28.0 y=5.9 z=27.6)
accel(x=0.06 y=-0.14 z=0.87)  up-axis=0.87  gyro(x=-8.0 y=-1.2 z=-16.7)
accel(x=-0.03 y=-0.13 z=0.92)  up-axis=0.92  gyro(x=-7.2 y=11.6 z=-15.3)
accel(x=0.01 y=-0.15 z=0.94)  up-axis=0.94  gyro(x=-16.7 y=15.3 z=9.0)
accel(x=-0.03 y=-0.21 z=0.97)  up-axis=0.97  gyro(x=-8.9 y=2.0 z=20.9)
accel(x=-0.10 y=-0.10 z=1.00)  up-axis=1.00  gyro(x=-6.1 y=17.9 z=11.6)
accel(x=-0.12 y=-0.10 z=0.97)  up-axis=0.97  gyro(x=-23.9 y=7.3 z=-25.4)
accel(x=-0.06 y=-0.08 z=0.90)  up-axis=0.90  gyro(x=-26.1 y=-8.6 z=-13.4)
accel(x=0.01 y=-0.06 z=0.88)  up-axis=0.88  gyro(x=-5.1 y=-10.1 z=-15.4)
accel(x=0.06 y=-0.17 z=0.86)  up-axis=0.86  gyro(x=-12.6 y=-28.2 z=-21.2)
accel(x=0.01 y=-0.08 z=0.87)  up-axis=0.87  gyro(x=2.7 y=-12.8 z=27.1)
accel(x=0.01 y=-0.13 z=0.87)  up-axis=0.87  gyro(x=-15.3 y=-19.6 z=3.9)
accel(x=0.01 y=-0.14 z=0.81)  up-axis=0.81  gyro(x=-2.1 y=8.9 z=15.3)
accel(x=-0.05 y=-0.13 z=0.86)  up-axis=0.86  gyro(x=1.1 y=11.8 z=-6.4)
accel(x=0.01 y=-0.15 z=0.90)  up-axis=0.90  gyro(x=16.5 y=-2.0 z=2.6)
accel(x=-0.00 y=-0.17 z=0.90)  up-axis=0.90  gyro(x=15.6 y=4.7 z=4.3)
accel(x=-0.09 y=-0.15 z=0.98)  up-axis=0.98  gyro(x=12.6 y=-0.0 z=-4.1)
accel(x=-0.09 y=-0.08 z=1.08)  up-axis=1.08  gyro(x=8.9 y=4.6 z=0.5)
accel(x=-0.04 y=-0.15 z=1.10)  up-axis=1.10  gyro(x=-4.5 y=-6.5 z=19.1)
accel(x=-0.05 y=-0.20 z=1.10)  up-axis=1.10  gyro(x=-25.3 y=-15.8 z=-10.6)
accel(x=-0.03 y=-0.09 z=0.96)  up-axis=0.96  gyro(x=-46.0 y=9.2 z=-18.1)
accel(x=-0.05 y=-0.11 z=0.87)  up-axis=0.87  gyro(x=-50.3 y=2.5 z=2.5)
accel(x=0.01 y=0.01 z=0.73)  up-axis=0.73  gyro(x=-66.2 y=-58.4 z=-0.8)
accel(x=-0.03 y=0.05 z=0.47)  up-axis=0.47  gyro(x=-64.3 y=-74.0 z=-13.0)
accel(x=-0.13 y=0.14 z=0.38)  up-axis=0.38  gyro(x=-36.4 y=-77.6 z=13.5)
accel(x=-0.30 y=0.10 z=0.32)  up-axis=0.32  gyro(x=-48.7 y=-96.0 z=-17.8)
RESULT: MPU6050 PASSED (33 samples read).
'''
