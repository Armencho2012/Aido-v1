import gc
import os
import socket
import struct
import time
try:
    import ubinascii as binascii
except ImportError:
    import binascii
from config import TTS_SERVER_HOST, TTS_SERVER_PATH, WIFI_PASS, WIFI_SSID, SD_VOICE_REPLY_WAV, VOICE_DEBUG
from storage_paths import runtime_voice_reply_path
try:
    import network
except ImportError:
    network = None
_UPLOAD_CHUNK = 512
_DOWNLOAD_CHUNK = 1024
_HEADER_CHUNK = 96
_HEADER_LIMIT = 1024
_STREAM_START_BUFFER = 8192
_PARSE_TRANSCRIPT_HEADER = True
_PARSE_REPLY_HEADER = False
_MIN_FREE_BEFORE_NET = 38000
_MAX_HEADER_VALUE = 384
_MAX_JSON_RESPONSE = 12000
_VOICE_TOTAL_TIMEOUT_MS = 55000
_VOICE_SOCKET_TIMEOUT_S = 55
_REPLY_RATE = 22050
_REPLY_CHANNELS = 1
_REPLY_BITS = 16
_WIFI_STAT_CONNECTING = 1
def _free_ram():
    try:
        return gc.mem_free()
    except Exception:
        return None
def _low_mem(message):
    free = _free_ram()
    if free is None:
        print("[VOICE] Low RAM:", message)
    else:
        print("[VOICE] Low RAM: {} ({} bytes free)".format(message, free))
    return {"ok": False, "error": "low_mem"}
def _is_enomem(exc):
    try:
        if exc.args and exc.args[0] == 12:
            return True
    except Exception:
        pass
    try:
        return "ENOMEM" in str(exc)
    except Exception:
        return False
def _json_module():
    try:
        import ujson as json
    except ImportError:
        import json
    return json
def warm_wifi():
    if network is None:
        return False
    try:
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        try:
            wlan.config(pm=0xA11140)
        except Exception:
            pass
        if wlan.isconnected():
            try:
                if VOICE_DEBUG:
                    print("[VOICE] WiFi already warm:", wlan.ifconfig()[0])
            except Exception:
                if VOICE_DEBUG:
                    print("[VOICE] WiFi already warm")
        else:
            try:
                status = wlan.status()
            except Exception:
                status = 0
            if status == _WIFI_STAT_CONNECTING:
                if VOICE_DEBUG:
                    print("[VOICE] WiFi warm connect in progress")
            else:
                wlan.connect(WIFI_SSID, WIFI_PASS)
                if VOICE_DEBUG:
                    print("[VOICE] WiFi warm connect started")
        return True
    except Exception:
        return False
def _connect_wifi(timeout_s=15):
    if network is None:
        return None, False
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    try:
        wlan.config(pm=0xA11140)
    except Exception:
        pass
    if wlan.isconnected():
        try:
            if VOICE_DEBUG:
                print("[VOICE] WiFi OK:", wlan.ifconfig()[0])
        except Exception:
            pass
        return wlan, True
    try:
        status = wlan.status()
    except Exception:
        status = 0
    if status == _WIFI_STAT_CONNECTING:
        if VOICE_DEBUG:
            print("[VOICE] Waiting for WiFi connect...")
    else:
        try:
            if status < 0:
                wlan.disconnect()
                time.sleep_ms(100)
        except Exception:
            pass
        if VOICE_DEBUG:
            print("[VOICE] Reconnecting WiFi...")
        wlan.connect(WIFI_SSID, WIFI_PASS)
    deadline = time.ticks_add(time.ticks_ms(), timeout_s * 1000)
    while not wlan.isconnected():
        if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
            return wlan, False
        time.sleep_ms(200)
    try:
        if VOICE_DEBUG:
            print("[VOICE] WiFi reconnected:", wlan.ifconfig()[0])
    except Exception:
        pass
    return wlan, True
