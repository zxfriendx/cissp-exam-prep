#!/usr/bin/env python3
"""Splice v2-additions.json into the bank — ADDITIVELY.

The v2 items land in `domains[].questionsV2[]` and their scenarios in
`domains[].stimuli[]`. `domains[].questions[]` is NOT touched, which is the whole point:
the free practice app reads `questions[]` and keeps serving exactly the 439 it always did,
while the printed examination can take v1 + v2 and be the fuller product. One file, two
editions, no second copy of the bank to drift.

    scripts/merge-v2.py            # merge
    scripts/merge-v2.py --check    # report only, write nothing
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "src/data/content.json"
ADDS = ROOT / "src/data/v2-additions.json"
check = "--check" in sys.argv

bank = json.loads(BANK.read_text())
adds = json.loads(ADDS.read_text())

by_dom = {d["id"]: d for d in bank["domains"]}
existing = {q["id"] for d in bank["domains"] for q in d.get("questions", [])}

added_q = added_s = 0
for s in adds.get("stimuli", []):
    dom = by_dom.get(s["domainId"])
    if dom is None:
        sys.exit(f"stimulus {s['id']}: unknown domain {s['domainId']}")
    dom.setdefault("stimuli", [])
    if s["id"] not in {x["id"] for x in dom["stimuli"]}:
        dom["stimuli"].append(s); added_s += 1

for q in adds.get("questionsV2", []):
    if q["id"] in existing:
        sys.exit(f"item {q['id']} collides with a v1 question id")
    dom = by_dom.get(q["domainId"])
    if dom is None:
        sys.exit(f"item {q['id']}: unknown domain {q['domainId']}")
    dom.setdefault("questionsV2", [])
    if q["id"] not in {x["id"] for x in dom["questionsV2"]}:
        dom["questionsV2"].append(q); added_q += 1

# the manifest keeps describing questions[]; v2 gets its own block, so gate 0 is unaffected
v1_total = sum(len(d.get("questions", [])) for d in bank["domains"])
v2_total = sum(len(d.get("questionsV2", [])) for d in bank["domains"])
bank.setdefault("bank", {})["v2"] = dict(
    edition=adds.get("meta", {}).get("edition", "2026-09-04"),
    questionCount=v2_total,
    stimulusCount=sum(len(d.get("stimuli", [])) for d in bank["domains"]),
    byDomain={d["id"]: len(d.get("questionsV2", [])) for d in bank["domains"]
              if d.get("questionsV2")},
    source="src/data/v2-additions.json")

print(f"v1 questions[]   {v1_total}  (untouched — the free app reads this)")
print(f"v2 questionsV2[] {v2_total}  (+{added_q} spliced)")
print(f"v2 stimuli[]     {bank['bank']['v2']['stimulusCount']}  (+{added_s} spliced)")
print(f"combined         {v1_total + v2_total}")
if check:
    print("\n--check: nothing written")
else:
    BANK.write_text(json.dumps(bank, indent=2) + "\n")
    print(f"\nwrote {BANK}")
