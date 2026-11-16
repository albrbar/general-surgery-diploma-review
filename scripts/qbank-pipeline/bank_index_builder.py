#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bank_index_builder.py — توليد فهرس بنك MCQ ولوحة تقدم دورة G | GSDIPLOMAREVISION (الموقع الثالث)
يفحص مجلد البنك (batches/ + assets/snapshots/) ويولّد:
  - bank_index.json      : الفهرس المركزي الذي تقرؤه الواجهة (إحصاءات، خريطة محاضرات)
  - _meta/g_progress.csv : لوحة تقدم التوليد لكل محاضرة (حالة، أعداد، ملاحظات)

الاستخدام:
  python3 bank_index_builder.py <bank_root>        # المجلد الحاوي batches/ و assets/
خروج نظيف = 0، أخطاء قاسية (JSON تالف / مراجع سناب مفقودة) = 1.
"""
import csv, json, os, sys, datetime
from pathlib import Path

REQ = ["id", "subject", "stem", "options", "answer_index", "status", "snap", "lecture_ref"]


def scan_batch(path, root):
    issues, stats = [], {"questions": 0, "subjects": {}, "difficulty": {}, "high_yield": 0, "refs": set()}
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return None, [f"JSON تالف: {e}"]
    qs = doc.get("questions") if isinstance(doc, dict) else doc
    if not isinstance(qs, list) or not qs:
        return None, ["لا قائمة أسئلة صالحة"]
    stats["questions"] = len(qs)
    seen = set()
    for i, q in enumerate(qs, 1):
        qid = q.get("id") or f"#{i}"
        for f in REQ:
            if f not in q or q[f] in (None, ""):
                issues.append(f"{qid}: حقل مفقود {f}")
        if qid in seen:
            issues.append(f"{qid}: معرف مكرر داخل الدفعة")
        seen.add(qid)
        s = q.get("subject")
        if s:
            stats["subjects"][s] = stats["subjects"].get(s, 0) + 1
        d = q.get("difficulty")
        if d:
            stats["difficulty"][d] = stats["difficulty"].get(d, 0) + 1
        stats["high_yield"] += 1 if q.get("high_yield") else 0
        lr = str(q.get("lecture_ref") or "").strip()
        if lr:
            stats["refs"].add(lr)
        snap = q.get("snap") or {}
        ref = str(snap.get("ref") or "").strip()
        if ref:
            if not (root / ref).is_file():
                issues.append(f"{qid}: صورة السناب مفقودة على القرص: {ref}")
        elif "snap" in q:
            issues.append(f"{qid}: snap بلا ref")
    return stats, issues


def main():
    if len(sys.argv) != 2:
        print("الاستخدام: bank_index_builder.py <bank_root>"); sys.exit(2)
    root = Path(sys.argv[1])
    batches_dir, snaps_dir = root / "batches", root / "assets" / "snapshots"
    if not batches_dir.is_dir():
        print(f"⛔ لا مجلد batches في {root}"); sys.exit(1)

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    entries, hard, totals = [], 0, {"questions": 0, "snapshots": 0}
    by_subj, by_diff, hy_total = {}, {}, 0

    for bp in sorted(batches_dir.glob("*.json")):
        stats, issues = scan_batch(bp, root)
        ok = stats is not None and not any("JSON تالف" in x or "السناب مفقودة" in x for x in issues)
        if stats is None:
            hard += 1
            stats = {"questions": 0, "subjects": {}, "difficulty": {}, "high_yield": 0, "refs": set()}
        hard += sum(1 for x in issues if "السناب مفقودة" in x)
        ref = sorted(stats["refs"])[0] if stats["refs"] else bp.stem
        n_snaps = len(list(snaps_dir.glob(ref + "/*"))) if (snaps_dir / ref).is_dir() else 0
        for s, c in stats["subjects"].items(): by_subj[s] = by_subj.get(s, 0) + c
        for d, c in stats["difficulty"].items(): by_diff[d] = by_diff.get(d, 0) + c
        hy_total += stats["high_yield"]
        totals["questions"] += stats["questions"]; totals["snapshots"] += n_snaps
        entries.append({"lecture_ref": ref, "file": f"batches/{bp.name}",
                        "questions": stats["questions"], "snapshots": n_snaps,
                        "subjects": stats["subjects"], "high_yield": stats["high_yield"],
                        "ok": ok, "issues": issues})

    index = {"schema_version": "1.0", "kind": "mcq_bank_index", "generated_at": now,
             "totals": {"batches": len(entries), **totals, "high_yield": hy_total},
             "by_subject": by_subj, "by_difficulty": by_diff, "batches": entries}
    (root / "bank_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    meta = root / "_meta"; meta.mkdir(parents=True, exist_ok=True)
    with (meta / "g_progress.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["lecture_ref", "batch_file", "questions", "snapshots", "high_yield", "ok", "issues_count", "updated_at"])
        for e in entries:
            w.writerow([e["lecture_ref"], e["file"], e["questions"], e["snapshots"],
                        e["high_yield"], "نعم" if e["ok"] else "لا", len(e["issues"]), now])

    print(f"✅ الفهرس: {root/'bank_index.json'}")
    print(f"✅ لوحة التقدم: {meta/'g_progress.csv'}")
    print(f"دفعات: {len(entries)} | أسئلة: {totals['questions']} | سناب: {totals['snapshots']} | مشاكل قاسية: {hard}")
    for e in entries:
        flag = "✅" if e["ok"] and not e["issues"] else "⚠"
        print(f"  {flag} {e['lecture_ref']}: {e['questions']} سؤالاً | {e['snapshots']} صورة | مشاكل: {len(e['issues'])}")
        for x in e["issues"][:5]: print("      -", x)
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