def _inspect_wav_file(filename):
    try:
        with open(filename, "rb") as f:
            header = f.read(12)
            if len(header) < 12:
                return None
            if header[0:4] != b"RIFF" or header[8:12] != b"WAVE":
                return None
            while True:
                chunk_header = f.read(8)
                if len(chunk_header) < 8:
                    return None
                chunk_id = chunk_header[0:4]
                chunk_size = struct.unpack("<I", chunk_header[4:8])[0]
                if chunk_id == b"fmt ":
                    fmt_data = f.read(chunk_size)
                    if len(fmt_data) < 16:
                        return None
                    return {
                        "channels": struct.unpack("<H", fmt_data[2:4])[0],
                        "rate": struct.unpack("<I", fmt_data[4:8])[0],
                        "bits": struct.unpack("<H", fmt_data[14:16])[0],
                    }
                f.seek(chunk_size, 1)
    except Exception:
        return None
def _read_with_deadline(sock, size, deadline_ms):
    while True:
        if time.ticks_diff(deadline_ms, time.ticks_ms()) <= 0:
            raise OSError("VOICE timeout")
        chunk = sock.read(size)
        if chunk is not None:
            return chunk
        time.sleep_ms(20)
def _readinto_with_deadline(sock, buf, deadline_ms):
    while True:
        if time.ticks_diff(deadline_ms, time.ticks_ms()) <= 0:
            raise OSError("VOICE timeout")
        try:
            n = sock.readinto(buf)
        except (AttributeError, TypeError):
            chunk = sock.read(len(buf))
            if chunk is None:
                n = None
            elif chunk:
                buf[:len(chunk)] = chunk
                n = len(chunk)
            else:
                n = 0
        if n is not None:
            return n
        time.sleep_ms(20)
def _read_response_head(sock, deadline_ms):
    header = bytearray(_HEADER_LIMIT)
    scratch = bytearray(_HEADER_CHUNK)
    mv = memoryview(scratch)
    used = 0
    while used < _HEADER_LIMIT:
        n = _readinto_with_deadline(sock, mv, deadline_ms)
        if not n:
            return None, b""
        for i in range(n):
            if used >= _HEADER_LIMIT:
                raise OSError("VOICE headers too large")
            header[used] = scratch[i]
            used += 1
            if (
                used >= 4
                and header[used - 4] == 13
                and header[used - 3] == 10
                and header[used - 2] == 13
                and header[used - 1] == 10
            ):
                body_len = n - i - 1
                body_start = b""
                if body_len:
                    body_start = bytes(scratch[i + 1:i + 1 + body_len])
                return bytes(memoryview(header)[:used - 4]), body_start
    raise OSError("VOICE headers too large")
def _ascii_name_eq(buf, start, end, name):
    if end - start != len(name):
        return False
    for i in range(len(name)):
        c = buf[start + i]
        if 65 <= c <= 90:
            c += 32
        if c != name[i]:
            return False
    return True
def _trim_range(buf, start, end):
    while start < end and buf[start] in (9, 32):
        start += 1
    while end > start and buf[end - 1] in (9, 32):
        end -= 1
    return start, end
def _contains_ascii_ci(buf, start, end, word):
    span = end - start
    size = len(word)
    if size > span:
        return False
    last = end - size
    pos = start
    while pos <= last:
        ok = True
        for i in range(size):
            c = buf[pos + i]
            if 65 <= c <= 90:
                c += 32
            if c != word[i]:
                ok = False
                break
        if ok:
            return True
        pos += 1
    return False
def _header_text(buf, start, end, max_chars=80):
    start, end = _trim_range(buf, start, end)
    if end - start > max_chars:
        end = start + max_chars
    try:
        return bytes(memoryview(buf)[start:end]).decode("utf-8")
    except Exception:
        return ""
def _header_b64_text(buf, start, end, max_chars=160):
    start, end = _trim_range(buf, start, end)
    if end - start > _MAX_HEADER_VALUE:
        return ""
    try:
        raw = bytes(memoryview(buf)[start:end])
        return binascii.a2b_base64(raw).decode("utf-8")[:max_chars]
    except Exception:
        return ""
