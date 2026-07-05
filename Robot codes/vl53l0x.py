import time
_SYSRANGE_START = 0x00
_SYSTEM_SEQUENCE_CONFIG = 0x01
_SYSTEM_INTERMEASUREMENT_PERIOD = 0x04
_SYSTEM_INTERRUPT_CONFIG_GPIO = 0x0A
_SYSTEM_INTERRUPT_CLEAR = 0x0B
_RESULT_INTERRUPT_STATUS = 0x13
_MSRC_CONFIG_CONTROL = 0x60
_MSRC_CONFIG_TIMEOUT_MACROP = 0x46
_PRE_RANGE_CONFIG_VCSEL_PERIOD = 0x50
_PRE_RANGE_CONFIG_TIMEOUT_MACROP_HI = 0x51
_FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT = 0x44
_FINAL_RANGE_CONFIG_VCSEL_PERIOD = 0x70
_FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI = 0x71
_GPIO_HV_MUX_ACTIVE_HIGH = 0x84
_OSC_CALIBRATE_VAL = 0xF8
def _decode_timeout(value):
    return ((value & 0x00FF) << ((value & 0xFF00) >> 8)) + 1
def _encode_timeout(timeout_mclks):
    if timeout_mclks <= 0:
        return 0
    ls_byte = timeout_mclks - 1
    ms_byte = 0
    while (ls_byte & 0xFFFFFF00) > 0:
        ls_byte >>= 1
        ms_byte += 1
    return (ms_byte << 8) | (ls_byte & 0xFF)
def _timeout_mclks_to_us(timeout_mclks, vcsel_period_pclks):
    macro_period_ns = ((2304 * vcsel_period_pclks * 1655) + 500) // 1000
    return ((timeout_mclks * macro_period_ns) + 500) // 1000
