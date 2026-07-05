import machine
import time
from vl53l0x import VL53L0X
import config
i2c = machine.SoftI2C(
    sda=machine.Pin(config.I2C_SDA_PIN),
    scl=machine.Pin(config.I2C_SCL_PIN),
    freq=100000
)
sensor = VL53L0X(i2c)
sensor.start_continuous()
start_time = time.ticks_ms()
duration = 5000
print("Starting sensor test for 5 seconds...")
while time.ticks_diff(time.ticks_ms(), start_time) < duration:
    try:
        distance = sensor.read_range_mm()
        print("Status: Active | Current Distance: {} mm".format(distance))
    except Exception as e:
        print("Status: Error | Details:", e)
    time.sleep(0.2)
sensor.stop_continuous()
print("Test complete. Sensor stopped.")
'''
Starting sensor test for 5 seconds...
Status: Active | Current Distance: 198 mm
Status: Active | Current Distance: 276 mm
Status: Active | Current Distance: 169 mm
Status: Active | Current Distance: 147 mm
Status: Active | Current Distance: 102 mm
Status: Active | Current Distance: 82 mm
Status: Active | Current Distance: 88 mm
Status: Active | Current Distance: 88 mm
Status: Active | Current Distance: 87 mm
Status: Active | Current Distance: 85 mm
Status: Active | Current Distance: 108 mm
Status: Active | Current Distance: 195 mm
Status: Active | Current Distance: 372 mm
Status: Active | Current Distance: 407 mm
Status: Active | Current Distance: 269 mm
Status: Active | Current Distance: 303 mm
Status: Active | Current Distance: 296 mm
Status: Active | Current Distance: 181 mm
Status: Active | Current Distance: 86 mm
Status: Active | Current Distance: 166 mm
Status: Active | Current Distance: 330 mm
Status: Active | Current Distance: 347 mm
Status: Active | Current Distance: 324 mm
Status: Active | Current Distance: 323 mm
Status: Active | Current Distance: 330 mm
'''