def _parse_response_info(headers_raw):
    info = {
        "status": 200,
        "content_length": None,
        "chunked": False,
        "intent": "",
        "transcript": "",
        "reply_text": "",
        "server_timing": "",
    }
    try:
        start = 0
        end = headers_raw.find(b"\r\n")
        if end < 0:
            end = len(headers_raw)
        first_space = headers_raw.find(b" ", 0, end)
        if first_space >= 0 and first_space + 4 <= end:
            try:
                info["status"] = int(bytes(memoryview(headers_raw)[first_space + 1:first_space + 4]))
            except Exception:
                pass
        start = end + 2
        while start < len(headers_raw):
            end = headers_raw.find(b"\r\n", start)
            if end < 0:
                end = len(headers_raw)
            colon = headers_raw.find(b":", start, end)
            if colon > start:
                value_start = colon + 1
                value_end = end
                if _ascii_name_eq(headers_raw, start, colon, b"content-length"):
                    value_start, value_end = _trim_range(headers_raw, value_start, value_end)
                    try:
                        info["content_length"] = int(bytes(memoryview(headers_raw)[value_start:value_end]))
                    except Exception:
                        pass
                elif _ascii_name_eq(headers_raw, start, colon, b"transfer-encoding"):
                    info["chunked"] = _contains_ascii_ci(headers_raw, value_start, value_end, b"chunked")
                elif _ascii_name_eq(headers_raw, start, colon, b"x-intent"):
                    info["intent"] = _header_text(headers_raw, value_start, value_end, 24)
                elif _PARSE_TRANSCRIPT_HEADER and _ascii_name_eq(headers_raw, start, colon, b"x-transcript-b64"):
                    info["transcript"] = _header_b64_text(headers_raw, value_start, value_end, 160)
                elif _PARSE_REPLY_HEADER and _ascii_name_eq(headers_raw, start, colon, b"x-reply-text-b64"):
                    info["reply_text"] = _header_b64_text(headers_raw, value_start, value_end, 200)
                elif _PARSE_REPLY_HEADER and _ascii_name_eq(headers_raw, start, colon, b"x-server-timing"):
                    info["server_timing"] = _header_text(headers_raw, value_start, value_end, 240)
            start = end + 2
    except Exception:
        pass
    return info
def _read_chunked_body(sock, first_body, out_file, deadline_ms):
    pending = first_body
    total = 0
    while True:
        while b"\r\n" not in pending:
            chunk = _read_with_deadline(sock, 1024, deadline_ms)
            if not chunk:
                raise OSError("VOICE chunk header truncated")
            pending += chunk
        line, _, pending = pending.partition(b"\r\n")
        size_hex = line.split(b";", 1)[0].strip()
        chunk_size = int(size_hex or b"0", 16)
        if chunk_size == 0:
            return total
        needed = chunk_size + 2
        while len(pending) < needed:
            chunk = _read_with_deadline(sock, 2048, deadline_ms)
            if not chunk:
                raise OSError("VOICE chunk body truncated")
            pending += chunk
        out_file.write(pending[:chunk_size])
        total += chunk_size
        pending = pending[needed:]
def _header_int(headers, key):
    try:
        value = headers.get(key)
        if not value:
            return None
        try:
            return int(value)
        except TypeError:
            return int(value.decode("utf-8"))
    except Exception:
        return None
def _read_fixed_body(sock, first_body, out_file, content_length, deadline_ms):
    total = 0
    if first_body:
        n = min(len(first_body), content_length)
        if n:
            out_file.write(first_body[:n])
            total += n
    buf = bytearray(_DOWNLOAD_CHUNK)
    mv = memoryview(buf)
    while total < content_length:
        remaining = content_length - total
        view = mv if remaining > _DOWNLOAD_CHUNK else mv[:remaining]
        n = _readinto_with_deadline(sock, view, deadline_ms)
        if not n:
            raise OSError("VOICE body truncated")
        out_file.write(mv[:n])
        total += n
    return total
def _take_pending(sock, pending, size, deadline_ms):
    while len(pending) < size:
        chunk = _read_with_deadline(sock, max(1024, size - len(pending)), deadline_ms)
        if not chunk:
            raise OSError("VOICE stream header truncated")
        pending += chunk
    return pending[:size], pending[size:]
def _discard_pending(sock, pending, size, deadline_ms):
    remaining = size
    while remaining > 0:
        if pending:
            n = min(len(pending), remaining)
            pending = pending[n:]
            remaining -= n
        else:
            chunk = _read_with_deadline(
                sock,
                _DOWNLOAD_CHUNK if remaining > _DOWNLOAD_CHUNK else remaining,
                deadline_ms
            )
            if not chunk:
                raise OSError("VOICE stream body truncated")
            remaining -= len(chunk)
    return pending
