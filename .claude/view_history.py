#!/usr/bin/env python3
"""
Visualiseur de l'historique des prompts Claude Code.
Usage :
  python3 view_history.py          # affiche tout
  python3 view_history.py -n 10    # 10 dernières entrées
  python3 view_history.py --search mot_clé
"""

import json
import os
import argparse
from datetime import datetime

HISTORY_FILE = os.path.expanduser("~/.claude/prompt_history.json")


def load_history():
    if not os.path.exists(HISTORY_FILE):
        print("Aucun historique trouvé. Le fichier sera créé dès la première utilisation.")
        return []
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def display_entry(entry: dict):
    ts = entry.get("timestamp", "")
    try:
        dt = datetime.fromisoformat(ts)
        ts_fmt = dt.strftime("%d/%m/%Y %H:%M:%S")
    except ValueError:
        ts_fmt = ts

    print(f"\n{'─' * 60}")
    print(f"  #{entry.get('id', '?')}  {ts_fmt}  [session: {entry.get('session_id', '?')[:8]}…]")
    print(f"{'─' * 60}")
    print(f"💬 PROMPT :\n  {entry.get('prompt', '').strip()}")
    summary = entry.get("response_summary")
    if summary:
        print(f"\n🤖 RÉSUMÉ RÉPONSE :\n  {summary}")
    else:
        print("\n🤖 RÉSUMÉ RÉPONSE : (en attente)")


def main():
    parser = argparse.ArgumentParser(description="Historique des prompts Claude Code")
    parser.add_argument("-n", "--last", type=int, default=None, help="Afficher les N dernières entrées")
    parser.add_argument("--search", type=str, default=None, help="Filtrer par mot-clé dans le prompt")
    parser.add_argument("--json", action="store_true", help="Sortie brute en JSON")
    args = parser.parse_args()

    history = load_history()
    if not history:
        return

    if args.search:
        keyword = args.search.lower()
        history = [e for e in history if keyword in e.get("prompt", "").lower()]

    if args.last:
        history = history[-args.last:]

    if args.json:
        print(json.dumps(history, ensure_ascii=False, indent=2))
        return

    print(f"\n📋 Historique Claude Code — {len(history)} entrée(s)")
    for entry in history:
        display_entry(entry)
    print(f"\n{'─' * 60}\n")


if __name__ == "__main__":
    main()
