'''
[Storage] Ensuring demo files exist...
[Storage] Flashcards created.
[Storage] Quiz created.
[Storage] Analysis created.
[Storage] Map created.
[Storage] Data verified successfully.
'''
try:
    import ujson as json
except ImportError:
    import json
import os
from storage_paths import (
    audio_path,
    runtime_analyse_path,
    runtime_flashcards_path,
    runtime_quiz_path,
)
try:
    from storage_paths import runtime_map_path
except ImportError:
    def runtime_map_path():
        return audio_path("/sd/map.json", "map.json")
MAX_TEXT = 72
def _clean_text(value, limit=MAX_TEXT):
    text = str(value or "").replace("\n", " ").strip()
    if len(text) > limit:
        return text[:limit - 3] + "..."
    return text
def _write_json(path, data):
    tmp_path = path + ".tmp"
    try:
        with open(tmp_path, "w") as f:
            json.dump(data, f)
        try:
            os.remove(path)
        except OSError:
            pass
        os.rename(tmp_path, path)
    except Exception:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        raise
def save_study_pack(pack):
    if not pack:
        return False
    title = _clean_text(pack.get("title") or "Study Pack", 40)
    summary = _clean_text(pack.get("summary") or "", 120)
    analysis = pack.get("analysis") or []
    flashcards = pack.get("flashcards") or []
    quiz = pack.get("quiz") or []
    fc_payload = []
    for item in flashcards[:8]:
        front = _clean_text(item.get("front"), 60)
        back = _clean_text(item.get("back"), 80)
        if front and back:
            fc_payload.append({"f": front, "b": back, "d": title, "l": 0, "c": 0, "w": 0})
    quiz_payload = []
    for item in quiz[:5]:
        text = _clean_text(item.get("q"), 72)
        raw_choices = item.get("choices") or []
        choices = [_clean_text(choice, 34) for choice in raw_choices[:4]]
        try:
            answer = int(item.get("answer", 0))
        except Exception:
            answer = 0
        explanation = _clean_text(item.get("explanation"), 72)
        if text and len(choices) >= 2 and 0 <= answer < len(choices):
            quiz_payload.append({
                "text": text,
                "choices": choices[:4],
                "answer": answer,
                "explanation": explanation,
            })
    analyse_payload = {
        "title": title,
        "summary": summary,
        "analysis": [_clean_text(item, 72) for item in analysis[:4]],
        "source_question": _clean_text(pack.get("source_question", ""), 72),
        "answer": _clean_text(pack.get("answer", ""), 160),
    }
    map_payload = _build_map_payload(pack, title, analyse_payload["analysis"], fc_payload, quiz_payload)
    if fc_payload:
        _write_json(runtime_flashcards_path(), fc_payload)
    if quiz_payload:
        _write_json(runtime_quiz_path(), quiz_payload)
    _write_json(runtime_analyse_path(), analyse_payload)
    _write_json(runtime_map_path(), map_payload)
    return True
def ensure_study_files():
    if not file_exists(runtime_flashcards_path()):
        _write_json(runtime_flashcards_path(), [
            {"f": "What is AI?", "b": "Artificial Intelligence", "d": "Demo", "l": 0, "c": 0, "w": 0},
            {"f": "Python type for text?", "b": "str (string)", "d": "Demo", "l": 0, "c": 0, "w": 0},
            {"f": "Ohm's Law?", "b": "V = I x R", "d": "Demo", "l": 0, "c": 0, "w": 0},
            {"f": "1 byte = ?", "b": "8 bits", "d": "Demo", "l": 0, "c": 0, "w": 0},
        ])
    if not file_exists(runtime_quiz_path()):
        _write_json(runtime_quiz_path(), [
            {"text": "What does CPU stand for?", "choices": ["Central Processing Unit", "Computer Process Unit"], "answer": 0, "explanation": ""},
            {"text": "1 Kilobyte = ?", "choices": ["1000 bytes", "1024 bytes"], "answer": 1, "explanation": ""},
            {"text": "I2C uses how many wires?", "choices": ["2", "4"], "answer": 0, "explanation": ""},
        ])
    if not file_exists(runtime_analyse_path()):
        _write_json(runtime_analyse_path(), {
            "title": "Aido Demo",
            "summary": "Ask Aido a question to create a fresh study pack.",
            "analysis": ["Voice answers can become flashcards.", "Quiz and map update after learning."],
            "source_question": "",
            "answer": "",
        })
    if not file_exists(runtime_map_path()):
        _write_json(runtime_map_path(), {
            "title": "Aido Demo",
            "nodes": ["Aido", "Voice", "Answer", "Flashcards", "Quiz", "Map"],
            "edges": [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5]],
        })
def _build_map_payload(pack, title, analysis, flashcards, quiz):
    raw_map = pack.get("map") or pack.get("neural_map") or {}
    raw_nodes = raw_map.get("nodes") if isinstance(raw_map, dict) else None
    raw_edges = raw_map.get("edges") if isinstance(raw_map, dict) else None
    nodes = []
    if raw_nodes:
        for item in raw_nodes[:10]:
            label = _clean_text(item.get("label") if isinstance(item, dict) else item, 18)
            if label:
                nodes.append(label)
    if not nodes:
        nodes.append(title)
        for item in analysis[:4]:
            if item:
                nodes.append(_clean_text(item, 18))
        for card in flashcards[:3]:
            nodes.append(_clean_text(card.get("f"), 18))
        for question in quiz[:2]:
            nodes.append(_clean_text(question.get("text"), 18))
    deduped = []
    for node in nodes:
        if node and node not in deduped:
            deduped.append(node)
        if len(deduped) >= 10:
            break
    edges = []
    if raw_edges:
        for edge in raw_edges[:14]:
            try:
                a = int(edge[0])
                b = int(edge[1])
                if 0 <= a < len(deduped) and 0 <= b < len(deduped):
                    edges.append([a, b])
            except Exception:
                pass
    if not edges:
        for idx in range(1, len(deduped)):
            edges.append([0, idx])
            if idx > 1:
                edges.append([idx - 1, idx])
    return {"title": title, "nodes": deduped, "edges": edges[:14]}
def load_analysis():
    try:
        with open(runtime_analyse_path(), "r") as f:
            return json.load(f)
    except Exception:
        return None
def load_map():
    try:
        with open(runtime_map_path(), "r") as f:
            return json.load(f)
    except Exception:
        return None
def file_exists(path):
    try:
        os.stat(path)
        return True
    except OSError:
        return False