def _parse_wav_stream_header(sock, pending, content_length, deadline_ms):
    consumed = 0
    header, pending = _take_pending(sock, pending, 12, deadline_ms)
    consumed += 12
    if header[0:4] != b"RIFF" or header[8:12] != b"WAVE":
        raise OSError("VOICE reply is not WAV")
    meta = {
        "riff_size": struct.unpack("<I", header[4:8])[0],
        "channels": 0,
        "rate": 0,
        "bits": 0,
        "data_size": 0,
    }
    while True:
        chunk_header, pending = _take_pending(sock, pending, 8, deadline_ms)
        consumed += 8
        chunk_id = chunk_header[0:4]
        chunk_size = struct.unpack("<I", chunk_header[4:8])[0]
        if chunk_id == b"fmt ":
            size_with_pad = chunk_size + (chunk_size & 1)
            fmt_data, pending = _take_pending(sock, pending, size_with_pad, deadline_ms)
            consumed += size_with_pad
            if chunk_size < 16:
                raise OSError("VOICE bad WAV fmt")
            meta["channels"] = struct.unpack("<H", fmt_data[2:4])[0]
            meta["rate"] = struct.unpack("<I", fmt_data[4:8])[0]
            meta["bits"] = struct.unpack("<H", fmt_data[14:16])[0]
        elif chunk_id == b"data":
            data_size = chunk_size
            if content_length is not None:
                real_size = max(0, content_length - consumed)
                if data_size == 0xFFFFFFFF or data_size > real_size:
                    data_size = real_size
            meta["data_size"] = data_size
            meta["data_start"] = consumed
            return meta, pending
        else:
            size_with_pad = chunk_size + (chunk_size & 1)
            pending = _discard_pending(sock, pending, size_with_pad, deadline_ms)
            consumed += size_with_pad
def _notify_playback_start(callback):
    if not callback:
        return
    try:
        gc.enable()
        gc.collect()
    except Exception:
        pass
    try:
        callback()
    except Exception as e:
        print("[VOICE] Playback UI skipped:", e)
    try:
        gc.disable()
    except Exception:
        pass
