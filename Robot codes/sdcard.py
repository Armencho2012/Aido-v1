"""
MicroPython driver for SD cards using SPI bus.
Supports FAT16/FAT32 formatted cards.
"""
import time
_CMD_TIMEOUT = 100
_TOKEN_TIMEOUT = 600
_R1_IDLE_STATE = 1 << 0
_R1_ILLEGAL_COMMAND = 1 << 2
_TOKEN_CMD25 = 0xFC
_TOKEN_STOP_TRAN = 0xFD
_TOKEN_DATA = 0xFE
class SDCard:
    def __init__(self, spi, cs, baudrate=1320000):
        self.spi = spi
        self.cs = cs
        self.cmdbuf = bytearray(6)
        self.dummybuf = bytearray(512)
        self.tokenbuf = bytearray(1)
        for i in range(512):
            self.dummybuf[i] = 0xFF
        self.dummybuf_memoryview = memoryview(self.dummybuf)
        self.init_card(baudrate)
    def init_spi(self, baudrate):
        try:
            master = self.spi.MASTER
        except AttributeError:
            self.spi.init(baudrate=baudrate, phase=0, polarity=0)
        else:
            self.spi.init(master, baudrate=baudrate, phase=0, polarity=0)
    def init_card(self, baudrate):
        self.cs.init(self.cs.OUT, value=1)
        self.init_spi(100000)
        for i in range(16):
            self.spi.write(b"\xff")
        for _ in range(20):
            self.cs.value(1)
            self.spi.write(b"\xff" * 4)
            time.sleep_ms(10)
            if self.cmd(0, 0, 0x95) == _R1_IDLE_STATE:
                break
        else:
            raise OSError("no SD card")
        r = self.cmd(8, 0x01AA, 0x87, 4)
        if r == _R1_IDLE_STATE:
            self.init_card_v2()
        elif r == (_R1_IDLE_STATE | _R1_ILLEGAL_COMMAND):
            self.init_card_v1()
        else:
            raise OSError("couldn't determine SD card version")
        if self.cmd(9, 0, 0, 0, False) != 0:
            raise OSError("no response from SD card")
        csd = bytearray(16)
        self.readinto(csd)
        if csd[0] & 0xC0 == 0x40:
            self.sectors = ((csd[8] << 8 | csd[9]) + 1) * 1024
        elif csd[0] & 0xC0 == 0x00:
            c_size = (csd[6] & 0b11) << 10 | csd[7] << 2 | csd[8] >> 6
            c_size_mult = (csd[9] & 0b11) << 1 | csd[10] >> 7
            read_bl_len = csd[5] & 0b1111
            capacity = (c_size + 1) * (2 ** (c_size_mult + 2)) * (2**read_bl_len)
            self.sectors = capacity // 512
        else:
            raise OSError("SD card CSD format not supported")
        if self.cmd(16, 512, 0) != 0:
            raise OSError("can't set 512 block size")
        self.init_spi(baudrate)
    def init_card_v1(self):
        for i in range(_CMD_TIMEOUT):
            self.cmd(55, 0, 0)
            if self.cmd(41, 0, 0) == 0:
                self.cdv = 512
                return
        raise OSError("timeout waiting for v1 card")
    def init_card_v2(self):
        for i in range(_CMD_TIMEOUT):
            time.sleep_ms(50)
            self.cmd(58, 0, 0, 4)
            self.cmd(55, 0, 0)
            if self.cmd(41, 0x40000000, 0) == 0:
                self.cmd(58, 0, 0, 4)
                self.cdv = 1
                return
        raise OSError("timeout waiting for v2 card")
    def cmd(self, cmd, arg, crc, final=0, release=True, skip1=False):
        self.cs.value(0)
        buf = self.cmdbuf
        buf[0] = 0x40 | cmd
        buf[1] = arg >> 24
        buf[2] = arg >> 16
        buf[3] = arg >> 8
        buf[4] = arg
        buf[5] = crc
        self.spi.write(buf)
        if skip1:
            self.spi.readinto(self.tokenbuf, 0xFF)
        for i in range(_CMD_TIMEOUT):
            self.spi.readinto(self.tokenbuf, 0xFF)
            response = self.tokenbuf[0]
            if not (response & 0x80):
                for j in range(final):
                    self.spi.write(b"\xff")
                if release:
                    self.cs.value(1)
                    self.spi.write(b"\xff")
                return response
        self.cs.value(1)
        self.spi.write(b"\xff")
        return -1
    def readinto(self, buf):
        self.cs.value(0)
        for i in range(_TOKEN_TIMEOUT):
            self.spi.readinto(self.tokenbuf, 0xFF)
            if self.tokenbuf[0] == _TOKEN_DATA:
                break
        else:
            self.cs.value(1)
            self.spi.write(b"\xff")
            raise OSError("timeout waiting for response")
        mv = self.dummybuf_memoryview
        if len(buf) != 512:
            mv = mv[: len(buf)]
        self.spi.write_readinto(mv, buf)
        self.spi.write(b"\xff\xff")
        self.cs.value(1)
        self.spi.write(b"\xff")
    def write(self, token, buf):
        self.cs.value(0)
        self.spi.read(1, token)
        self.spi.write(buf)
        self.spi.write(b"\xff\xff")
        if (self.spi.read(1, 0xFF)[0] & 0x1F) != 0x05:
            self.cs.value(1)
            return
        while self.spi.read(1, 0xFF)[0] == 0:
            pass
        self.cs.value(1)
        self.spi.write(b"\xff")
    def write_token(self, token):
        self.cs.value(0)
        self.spi.read(1, token)
        self.spi.write(b"\xff")
        while self.spi.read(1, 0xFF)[0] == 0x00:
            pass
        self.cs.value(1)
        self.spi.write(b"\xff")
    def readblocks(self, block_num, buf):
        nblocks = len(buf) // 512
        assert nblocks and not len(buf) % 512, "Buffer length is invalid"
        offset = 0
        mv = memoryview(buf)
        while nblocks:
            if self.cmd(17, block_num * self.cdv, 0, release=False) != 0:
                raise OSError("read error")
            self.readinto(mv[offset : offset + 512])
            block_num += 1
            offset += 512
            nblocks -= 1
    def writeblocks(self, block_num, buf):
        nblocks, err = divmod(len(buf), 512)
        assert nblocks and not err, "Buffer length is invalid"
        if nblocks == 1:
            if self.cmd(24, block_num * self.cdv, 0) != 0:
                raise OSError("write error")
            self.write(_TOKEN_DATA, buf)
        else:
            if self.cmd(25, block_num * self.cdv, 0) != 0:
                raise OSError("write error")
            offset = 0
            mv = memoryview(buf)
            while nblocks:
                self.write(_TOKEN_CMD25, mv[offset : offset + 512])
                offset += 512
                nblocks -= 1
            self.write_token(_TOKEN_STOP_TRAN)
    def ioctl(self, op, arg):
        if op == 4:
            return self.sectors
