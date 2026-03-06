#!/usr/bin/env python3
"""
Claude Code Hook — Historique des prompts & résumés de réponses
Événements gérés : UserPromptSubmit, Stop
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
    # Couper proprement à la dernière phrase/ligne complète
    truncated = text[:max_length]
    for sep in (". ", "\n", "! ", "? "):
        idx = truncated.rfind(sep)
        if idx > max_length // 2:
            return truncated[: idx + 1] + " […]"
    return truncated + " […]"


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
        "response_summary": None,  # sera rempli par le hook Stop
    }
    history.append(entry)
    save_history(history)

    # Laisser passer le prompt tel quel
    return {"continue": True}


def handle_stop(data: dict) -> dict:
    """Capture la réponse finale et met à jour le dernier prompt sans résumé."""
    # Chercher le texte de la réponse dans les différents champs possibles
    response_text = (
        data.get("response", "")
        or data.get("message", "")
        or data.get("assistant_response", "")
        or ""
    )

    # Parcourir les blocs de contenu si disponibles
    if not response_text and "content" in data:
        parts = []
        for block in data.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        response_text = "\n".join(parts)

    summary = summarize_response(response_text)
    session_id = data.get("session_id", "unknown")

    history = load_history()
    # Mettre à jour la dernière entrée de cette session sans résumé
    for entry in reversed(history):
        if entry.get("session_id") == session_id and entry.get("response_summary") is None:
            entry["response_summary"] = summary
            break

    save_history(history)
    return {"continue": True}


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

    event = data.get("event", os.environ.get("CLAUDE_HOOK_EVENT", ""))

    if event == "UserPromptSubmit":
        result = handle_user_prompt_submit(data)
    elif event == "Stop":
        result = handle_stop(data)
    else:
        result = {"continue": True}

    print(json.dumps(result))


if __name__ == "__main__":
    main()