def _stream_wav_body_to_audio(sock, body_start, response_headers, audio, deadline_ms,
                              on_playback_start=None):
    content_length = _header_int(response_headers, b"content-length")
    meta, pending = _parse_wav_stream_header(sock, body_start, content_length, deadline_ms)
    if (
        meta.get("rate") != _REPLY_RATE
        or meta.get("channels") != _REPLY_CHANNELS
        or meta.get("bits") != _REPLY_BITS
    ):
        raise OSError("VOICE unsafe WAV stream")
    data_size = meta.get("data_size") or 0
    bpf = meta["channels"] * 2
    skip_bytes = (meta["rate"] * getattr(audio, "wav_lead_trim_ms", 0) // 1000) * bpf
    skip_bytes -= skip_bytes % bpf
    if data_size and skip_bytes > data_size:
        skip_bytes = 0
    if skip_bytes:
        pending = _discard_pending(sock, pending, skip_bytes, deadline_ms)
        data_size -= skip_bytes
    target_buffer = min(data_size, _STREAM_START_BUFFER)
    if target_buffer and not isinstance(pending, bytearray):
        pending = bytearray(pending)
    while len(pending) < target_buffer:
        need = target_buffer - len(pending)
        chunk = _read_with_deadline(
            sock,
            _DOWNLOAD_CHUNK if need > _DOWNLOAD_CHUNK else need,
            deadline_ms
        )
        if not chunk:
            raise OSError("VOICE stream preroll truncated")
        pending.extend(chunk)
    if not audio.start_wav_stream(meta["rate"], meta["channels"], meta["bits"]):
        raise OSError("VOICE audio stream failed")
    started_audio = time.ticks_ms()
    playback_started = False
    total_audio = 0
    try:
        while pending and data_size > 0:
            n = min(len(pending), data_size, _DOWNLOAD_CHUNK)
            if not playback_started:
                playback_started = True
                started_audio = time.ticks_ms()
                _notify_playback_start(on_playback_start)
            audio.write_wav_stream(pending[:n], n)
            pending = pending[n:]
            data_size -= n
            total_audio += n
        buf = bytearray(_DOWNLOAD_CHUNK)
        mv = memoryview(buf)
        while data_size > 0:
            view = mv if data_size > _DOWNLOAD_CHUNK else mv[:data_size]
            n = _readinto_with_deadline(sock, view, deadline_ms)
            if not n:
                raise OSError("VOICE stream body truncated")
            if not playback_started:
                playback_started = True
                started_audio = time.ticks_ms()
                _notify_playback_start(on_playback_start)
            audio.write_wav_stream(mv, n)
            data_size -= n
            total_audio += n
    finally:
        audio.finish_wav_stream()
    return total_audio, time.ticks_diff(time.ticks_ms(), started_audio), started_audio
def _parse_headers(headers_raw):
    headers = {}
    try:
        start = headers_raw.find(b"\r\n")
        if start < 0:
            return headers
        start += 2
        while start < len(headers_raw):
            end = headers_raw.find(b"\r\n", start)
            if end < 0:
                end = len(headers_raw)
            colon = headers_raw.find(b":", start, end)
            if colon > start:
                key = headers_raw[start:colon].strip().lower()
                value = headers_raw[colon + 1:end].strip()
                if len(value) <= _MAX_HEADER_VALUE:
                    headers[key] = value
            start = end + 2
    except Exception:
        pass
    return headers
def _decode_b64_json(value):
    if not value:
        return None
    if len(value) > _MAX_HEADER_VALUE:
        print("[VOICE] Study pack too large; skipped")
        return None
    try:
        raw = binascii.a2b_base64(value)
        return _json_module().loads(raw.decode("utf-8"))
    except Exception:
        return None
def _decode_b64_text(value):
    if not value:
        return ""
    if len(value) > _MAX_HEADER_VALUE:
        return ""
    try:
        text = binascii.a2b_base64(value).decode("utf-8")
        return text[:512]
    except Exception:
        return ""
def _local_fallback_path(filename):
    if isinstance(filename, str) and filename.startswith("/sd/"):
        return filename.split("/")[-1]
    return filename
def _resolve_existing_file(filename):
    try:
        os.stat(filename)
        return filename
    except OSError:
        pass
    fallback = _local_fallback_path(filename)
    if fallback != filename:
        try:
            os.stat(fallback)
            print("[VOICE] Falling back to local input", fallback)
            return fallback
        except OSError:
            pass
    return filename
def fetch_voice_reply(input_wav, output_file=SD_VOICE_REPLY_WAV, stream_audio=None,
                      on_playback_start=None):
    gc.collect()
    input_wav = _resolve_existing_file(input_wav)
    if not output_file:
        output_file = runtime_voice_reply_path()
    try:
        file_size = os.stat(input_wav)[6]
    except OSError as e:
        print("[VOICE] Input WAV missing:", e)
        return {"ok": False, "error": "input_missing"}
    _, ok = _connect_wifi(timeout_s=6)
    if not ok:
        print("[VOICE] No WiFi")
        return {"ok": False, "error": "wifi"}
    gc.collect()
    free = _free_ram()
    if free is not None:
        if VOICE_DEBUG:
            print("[VOICE] RAM before net:", free)
        if free < _MIN_FREE_BEFORE_NET:
            return _low_mem("before upload")
    boundary = "----AIDO{}".format(time.ticks_ms())
    preamble = (
        "--{b}\r\n"
        "Content-Disposition: form-data; name=\"audio\"; filename=\"audio.wav\"\r\n"
        "Content-Type: audio/wav\r\n"
        "\r\n"
    ).format(b=boundary).encode("utf-8")
    epilogue = ("\r\n--{}--\r\n".format(boundary)).encode("utf-8")
    content_length = len(preamble) + file_size + len(epilogue)
    request_headers = (
        "POST {} HTTP/1.0\r\n"
        "Host: {}\r\n"
        "X-Client: robot\r\n"
        "Content-Type: multipart/form-data; boundary={}\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(
        TTS_SERVER_PATH,
        TTS_SERVER_HOST,
        boundary,
        content_length
    ).encode("utf-8")
    try:
        import ssl
    except MemoryError:
        return _low_mem("loading SSL")
    except Exception as e:
        print("[VOICE] SSL unavailable:", e)
        return False
    sock = None
    raw_sock = None
    phase = "start"
    try:
        deadline_ms = time.ticks_add(time.ticks_ms(), _VOICE_TOTAL_TIMEOUT_MS)
        started_ms = time.ticks_ms()
        step_ms = started_ms
        phase = "dns"
        addr = socket.getaddrinfo(TTS_SERVER_HOST, 443)[0][-1]
        dns_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        phase = "socket"
        raw_sock = socket.socket()
        raw_sock.settimeout(20)
        step_ms = time.ticks_ms()
        phase = "tcp"
        raw_sock.connect(addr)
        tcp_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        step_ms = time.ticks_ms()
        phase = "tls"
        sock = ssl.wrap_socket(raw_sock, server_hostname=TTS_SERVER_HOST)
        try:
            del raw_sock
        except Exception:
            pass
        tls_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        free = _free_ram()
        if free is not None:
            if VOICE_DEBUG:
                print("[VOICE] RAM after TLS:", free)
        try:
            sock.settimeout(_VOICE_SOCKET_TIMEOUT_S)
        except Exception:
            pass
        if VOICE_DEBUG:
            print("[VOICE] Uploading {} bytes to {}".format(file_size, TTS_SERVER_HOST))
        step_ms = time.ticks_ms()
        phase = "upload headers"
        sock.write(request_headers)
        sock.write(preamble)
        with open(input_wav, "rb") as f:
            try:
                upload_buf = bytearray(_UPLOAD_CHUNK)
            except MemoryError:
                return _low_mem("upload buffer")
            upload_mv = memoryview(upload_buf)
            phase = "upload body"
            while True:
                n = f.readinto(upload_buf)
                if not n:
                    break
                sock.write(upload_mv[:n])
        try:
            del upload_mv
            del upload_buf
        except Exception:
            pass
        phase = "upload finish"
        sock.write(epilogue)
        try:
            del request_headers
            del preamble
            del epilogue
        except Exception:
            pass
        gc.collect()
        upload_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        free = _free_ram()
        if free is not None:
            if VOICE_DEBUG:
                print("[VOICE] RAM after upload:", free)
        if VOICE_DEBUG:
            print("[VOICE] Upload complete; waiting for server reply")
        step_ms = time.ticks_ms()
        phase = "reply headers"
        headers_raw, body_start = _read_response_head(sock, deadline_ms)
        if headers_raw is None:
            print("[VOICE] Server closed early")
            return {"ok": False, "error": "server_closed"}
        wait_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        response_info = _parse_response_info(headers_raw)
        status = response_info.get("status", 200)
        try:
            del headers_raw
        except Exception:
            pass
        gc.collect()
        if status != 200:
            print("[VOICE] Server error HTTP {}".format(status))
            try:
                print(body_start.decode("utf-8")[:200])
            except Exception:
                pass
            return {"ok": False, "error": "http_{}".format(status)}
        if stream_audio is not None:
            step_ms = time.ticks_ms()
            response_headers = {}
            if response_info.get("content_length") is not None:
                response_headers[b"content-length"] = str(response_info.get("content_length"))
            total, download_ms, first_audio_ms = _stream_wav_body_to_audio(
                sock, body_start, response_headers, stream_audio, deadline_ms,
                on_playback_start
            )
            total_ms = time.ticks_diff(time.ticks_ms(), started_ms)
            first_audio_ms = time.ticks_diff(first_audio_ms, started_ms)
            server_timing_text = response_info.get("server_timing", "")
            if VOICE_DEBUG:
                print("[VOICE] Timing dns={} tcp={} tls={} upload={} wait={} download={} first_audio={} total={} ms".format(
                    dns_ms, tcp_ms, tls_ms, upload_ms, wait_ms, download_ms, first_audio_ms, total_ms
                ))
                print("[VOICE] Reply streamed ({} bytes)".format(total))
            return {
                "ok": True,
                "played": True,
                "intent": response_info.get("intent", ""),
                "transcript": response_info.get("transcript", ""),
                "reply_text": response_info.get("reply_text", ""),
                "study_pack": None,
                "audio_path": "",
                "timing": {
                    "dns": dns_ms,
                    "tcp": tcp_ms,
                    "tls": tls_ms,
                    "upload": upload_ms,
                    "wait": wait_ms,
                    "download": download_ms,
                    "first_audio": first_audio_ms,
                    "total": total_ms,
                    "bytes": total,
                    "server": server_timing_text,
                },
            }
        total = 0
        active_output = output_file
        active_tmp = output_file + ".tmp"
        try:
            f = open(active_tmp, "wb")
        except OSError:
            fallback_output = _local_fallback_path(output_file)
            if fallback_output == output_file:
                raise
            active_output = fallback_output
            active_tmp = fallback_output + ".tmp"
            print("[VOICE] Reply SD write failed, falling back local")
            f = open(active_tmp, "wb")
        with f:
            step_ms = time.ticks_ms()
            if response_info.get("chunked"):
                phase = "download chunked"
                total = _read_chunked_body(sock, body_start, f, deadline_ms)
            else:
                content_length = response_info.get("content_length")
                if content_length is not None:
                    phase = "download fixed"
                    total = _read_fixed_body(sock, body_start, f, content_length, deadline_ms)
                else:
                    if body_start:
                        f.write(body_start)
                        total += len(body_start)
                    buf = bytearray(_DOWNLOAD_CHUNK)
                    mv = memoryview(buf)
                    phase = "download close"
                    while True:
                        n = _readinto_with_deadline(sock, mv, deadline_ms)
                        if not n:
                            break
                        f.write(mv[:n])
                        total += n
            download_ms = time.ticks_diff(time.ticks_ms(), step_ms)
        meta = _inspect_wav_file(active_tmp)
        if not meta:
            print("[VOICE] Invalid WAV reply")
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return {"ok": False, "error": "bad_wav"}
        if (
            meta.get("rate") != _REPLY_RATE
            or meta.get("channels") != _REPLY_CHANNELS
            or meta.get("bits") != _REPLY_BITS
        ):
            print("[VOICE] Unsafe WAV reply: {}Hz, {}bit, {}ch".format(
                meta.get("rate"), meta.get("bits"), meta.get("channels")
            ))
            try:
                os.remove(active_tmp)
            except Exception:
                pass
            return {"ok": False, "error": "bad_wav_format"}
        try:
            try:
                os.remove(active_output)
            except Exception:
                pass
            os.rename(active_tmp, active_output)
        except Exception as e:
            print("[VOICE] Could not save reply:", e)
            return {"ok": False, "error": "save_failed"}
        total_ms = time.ticks_diff(time.ticks_ms(), started_ms)
        server_timing_text = response_info.get("server_timing", "")
        if VOICE_DEBUG:
            print("[VOICE] Timing dns={} tcp={} tls={} upload={} wait={} download={} total={} ms".format(
                dns_ms, tcp_ms, tls_ms, upload_ms, wait_ms, download_ms, total_ms
            ))
            print("[VOICE] Reply saved ({} bytes) -> {}".format(total, active_output))
        return {
            "ok": True,
            "intent": response_info.get("intent", ""),
            "transcript": response_info.get("transcript", ""),
            "reply_text": response_info.get("reply_text", ""),
            "study_pack": None,
            "audio_path": active_output,
            "timing": {
                "dns": dns_ms,
                "tcp": tcp_ms,
                "tls": tls_ms,
                "upload": upload_ms,
                "wait": wait_ms,
                "download": download_ms,
                "total": total_ms,
                "bytes": total,
                "server": server_timing_text,
            },
        }
    except MemoryError:
        return _low_mem("network " + phase)
    except OSError as e:
        if _is_enomem(e):
            return _low_mem("network " + phase)
        print("[VOICE] Upload failed at {}: {}".format(phase, e))
        return {"ok": False, "error": "upload_failed"}
    except Exception as e:
        print("[VOICE] Upload failed at {}: {}".format(phase, e))
        return {"ok": False, "error": "upload_failed"}
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
        elif raw_sock:
            try:
                raw_sock.close()
            except Exception:
                pass
        gc.collect()
def fetch_study_pack(question, answer):
    gc.collect()
    _, ok = _connect_wifi(timeout_s=4)
    if not ok:
        print("[STUDY] No WiFi")
        return None
    try:
        import ssl
    except Exception as e:
        print("[STUDY] SSL unavailable:", e)
        return None
    body = _json_module().dumps({"question": question, "answer": answer}).encode("utf-8")
    headers = (
        "POST {} HTTP/1.0\r\n"
        "Host: {}\r\n"
        "X-Study-Only: true\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(TTS_SERVER_PATH, TTS_SERVER_HOST, len(body)).encode("utf-8")
    sock = None
    try:
        deadline_ms = time.ticks_add(time.ticks_ms(), 12000)
        addr = socket.getaddrinfo(TTS_SERVER_HOST, 443)[0][-1]
        raw_sock = socket.socket()
        raw_sock.settimeout(10)
        raw_sock.connect(addr)
        sock = ssl.wrap_socket(raw_sock, server_hostname=TTS_SERVER_HOST)
        try:
            sock.settimeout(10)
        except Exception:
            pass
        sock.write(headers)
        sock.write(body)
        response = b""
        while True:
            chunk = _read_with_deadline(sock, 1024, deadline_ms)
            if not chunk:
                break
            response += chunk
            if len(response) > _MAX_JSON_RESPONSE:
                print("[STUDY] Response too large")
                return None
        parts = response.split(b"\r\n\r\n", 1)
        if len(parts) < 2:
            print("[STUDY] Bad response")
            return None
        payload = _json_module().loads(parts[1].decode("utf-8"))
        return payload.get("studyPack")
    except Exception as e:
        print("[STUDY] Failed:", e)
        return None
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
def transcribe(input_wav):
    gc.collect()
    _, ok = _connect_wifi(timeout_s=15)
    if not ok:
        print("[STT] No WiFi")
        return None
    boundary = "----TEST{}".format(time.ticks_ms())
    preamble = (
        "--{b}\r\n"
        "Content-Disposition: form-data; name=\"audio\"; filename=\"audio.wav\"\r\n"
        "Content-Type: audio/wav\r\n"
        "\r\n"
    ).format(b=boundary).encode("utf-8")
    epilogue = ("\r\n--{}--\r\n".format(boundary)).encode("utf-8")
    file_size = os.stat(input_wav)[6]
    content_length = len(preamble) + file_size + len(epilogue)
    headers = (
        "POST {} HTTP/1.0\r\n"
        "Host: {}\r\n"
        "X-Client: test\r\n"
        "X-STT-Only: true\r\n"
        "Content-Type: multipart/form-data; boundary={}\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(TTS_SERVER_PATH, TTS_SERVER_HOST, boundary, content_length).encode("utf-8")
    try:
        import ssl
    except Exception as e:
        print("[STT] SSL unavailable:", e)
        return None
    sock = None
    try:
        deadline_ms = time.ticks_add(time.ticks_ms(), 30000)
        addr = socket.getaddrinfo(TTS_SERVER_HOST, 443)[0][-1]
        raw_sock = socket.socket()
        raw_sock.settimeout(20)
        raw_sock.connect(addr)
        sock = ssl.wrap_socket(raw_sock, server_hostname=TTS_SERVER_HOST)
        try:
            sock.settimeout(20)
        except Exception:
            pass
        sock.write(headers)
        sock.write(preamble)
        with open(input_wav, "rb") as f:
            while True:
                chunk = f.read(_UPLOAD_CHUNK)
                if not chunk:
                    break
                sock.write(chunk)
        sock.write(epilogue)
        response = b""
        while True:
            chunk = _read_with_deadline(sock, 1024, deadline_ms)
            if not chunk:
                break
            response += chunk
            if len(response) > _MAX_JSON_RESPONSE:
                print("[STT] Response too large")
                return None
        try:
            body = response.split(b"\r\n\r\n", 1)[1]
        except Exception:
            print("[STT] Bad response:", response[:200])
            return None
        try:
            payload = _json_module().loads(body.decode("utf-8"))
        except Exception as e:
            print("[STT] JSON parse failed:", e)
            print(body[:200])
            return None
        transcript = payload.get("transcript")
        if not transcript:
            print("[STT] No transcript:", payload)
            return None
        return transcript
    except Exception as e:
        print("[STT] Failed:", e)
        return None
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass
