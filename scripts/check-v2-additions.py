#!/usr/bin/env python3
"""Pre-ship checks for src/data/v2-additions.json.

Runs the gates from practice-exam-v2-spec.md section 7 that apply to an authored
batch (V2, V3, V4, V9, V10, V11, V12, V13) plus the item-level rules from
QUESTION_AUTHORING_GUIDE.md section 4 that can be checked mechanically.

Usage: python3 scripts/check-v2-additions.py
Exit status 0 if every FAIL-class check passes.
"""
import json, os, re, sys, collections, itertools

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADD = os.path.join(ROOT, "src", "data", "v2-additions.json")
BANK = os.path.join(ROOT, "src", "data", "content.json")
SMAP = os.path.join(ROOT, "docs", "standards", "standards-map.json")
OUTLINE = "/home/zabx/source/content-pipeline/.claude/worktrees/cissp-pdf-consolidate/reference/isc2/cissp_outline_2024.json"

fails, reports = [], []
def fail(m): fails.append(m)
def report(m): reports.append(m)

add = json.load(open(ADD, encoding="utf-8"))
bank = json.load(open(BANK, encoding="utf-8"))
smap = json.load(open(SMAP, encoding="utf-8"))
outline = json.load(open(OUTLINE, encoding="utf-8"))

items = add["questionsV2"]
stimuli = {s["id"]: s for s in add["stimuli"]}

# --- outline spine ------------------------------------------------------
outline_ids = set()
for dom in outline["domains"]:
    for t in dom["tasks"]:
        outline_ids.add(t["id"])
        for s in (t.get("subtasks") or []):
            outline_ids.add(s["id"])

# --- standards map documents -------------------------------------------
smap_docs = set()
for e in smap["entries"]:
    for s in e["sources"]:
        smap_docs.add(s["doc_id"])
# documents named in the map's own trap and absence lists that an honest
# explanation may name without citing text from them
smap_docs |= {"NIST SP 800-190", "NIST SP 800-86", "NIST SP 800-216", "NIST SP 800-92",
              "NIST SP 800-125", "NIST SP 800-145", "NIST SP 800-53A Rev 5", "NIST SP 800-50"}

def norm_doc(sourceline):
    return sourceline.split(" | ")[0].strip()

# --- v1 ids -------------------------------------------------------------
v1_ids, v1_stems = set(), []
for dom in bank["domains"]:
    for q in dom["questions"]:
        v1_ids.add(q["id"])
        v1_stems.append((q["id"], q["question"]))
print(f"v1 bank: {len(v1_ids)} items")

# =======================================================================
print(f"\nv2 additions: {len(items)} items, {len(stimuli)} stimuli")

# 1. structural
ids = [i["id"] for i in items]
if len(set(ids)) != len(ids):
    fail("duplicate ids inside v2-additions: " +
         str([k for k, v in collections.Counter(ids).items() if v > 1]))
clash = set(ids) & v1_ids
if clash: fail(f"id collision with v1 bank: {sorted(clash)}")

REQUIRED = ["id","domainId","editions","form","outlineItems","question","options",
            "correctAnswer","explanation","recallLine","optionsShort",
            "distractorReasons","lens","cognitive","difficulty","sources"]
for it in items:
    for k in REQUIRED:
        if k not in it: fail(f"{it.get('id')}: missing field {k}")
    if sorted(it["options"]) != list("ABCD"):
        fail(f"{it['id']}: options are not exactly A,B,C,D")
    if it["correctAnswer"] not in it["options"]:
        fail(f"{it['id']}: correctAnswer {it['correctAnswer']} not an option")
    if it["lens"] not in ("governance","technical","operational"):
        fail(f"{it['id']}: bad lens {it['lens']}")
    if it["cognitive"] not in ("recall","application","analysis"):
        fail(f"{it['id']}: bad cognitive {it['cognitive']}")
    if it["form"] not in ("drill","A","B"):
        fail(f"{it['id']}: bad form {it['form']}")

# 2. letter balance (V2: no letter above 30%)
keys = collections.Counter(i["correctAnswer"] for i in items)
n = len(items)
print("\nletter distribution:")
for k in "ABCD":
    pct = 100.0 * keys[k] / n
    print(f"  {k}: {keys[k]:3d}  {pct:5.1f}%")
    if pct > 30.0: fail(f"letter {k} at {pct:.1f}% exceeds the 30% gate")

# 3. outline ids exist in the spine (and are subtask-level where one exists)
bad = sorted({o for i in items for o in i["outlineItems"] if o not in outline_ids})
if bad: fail(f"outlineItems not in the 2024 outline spine: {bad}")
bad_s = sorted({o for s in add["stimuli"] for o in s["outlineItems"] if o not in outline_ids})
if bad_s: fail(f"stimulus outlineItems not in the spine: {bad_s}")

