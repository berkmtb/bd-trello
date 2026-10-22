#!/usr/bin/env python3
"""
Recreate Planner backups as boards in Trello (works on Trello's free plan).

Trello has no built-in JSON import, so this uses Trello's REST API.

Setup (one time):
  1. Go to https://trello.com/power-ups/admin, create a Power-Up (any name),
     open it, choose "API key", and generate a new key.
  2. On that page, click the "Token" link to authorize and copy the token.

Usage:
  export TRELLO_KEY=...  TRELLO_TOKEN=...
  python3 push_to_trello.py planner-backup-2026-10-22.json
  python3 push_to_trello.py my-board.json --checklists     # turn "- [ ]" lines into Trello checklists
  python3 push_to_trello.py backup.json --dry-run           # show what would be created

Each board in the file becomes a NEW Trello board; nothing existing is changed.
Priorities become red/orange/yellow labels named "Priority 1/2/3".
Archived cards are created and then archived.
Uses only the Python standard library.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.trello.com/1"
TASK_RE = re.compile(r"^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$")


class Trello:
    def __init__(self, key, token, dry_run=False):
        self.key, self.token, self.dry = key, token, dry_run
        self.calls = 0

    def post(self, path, **params):
        if self.dry:
            self.calls += 1
            return {"id": f"dry-{self.calls}"}
        params.update(key=self.key, token=self.token)
        data = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None}).encode()
        for attempt in range(5):
            try:
                req = urllib.request.Request(f"{API}{path}", data=data, method="POST")
                with urllib.request.urlopen(req, timeout=30) as r:
                    self.calls += 1
                    time.sleep(0.12)  # stay well under Trello's 100 requests / 10 s limit
                    return json.loads(r.read())
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 4:
                    time.sleep(3 * (attempt + 1))
                    continue
                raise SystemExit(f"Trello API error {e.code} on {path}: {e.read().decode()[:300]}")
        raise SystemExit("Gave up after repeated rate limiting.")

    def put(self, path, **params):
        if self.dry:
            return {}
        params.update(key=self.key, token=self.token)
        data = urllib.parse.urlencode(params).encode()
        req = urllib.request.Request(f"{API}{path}", data=data, method="PUT")
        with urllib.request.urlopen(req, timeout=30) as r:
            time.sleep(0.12)
            return json.loads(r.read())


def split_checklists(desc):
    """Move '- [ ]' lines out of the description into one checklist."""
    keep, items = [], []
    for line in desc.splitlines():
        m = TASK_RE.match(line)
        if m:
            items.append((m.group(2).strip(), m.group(1).lower() == "x"))
        else:
            keep.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(keep)).strip(), items


def push_board(t, board, checklists):
    name = board.get("name", "Imported board")
    print(f"\nBoard: {name}")
    new_board = t.post("/boards", name=name, defaultLists="false", defaultLabels="false")
    bid = new_board["id"]

    label_ids = {}
    for lbl in board.get("labels", []):
        label_ids[lbl["id"]] = t.post("/labels", name=lbl.get("name", ""), color=lbl.get("color"), idBoard=bid)["id"]

    list_ids = {}
    lists = sorted([l for l in board.get("lists", []) if not l.get("closed")], key=lambda l: l.get("pos", 0))
    for l in lists:
        list_ids[l["id"]] = t.post("/lists", name=l["name"], idBoard=bid, pos="bottom")["id"]
    fallback = None

    cards = sorted(board.get("cards", []), key=lambda c: (c.get("idList", ""), c.get("pos", 0)))
    n = 0
    for c in cards:
        id_list = list_ids.get(c.get("idList"))
        if not id_list:  # card from a deleted list: park it in an "Archived (deleted list)" list
            if fallback is None:
                fallback = t.post("/lists", name="Archived cards (deleted lists)", idBoard=bid, pos="bottom")["id"]
            id_list = fallback
        desc = c.get("desc", "") or ""
        items = []
        if checklists:
            desc, items = split_checklists(desc)
        labels = ",".join(label_ids[i] for i in c.get("idLabels", []) if i in label_ids)
        new_card = t.post("/cards", idList=id_list, name=c.get("name", "Untitled"), desc=desc,
                          pos=str(c.get("pos", "bottom")), idLabels=labels or None)
        if items:
            cl = t.post("/checklists", idCard=new_card["id"], name="Checklist")
            for text, done in items:
                t.post(f"/checklists/{cl['id']}/checkItems", name=text, checked=str(done).lower())
        if c.get("closed"):
            t.put(f"/cards/{new_card['id']}", closed="true")
        n += 1
    print(f"  {len(lists)} lists, {n} cards" + (f"  →  {new_board.get('url', '')}" if not t.dry else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("backup", help="Planner backup or single-board .json")
    ap.add_argument("--checklists", action="store_true", help='convert "- [ ]" lines into Trello checklists')
    ap.add_argument("--dry-run", action="store_true", help="print a summary without calling Trello")
    a = ap.parse_args()

    with open(a.backup, encoding="utf-8") as f:
        data = json.load(f)
    boards = data["boards"] if isinstance(data.get("boards"), list) else [data]

    key, token = os.environ.get("TRELLO_KEY"), os.environ.get("TRELLO_TOKEN")
    if not a.dry_run and not (key and token):
        sys.exit("Set TRELLO_KEY and TRELLO_TOKEN first (see the instructions at the top of this file).")

    t = Trello(key, token, a.dry_run)
    for b in boards:
        push_board(t, b, a.checklists)
    print(f"\nDone. {t.calls} API calls." + (" (dry run, nothing created)" if a.dry_run else ""))


if __name__ == "__main__":
    main()
