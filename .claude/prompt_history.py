#!/usr/bin/env python3
"""
Claude Code Hook — Historique des prompts & résumés de réponses
Événements gérés : UserPromptSubmit, Stop

Format des données reçues sur stdin :
  UserPromptSubmit : {"hook_event_name": "UserPromptSubmit", "session_id": "...",
                      "transcript_path": "...", "prompt": "...", "cwd": "..."}
  Stop             : {"hook_event_name": "Stop", "session_id": "...",
                      "transcript_path": "...", "stop_hook_active": false}
"""

import json
import sys
import os
from datetime import datetime

HISTORY_FILE = os.path.expanduser("~/.claude/prompt_history.json")


def load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_history(history: list):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def summarize_response(text: str, max_length: int = 300) -> str:
    """Résume une réponse en tronquant intelligemment."""
    if not text:
        return "(réponse vide)"
    text = text.strip()
    if len(text) <= max_length:
        return text
    truncated = text[:max_length]
    for sep in (". ", "\n", "! ", "? "):
        idx = truncated.rfind(sep)
        if idx > max_length // 2:
            return truncated[: idx + 1] + " […]"
    return truncated + " […]"


def read_tokens_from_transcript(transcript_path: str, session_id: str) -> dict:
    """
    Lit le transcript JSONL et agrège les tokens d'usage de la session courante.
    Retourne {"input_tokens": n, "output_tokens": n, "cache_read_tokens": n, "cache_write_tokens": n}
    """
    tokens = {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "cache_write_tokens": 0,
    }
    if not transcript_path or not os.path.exists(transcript_path):
        return tokens

    try:
        with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    # Seules les entrées assistant contiennent l'usage
                    if entry.get("type") != "assistant":
                        continue
                    msg = entry.get("message", {})
                    if not isinstance(msg, dict):
                        continue
                    usage = msg.get("usage", {})
                    if not usage:
                        continue
                    tokens["input_tokens"] += usage.get("input_tokens", 0)
                    tokens["output_tokens"] += usage.get("output_tokens", 0)
                    tokens["cache_read_tokens"] += usage.get("cache_read_input_tokens", 0)
                    tokens["cache_write_tokens"] += (
                        usage.get("cache_creation_input_tokens", 0)
                    )
                except (json.JSONDecodeError, AttributeError):
                    continue
    except IOError:
        pass

    return tokens


def detect_event(data: dict) -> str:
    """
    Détecte le type d'événement depuis les données du hook.
    Claude Code envoie 'hook_event_name' ou 'event'.
    Fallback : détection structurelle.
    """
    # Champ standard Claude Code
    event = data.get("hook_event_name") or data.get("event", "")
    if event:
        return event
    # Détection structurelle
    if "prompt" in data:
        return "UserPromptSubmit"
    if "stop_hook_active" in data:
        return "Stop"
    return ""


def handle_user_prompt_submit(data: dict) -> dict:
    """Intercepte le prompt, le log, et le laisse passer sans modification."""
    prompt = data.get("prompt", "")
    session_id = data.get("session_id", "unknown")
    timestamp = datetime.now().isoformat()

    history = load_history()
    entry = {
        "id": len(history) + 1,
        "timestamp": timestamp,
        "session_id": session_id,
        "prompt": prompt,
        "response_summary": None,   # rempli par Stop
        "tokens": None,             # rempli par Stop
    }
    history.append(entry)
    save_history(history)

    return {"continue": True}


def handle_stop(data: dict) -> dict:
    """Capture la réponse finale et les tokens, met à jour le dernier prompt."""
    session_id = data.get("session_id", "unknown")
    transcript_path = data.get("transcript_path", "")

    # Récupérer le texte de la réponse depuis le transcript
    response_text = ""
    if transcript_path and os.path.exists(transcript_path):
        try:
            with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            # Remonter depuis la fin pour trouver le dernier message assistant
            for line in reversed(lines):
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    if entry.get("type") != "assistant":
                        continue
                    msg = entry.get("message", {})
                    if not isinstance(msg, dict):
                        continue
                    content = msg.get("content", [])
                    if isinstance(content, list):
                        parts = [
                            b.get("text", "")
                            for b in content
                            if isinstance(b, dict) and b.get("type") == "text"
                        ]
                        response_text = "\n".join(parts)
                    elif isinstance(content, str):
                        response_text = content
                    if response_text:
                        break
                except (json.JSONDecodeError, AttributeError):
                    continue
        except IOError:
            pass

    # Tokens agrégés sur toute la session
    tokens = read_tokens_from_transcript(transcript_path, session_id)

    summary = summarize_response(response_text)

    history = load_history()
    for entry in reversed(history):
        if entry.get("session_id") == session_id and entry.get("response_summary") is None:
            entry["response_summary"] = summary
            entry["tokens"] = tokens
            break

    save_history(history)
    return {"continue": True}


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

    event = detect_event(data)

    if event == "UserPromptSubmit":
        result = handle_user_prompt_submit(data)
    elif event == "Stop":
        result = handle_stop(data)
    else:
        result = {"continue": True}

    print(json.dumps(result))


if __name__ == "__main__":
    main()