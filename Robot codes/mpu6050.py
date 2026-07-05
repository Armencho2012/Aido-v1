"""
╔══════════════════════════════════════════════════════╗
║          AIDO OS — MPU-6050 Motion Driver             ║
║     Full 6-DOF IMU with Kalman-lite Filtering        ║
╚══════════════════════════════════════════════════════╝
"""
import struct
import time
_PWR_MGMT_1   = 0x6B
_PWR_MGMT_2   = 0x6C
_SMPLRT_DIV   = 0x19
_CONFIG        = 0x1A
_GYRO_CONFIG   = 0x1B
_ACCEL_CONFIG  = 0x1C
_INT_ENABLE    = 0x38
_ACCEL_XOUT_H  = 0x3B
_TEMP_OUT_H    = 0x41
_GYRO_XOUT_H   = 0x43
_WHO_AM_I      = 0x75
class MPU6050:
    """
    Premium MPU-6050 driver with:
    - Exponential moving average filtering
    - Tilt angle computation
    - Temperature reading
    - Auto-calibration on init
    """
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self._buf6 = bytearray(6)
        self._buf14 = bytearray(14)
        self.ax = 0.0
        self.ay = 0.0
        self.az = 0.0
        self.gx = 0.0
        self.gy = 0.0
        self.gz = 0.0
        self.temp = 0.0
        self._ax_off = 0.0
        self._ay_off = 0.0
        self._az_off = 0.0
        self._gx_off = 0.0
        self._gy_off = 0.0
        self._gz_off = 0.0
        self._alpha = 0.3
        self._available = False
        self._init_sensor()
    def _init_sensor(self):
        """Initialize and configure the MPU-6050."""
        try:
            who = self._read_byte(_WHO_AM_I)
            if who != 0x68 and who != 0x98:
                print("[MPU] Warning: Unexpected WHO_AM_I: 0x{:02X}".format(who))
            self._write_byte(_PWR_MGMT_1, 0x00)
            time.sleep_ms(100)
            self._write_byte(_PWR_MGMT_1, 0x01)
            time.sleep_ms(10)
            self._write_byte(_SMPLRT_DIV, 0x04)
            self._write_byte(_CONFIG, 0x03)
            self._write_byte(_ACCEL_CONFIG, 0x00)
            self._write_byte(_GYRO_CONFIG, 0x00)
            self._available = True
            print("[MPU] Initialized OK")
            self._calibrate()
        except OSError:
            self._available = False
            print("[MPU] Not found — running in virtual mode")
    @property
    def available(self):
        return self._available
    def _read_byte(self, reg):
        return self.i2c.readfrom_mem(self.addr, reg, 1)[0]
    def _write_byte(self, reg, val):
        self.i2c.writeto_mem(self.addr, reg, bytes([val]))
    def _read_raw(self):
        """Read all 14 bytes (accel + temp + gyro) in one burst."""
        self.i2c.readfrom_mem_into(self.addr, _ACCEL_XOUT_H, self._buf14)
        raw_ax = struct.unpack_from('>h', self._buf14, 0)[0]
        raw_ay = struct.unpack_from('>h', self._buf14, 2)[0]
        raw_az = struct.unpack_from('>h', self._buf14, 4)[0]
        raw_temp = struct.unpack_from('>h', self._buf14, 6)[0]
        raw_gx = struct.unpack_from('>h', self._buf14, 8)[0]
        raw_gy = struct.unpack_from('>h', self._buf14, 10)[0]
        raw_gz = struct.unpack_from('>h', self._buf14, 12)[0]
        return raw_ax, raw_ay, raw_az, raw_temp, raw_gx, raw_gy, raw_gz
    def _calibrate(self, samples=50):
        """Collect samples at rest and compute offsets."""
        print("[MPU] Calibrating...")
        sax = say = saz = sgx = sgy = sgz = 0.0
        success_samples = 0
        for _ in range(samples):
            try:
                rax, ray, raz, _, rgx, rgy, rgz = self._read_raw()
                sax += rax
                say += ray
                saz += raz
                sgx += rgx
                sgy += rgy
                sgz += rgz
                success_samples += 1
            except OSError:
                continue
            time.sleep_ms(5)
        if success_samples == 0:
            print("[MPU] Calibration skipped (Bus Busy)")
            return
        n = float(success_samples)
        self._ax_off = sax / n
        self._ay_off = say / n
        self._az_off = (saz / n) - 16384.0
        self._gx_off = sgx / n
        self._gy_off = sgy / n
        self._gz_off = sgz / n
        print("[MPU] Calibration complete")
    def update(self):
        """Read sensor and apply EMA filter. Call once per frame."""
        if not self._available:
            return
        try:
            rax, ray, raz, rtemp, rgx, rgy, rgz = self._read_raw()
        except OSError:
            self._available = False
            return
        a = 1.0 - self._alpha
        new_ax = (rax - self._ax_off) / 16384.0
        new_ay = (ray - self._ay_off) / 16384.0
        new_az = (raz - self._az_off) / 16384.0
        new_gx = (rgx - self._gx_off) / 131.0
        new_gy = (rgy - self._gy_off) / 131.0
        new_gz = (rgz - self._gz_off) / 131.0
        self.ax = self.ax * self._alpha + new_ax * a
        self.ay = self.ay * self._alpha + new_ay * a
        self.az = self.az * self._alpha + new_az * a
        self.gx = self.gx * self._alpha + new_gx * a
        self.gy = self.gy * self._alpha + new_gy * a
        self.gz = self.gz * self._alpha + new_gz * a
        self.temp = rtemp / 340.0 + 36.53
    def get_tilt_xy(self):
        """
        Get tilt in X,Y as normalized -1.0 to 1.0 values.
        Useful for driving eye position.
        """
        if not self._available:
            return 0.0, 0.0
        tx = max(-1.0, min(1.0, self.ax))
        ty = max(-1.0, min(1.0, self.ay))
        return tx, ty
    def get_motion_magnitude(self):
        """Get overall motion intensity (0.0 = still, higher = more movement)."""
        if not self._available:
            return 0.0
        return abs(self.gx) + abs(self.gy) + abs(self.gz)
class VirtualMPU:
    """Fallback when no MPU-6050 is connected. Provides gentle idle animation."""
    def __init__(self):
        self.ax = 0.0
        self.ay = 0.0
        self.az = 1.0
        self.gx = 0.0
        self.gy = 0.0
        self.gz = 0.0
        self.temp = 25.0
        self._available = False
        self._t = 0
    @property
    def available(self):
        return False
    def update(self):
        """Generate gentle sine-wave idle movement."""
        import math
        self._t += 1
        self.ax = math.sin(self._t * 0.02) * 0.15
        self.ay = math.cos(self._t * 0.015) * 0.1
    def get_tilt_xy(self):
        return self.ax, self.ay
    def get_motion_magnitude(self):
        return 0.0