def _timeout_us_to_mclks(timeout_us, vcsel_period_pclks):
    macro_period_ns = ((2304 * vcsel_period_pclks * 1655) + 500) // 1000
    return ((timeout_us * 1000) + (macro_period_ns // 2)) // macro_period_ns
class VL53L0X:
    DEFAULT_ADDRESS = 0x29
    def __init__(self, i2c, address=DEFAULT_ADDRESS, io_timeout_ms=200):
        self.i2c = i2c
        self.address = address
        self.io_timeout_ms = io_timeout_ms
        self._stop_variable = 0
        self._measurement_timing_budget_us = 0
        if self._read_u8(0xC0) != 0xEE:
            raise OSError("VL53L0X not found at 0x{:02X}".format(address))
        self._init_sensor()
    def _write_u8(self, reg, value):
        self.i2c.writeto_mem(self.address, reg, bytes((value & 0xFF,)))
    def _write_u16(self, reg, value):
        self.i2c.writeto_mem(
            self.address,
            reg,
            bytes(((value >> 8) & 0xFF, value & 0xFF)),
        )
    def _write_u32(self, reg, value):
        self.i2c.writeto_mem(
            self.address,
            reg,
            bytes(
                (
                    (value >> 24) & 0xFF,
                    (value >> 16) & 0xFF,
                    (value >> 8) & 0xFF,
                    value & 0xFF,
                )
            ),
        )
    def _read_u8(self, reg):
        return self.i2c.readfrom_mem(self.address, reg, 1)[0]
    def _read_u16(self, reg):
        data = self.i2c.readfrom_mem(self.address, reg, 2)
        return (data[0] << 8) | data[1]
    def _read_multi(self, reg, count):
        return bytearray(self.i2c.readfrom_mem(self.address, reg, count))
    def _write_multi(self, reg, data):
        self.i2c.writeto_mem(self.address, reg, bytes(data))
    def _wait_while(self, reg, mask, expected_nonzero=True):
        start = time.ticks_ms()
        while True:
            value = self._read_u8(reg)
            active = (value & mask) != 0
            if active == expected_nonzero:
                return
            if time.ticks_diff(time.ticks_ms(), start) > self.io_timeout_ms:
                raise OSError("VL53L0X timeout on reg 0x{:02X}".format(reg))
            time.sleep_ms(2)
    def _set_signal_rate_limit(self, limit_mcps):
        self._write_u16(
            _FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT,
            int(limit_mcps * 128),
        )
    def _get_spad_info(self):
        self._write_u8(0x80, 0x01)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x00, 0x00)
        self._write_u8(0xFF, 0x06)
        self._write_u8(0x83, self._read_u8(0x83) | 0x04)
        self._write_u8(0xFF, 0x07)
        self._write_u8(0x81, 0x01)
        self._write_u8(0x80, 0x01)
        self._write_u8(0x94, 0x6B)
        self._write_u8(0x83, 0x00)
        start = time.ticks_ms()
        while self._read_u8(0x83) == 0x00:
            if time.ticks_diff(time.ticks_ms(), start) > self.io_timeout_ms:
                raise OSError("VL53L0X SPAD timeout")
            time.sleep_ms(2)
        self._write_u8(0x83, 0x01)
        tmp = self._read_u8(0x92)
        count = tmp & 0x7F
        is_aperture = (tmp >> 7) & 0x01
        self._write_u8(0x81, 0x00)
        self._write_u8(0xFF, 0x06)
        self._write_u8(0x83, self._read_u8(0x83) & ~0x04)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x00, 0x01)
        self._write_u8(0xFF, 0x00)
        self._write_u8(0x80, 0x00)
        return count, is_aperture
    def _get_vcsel_pulse_period(self, final_range=False):
        reg = _FINAL_RANGE_CONFIG_VCSEL_PERIOD if final_range else _PRE_RANGE_CONFIG_VCSEL_PERIOD
        return (self._read_u8(reg) + 1) << 1
    def _get_sequence_step_enables(self):
        sequence_config = self._read_u8(_SYSTEM_SEQUENCE_CONFIG)
        return {
            "tcc": (sequence_config >> 4) & 0x1,
            "dss": (sequence_config >> 3) & 0x1,
            "msrc": (sequence_config >> 2) & 0x1,
            "pre_range": (sequence_config >> 6) & 0x1,
            "final_range": (sequence_config >> 7) & 0x1,
        }
    def _get_sequence_step_timeouts(self, enables):
        pre_vcsel = self._get_vcsel_pulse_period(False)
        msrc_mclks = self._read_u8(_MSRC_CONFIG_TIMEOUT_MACROP) + 1
        pre_range_mclks = _decode_timeout(self._read_u16(_PRE_RANGE_CONFIG_TIMEOUT_MACROP_HI))
        final_vcsel = self._get_vcsel_pulse_period(True)
        final_range_mclks = _decode_timeout(self._read_u16(_FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI))
        if enables["pre_range"]:
            final_range_mclks -= pre_range_mclks
        return {
            "msrc_dss_tcc_us": _timeout_mclks_to_us(msrc_mclks, pre_vcsel),
            "pre_range_us": _timeout_mclks_to_us(pre_range_mclks, pre_vcsel),
            "final_range_us": _timeout_mclks_to_us(final_range_mclks, final_vcsel),
            "pre_range_mclks": pre_range_mclks,
            "final_vcsel": final_vcsel,
        }
    def _set_measurement_timing_budget(self, budget_us):
        start_overhead = 1320
        end_overhead = 960
        msrc_overhead = 660
        tcc_overhead = 590
        dss_overhead = 690
        pre_overhead = 660
        final_overhead = 550
        enables = self._get_sequence_step_enables()
        timeouts = self._get_sequence_step_timeouts(enables)
        used_budget_us = start_overhead + end_overhead
        if enables["tcc"]:
            used_budget_us += timeouts["msrc_dss_tcc_us"] + tcc_overhead
        if enables["dss"]:
            used_budget_us += 2 * (timeouts["msrc_dss_tcc_us"] + dss_overhead)
        elif enables["msrc"]:
            used_budget_us += timeouts["msrc_dss_tcc_us"] + msrc_overhead
        if enables["pre_range"]:
            used_budget_us += timeouts["pre_range_us"] + pre_overhead
        if not enables["final_range"] or used_budget_us + final_overhead > budget_us:
            return False
        final_range_timeout_us = budget_us - used_budget_us - final_overhead
        final_range_timeout_mclks = _timeout_us_to_mclks(
            final_range_timeout_us,
            timeouts["final_vcsel"],
        )
        if enables["pre_range"]:
            final_range_timeout_mclks += timeouts["pre_range_mclks"]
        self._write_u16(
            _FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI,
            _encode_timeout(final_range_timeout_mclks),
        )
        self._measurement_timing_budget_us = budget_us
        return True
    def _perform_single_ref_calibration(self, vhv_init_byte):
        self._write_u8(_SYSRANGE_START, 0x01 | vhv_init_byte)
        self._wait_while(_RESULT_INTERRUPT_STATUS, 0x07, expected_nonzero=True)
        self._write_u8(_SYSTEM_INTERRUPT_CLEAR, 0x01)
        self._write_u8(_SYSRANGE_START, 0x00)
    def _init_sensor(self):
        self._write_u8(0x88, 0x00)
        self._write_u8(0x80, 0x01)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x00, 0x00)
        self._stop_variable = self._read_u8(0x91)
        self._write_u8(0x00, 0x01)
        self._write_u8(0xFF, 0x00)
        self._write_u8(0x80, 0x00)
        self._write_u8(_MSRC_CONFIG_CONTROL, self._read_u8(_MSRC_CONFIG_CONTROL) | 0x12)
        self._set_signal_rate_limit(0.25)
        self._write_u8(_SYSTEM_SEQUENCE_CONFIG, 0xFF)
        spad_count, is_aperture = self._get_spad_info()
        ref_spad_map = self._read_multi(0xB0, 6)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x4F, 0x00)
        self._write_u8(0x4E, 0x2C)
        self._write_u8(0xFF, 0x00)
        self._write_u8(0xB6, 0xB4)
        first_spad = 12 if is_aperture else 0
        enabled = 0
        for i in range(48):
            if i < first_spad or enabled == spad_count:
                ref_spad_map[i // 8] &= ~(1 << (i % 8))
            elif (ref_spad_map[i // 8] >> (i % 8)) & 0x01:
                enabled += 1
        self._write_multi(0xB0, ref_spad_map)
        tuning = (
            (0xFF, 0x01), (0x00, 0x00), (0xFF, 0x00), (0x09, 0x00),
            (0x10, 0x00), (0x11, 0x00), (0x24, 0x01), (0x25, 0xFF),
            (0x75, 0x00), (0xFF, 0x01), (0x4E, 0x2C), (0x48, 0x00),
            (0x30, 0x20), (0xFF, 0x00), (0x30, 0x09), (0x54, 0x00),
            (0x31, 0x04), (0x32, 0x03), (0x40, 0x83), (0x46, 0x25),
            (0x60, 0x00), (0x27, 0x00), (0x50, 0x06), (0x51, 0x00),
            (0x52, 0x96), (0x56, 0x08), (0x57, 0x30), (0x61, 0x00),
            (0x62, 0x00), (0x64, 0x00), (0x65, 0x00), (0x66, 0xA0),
            (0xFF, 0x01), (0x22, 0x32), (0x47, 0x14), (0x49, 0xFF),
            (0x4A, 0x00), (0xFF, 0x00), (0x7A, 0x0A), (0x7B, 0x00),
            (0x78, 0x21), (0xFF, 0x01), (0x23, 0x34), (0x42, 0x00),
            (0x44, 0xFF), (0x45, 0x26), (0x46, 0x05), (0x40, 0x40),
            (0x0E, 0x06), (0x20, 0x1A), (0x43, 0x40), (0xFF, 0x00),
            (0x34, 0x03), (0x35, 0x44), (0xFF, 0x01), (0x31, 0x04),
            (0x4B, 0x09), (0x4C, 0x05), (0x4D, 0x04), (0xFF, 0x00),
            (0x44, 0x00), (0x45, 0x20), (0x47, 0x08), (0x48, 0x28),
            (0x67, 0x00), (0x70, 0x04), (0x71, 0x01), (0x72, 0xFE),
            (0x76, 0x00), (0x77, 0x00), (0xFF, 0x01), (0x0D, 0x01),
            (0xFF, 0x00), (0x80, 0x01), (0x01, 0xF8), (0xFF, 0x01),
            (0x8E, 0x01), (0x00, 0x01), (0xFF, 0x00), (0x80, 0x00),
        )
        for reg, value in tuning:
            self._write_u8(reg, value)
        self._write_u8(_SYSTEM_INTERRUPT_CONFIG_GPIO, 0x04)
        self._write_u8(_GPIO_HV_MUX_ACTIVE_HIGH, self._read_u8(_GPIO_HV_MUX_ACTIVE_HIGH) & ~0x10)
        self._write_u8(_SYSTEM_INTERRUPT_CLEAR, 0x01)
        self._write_u8(_SYSTEM_SEQUENCE_CONFIG, 0xE8)
        self._set_measurement_timing_budget(33000)
        self._write_u8(_SYSTEM_SEQUENCE_CONFIG, 0x01)
        self._perform_single_ref_calibration(0x40)
        self._write_u8(_SYSTEM_SEQUENCE_CONFIG, 0x02)
        self._perform_single_ref_calibration(0x00)
        self._write_u8(_SYSTEM_SEQUENCE_CONFIG, 0xE8)
    def start_continuous(self, period_ms=0):
        self._write_u8(0x80, 0x01)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x00, 0x00)
        self._write_u8(0x91, self._stop_variable)
        self._write_u8(0x00, 0x01)
        self._write_u8(0xFF, 0x00)
        self._write_u8(0x80, 0x00)
        if period_ms:
            osc = self._read_u16(_OSC_CALIBRATE_VAL)
            if osc:
                period_ms *= osc
            self._write_u32(_SYSTEM_INTERMEASUREMENT_PERIOD, period_ms)
            self._write_u8(_SYSRANGE_START, 0x04)
        else:
            self._write_u8(_SYSRANGE_START, 0x02)
    def stop_continuous(self):
        self._write_u8(_SYSRANGE_START, 0x01)
        self._write_u8(0xFF, 0x01)
        self._write_u8(0x00, 0x00)
        self._write_u8(0x91, 0x00)
        self._write_u8(0x00, 0x01)
        self._write_u8(0xFF, 0x00)
    def read_range_mm(self):
        self._wait_while(_RESULT_INTERRUPT_STATUS, 0x07, expected_nonzero=True)
        distance = self._read_u16(0x1E)
        self._write_u8(_SYSTEM_INTERRUPT_CLEAR, 0x01)
        return distance