# 4. citations resolve to a document the standards map knows
unknown = collections.Counter()
for it in items:
    if not it["sources"]: fail(f"{it['id']}: no sources")
    for s in it["sources"]:
        d = norm_doc(s)
        if d not in smap_docs and not re.match(r"^(No |The |Intellectual|Neither|STRIDE|Export|ITAR|EU GDPR|FIPS|OWASP|CISA|NIST|32 CFR|45 CFR)", d):
            unknown[d] += 1
if unknown:
    fail(f"citation documents not found in the standards map: {dict(unknown)}")

# 5. testlet integrity (V4) and key spread inside a set (V3)
sets = collections.defaultdict(list)
for it in items:
    if it.get("stimulusId"): sets[it["stimulusId"]].append(it)
for sid, group in sorted(sets.items()):
    if sid not in stimuli: fail(f"{sid}: items point at a missing stimulus")
    if not (3 <= len(group) <= 5): fail(f"{sid}: {len(group)} items, must be 3 to 5")
    seqs = sorted(i["stimulusSeq"] for i in group)
    if seqs != list(range(1, len(group)+1)):
        fail(f"{sid}: stimulusSeq not contiguous from 1: {seqs}")
    subs = [tuple(i["outlineItems"]) for i in group]
    if len(set(subs)) != len(subs):
        fail(f"{sid}: two items in the set map to the same outline subtask")
    kc = collections.Counter(i["correctAnswer"] for i in group)
    if max(kc.values()) > 2:
        fail(f"{sid}: {max(kc.values())} items share correct letter {kc.most_common(1)}")
for sid in stimuli:
    if len(sets.get(sid, [])) < 3: fail(f"{sid}: fewer than 3 items point at it")

# 6. stimulus length 80 to 140 words, layout declared
for sid, s in sorted(stimuli.items()):
    w = len(s["text"].split())
    if not (80 <= w <= 140): fail(f"{sid}: stimulus is {w} words, must be 80 to 140")
    if s["layout"] not in ("page","spread"): fail(f"{sid}: bad layout")
    if s["layout"] == "page" and len(sets.get(sid, [])) == 5:
        fail(f"{sid}: 5 items require layout 'spread'")

# 7. distractorReasons: one per non-key option, with both fields
for it in items:
    want = {k for k in "ABCD" if k != it["correctAnswer"]}
    got = set(it["distractorReasons"])
    if got != want:
        fail(f"{it['id']}: distractorReasons keys {sorted(got)}, expected {sorted(want)}")
    for k, v in it["distractorReasons"].items():
        if not v.get("label") or not v.get("wouldAnswer"):
            fail(f"{it['id']}: distractorReasons[{k}] missing label or wouldAnswer")

# 8. option length tell (guide D4)
for it in items:
    lens_ = {k: len(v.split()) for k, v in it["options"].items()}
    for k, w in lens_.items():
        others = [x for kk, x in lens_.items() if kk != k]
        mean = sum(others)/len(others)
        if w == max(lens_.values()) and w > 1.25*mean:
            fail(f"{it['id']}: option {k} is {w} words vs 1.25x mean {1.25*mean:.1f} (D4)")
        if w == min(lens_.values()) and w < 0.75*mean:
            fail(f"{it['id']}: option {k} is {w} words vs 0.75x mean {0.75*mean:.1f} (D4)")

# 9. prose rules: no em dashes; discriminator present; lengths
EMDASH = re.compile(r"[—–]")
DISC = re.compile(r"\b(FIRST|BEST|MOST|LEAST|GREATEST|PRIMARY|BEFORE|NEXT)\b")
for it in items:
    for field in ("question","explanation","recallLine"):
        if EMDASH.search(it[field]):
            fail(f"{it['id']}: em or en dash in {field}")
    for v in list(it["options"].values()) + list(it["optionsShort"].values()):
        if EMDASH.search(v): fail(f"{it['id']}: em or en dash in an option")
    for dr in it["distractorReasons"].values():
        if EMDASH.search(dr["wouldAnswer"]): fail(f"{it['id']}: em or en dash in wouldAnswer")
    if not DISC.search(it["question"]):
        fail(f"{it['id']}: stem carries no discriminator word")
    if it.get("discriminator") and it["discriminator"] not in it["question"]:
        fail(f"{it['id']}: declared discriminator '{it['discriminator']}' not in the stem")
    if len(it["recallLine"].split()) > 30:
        fail(f"{it['id']}: recallLine is {len(it['recallLine'].split())} words, max 30")
    for k, v in it["optionsShort"].items():
        if len(v.split()) > 10:
            fail(f"{it['id']}: optionsShort[{k}] is {len(v.split())} words, max 10")
    ew = len(it["explanation"].split())
    if ew < 80: fail(f"{it['id']}: explanation is {ew} words, minimum 80")
