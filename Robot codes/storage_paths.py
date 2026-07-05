import os
import time
try:
    from config import (
        FORCE_LOCAL_STORAGE,
        SD_MOUNT_MARKER,
        SD_MOUNT_POINT,
        VOICE_LOCAL_AUDIO,
        VOICE_RECORD_LOCAL,
        VOICE_REPLY_LOCAL,
    )
except Exception:
    FORCE_LOCAL_STORAGE = False
    SD_MOUNT_MARKER = ".aido_sd_mounted"
    SD_MOUNT_POINT = "/sd"
    VOICE_LOCAL_AUDIO = True
    VOICE_RECORD_LOCAL = True
    VOICE_REPLY_LOCAL = True
_sd_seen = False
_sd_misses = 0
_SD_MISS_LIMIT = 4
def _sleep_ms(ms):
    try:
        time.sleep_ms(ms)
    except AttributeError:
        time.sleep(ms / 1000.0)
def _marker_exists():
    try:
        os.stat("{}/{}".format(SD_MOUNT_POINT, SD_MOUNT_MARKER))
        return True
    except OSError:
        return False
def sd_available():
    if FORCE_LOCAL_STORAGE:
        return False
    global _sd_seen, _sd_misses
    for _ in range(3):
        if _marker_exists():
            _sd_seen = True
            _sd_misses = 0
            return True
        _sleep_ms(10)
    if _sd_seen and _sd_misses < _SD_MISS_LIMIT:
        _sd_misses += 1
        return True
    return False
def audio_path(sd_path, local_name):
    return sd_path if sd_available() else local_name
def runtime_welcome_path():
    return audio_path("/sd/welcome.wav", "welcome.wav")
def runtime_voice_in_path():
    if VOICE_LOCAL_AUDIO or VOICE_RECORD_LOCAL:
        return "voice_in.wav"
    return audio_path("/sd/voice_in.wav", "voice_in.wav")
def runtime_voice_reply_path():
    if VOICE_LOCAL_AUDIO or VOICE_REPLY_LOCAL:
        return "voice_reply.wav"
    return audio_path("/sd/voice_reply.wav", "voice_reply.wav")
def runtime_flashcards_path():
    return audio_path("/sd/flashcards.json", "flashcards.json")
def runtime_quiz_path():
    return audio_path("/sd/quiz.json", "quiz.json")
def runtime_analyse_path():
    return audio_path("/sd/analyse.json", "analyse.json")
def runtime_map_path():
    return audio_path("/sd/map.json", "map.json")