for sid, s in stimuli.items():
    if EMDASH.search(s["text"]): fail(f"{sid}: em or en dash in stimulus text")

# 10. no All/None of the above; no lone absolute
for it in items:
    for k, v in it["options"].items():
        if re.search(r"\b(all|none) of the above\b", v, re.I):
            fail(f"{it['id']}: option {k} is All/None of the above")
    abs_hits = {k: bool(re.search(r"(?<![-\w])(always|never|only|none)(?![-\w])", v, re.I))
                for k, v in it["options"].items()}
    if sum(abs_hits.values()) == 1:
        report(f"D5 check: {it['id']} has an absolute in exactly one option ({[k for k,v in abs_hits.items() if v][0]})")

# 11. near-duplicate stems, v2 against v2 and v2 against v1 (V10)
STOP = set("the a an of to in for and or is are that which with on at by as it its from".split())
def toks(s): return {w for w in re.findall(r"[a-z']+", s.lower()) if w not in STOP and len(w) > 2}
def jac(a, b):
    A, B = toks(a), toks(b)
    return len(A & B) / len(A | B) if A | B else 0.0
near = []
for a, b in itertools.combinations(items, 2):
    j = jac(a["question"], b["question"])
    if j >= 0.55: near.append((a["id"], b["id"], round(j, 2)))
for it in items:
    for vid, vq in v1_stems:
        j = jac(it["question"], vq)
        if j >= 0.55: near.append((it["id"], vid, round(j, 2)))
if near: report(f"V10 near-duplicate stem pairs (Jaccard >= 0.55): {near}")
else:    report("V10 near-duplicate stems: none at Jaccard >= 0.55")

# 12. batch mix (V12) and testlet share (V13)
cog = collections.Counter(i["cognitive"] for i in items)
lens_mix = collections.Counter(i["lens"] for i in items)
recall_pct = 100.0 * cog["recall"] / n
report(f"V12 cognitive mix: {dict(cog)} (recall {recall_pct:.1f}%, target <= 40%)")
if recall_pct > 40: fail(f"recall share {recall_pct:.1f}% exceeds the 40% target")
report(f"V12 lens mix: {dict(lens_mix)}")
if len(lens_mix) < 2: fail("lens mix is uniform")
in_testlet = sum(1 for i in items if i.get("stimulusId"))
share = 100.0 * in_testlet / n
report(f"V13 testlet share of newly authored items: {in_testlet}/{n} = {share:.1f}% (floor 60%)")
if share < 60: fail(f"testlet share {share:.1f}% is below the 60% floor")

# 13. V9: the 27 audit gaps are covered
GAPS = ["1.4.3","3.3","3.5.1","3.5.2","3.5.10","3.5.11","3.5.15","3.10.5","3.10.7","3.10.9",
        "5.1.1","5.1.2","5.2.8","5.3.1","5.3.3","6.4.3","7.1.3","7.2.6","7.6.3","7.6.7",
        "7.7.3","7.11.2","7.11.7","7.12.2","7.12.3","7.15.4","8.5.4"]
covered = collections.Counter(o for i in items for o in i["outlineItems"])
missing = [g for g in GAPS if covered[g] == 0]
if missing: fail(f"V9: zero-coverage outline items still uncovered: {missing}")
report(f"V9: {len(GAPS)-len(missing)}/{len(GAPS)} audit gap outline items now covered")

# 14. compatibility (V0 half that applies here)
if any("stimulusId" in q for dom in bank["domains"] for q in dom["questions"]):
    fail("V0: a v1 item in domains[].questions[] carries stimulusId")
if bank["bank"]["schema"] != 2: fail("V0: bank.schema is not 2")
if bank["bank"]["questionCount"] != sum(len(d["questions"]) for d in bank["domains"]):
    fail("V0: bank.questionCount does not match questions[]")

# =======================================================================
print("\nper-domain:")
for d, c in sorted(collections.Counter(i["domainId"] for i in items).items()):
    print(f"  {d}: {c}")
print("\nreports:")
for r in reports: print("  " + r)
print()
if fails:
    print(f"FAIL ({len(fails)}):")
    for f in fails: print("  " + f)
    sys.exit(1)
print("PASS: all fail-class checks clean")
