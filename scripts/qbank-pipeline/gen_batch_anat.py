#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_batch_anat.py — مُجمّع دفعة MCQ لمحاضرة واحدة (دورة G) | GSDIPLOMAREVISION
يستقبل مسودات الأسئلة المؤلَّفة من نص المحاضرة (سؤال + 4 خيارات + إجابة + شرح + صفحة سناب)
ويصوغها بمخطط GOVERNANCE §5 كاملاً مع صور السناب، ثم يجري فحوص الجودة والتكرار والاعتماد الآلي.

الاستخدام:
  python3 gen_batch_anat.py --draft draft_ANAT-L01.json --snaps snaps_ANAT-L01 \
      --lecture "exam/anatomy drkhaledmilad/Lecture 1.pdf" --lecture-ref ANAT-L01 \
      --bank-root bank/ --out bank/batches/gen_ANAT-L01.json --registry dedup_registry.json

المدخلات:
  --draft  : قائمة أسئلة (أو كائن فيه questions) بحقول:
             stem, options[4 بالضبط], answer_index, explanation,
             difficulty(easy|medium|hard), high_yield(bool), snap_page(int), snap_caption,
             tags[] (اختياري)
  --snaps  : مجلد صور الصفحات p001.jpg … من render_lecture_snaps.py

المخرجات:
  - ملف الدفعة النهائي gen_<LECTURE_REF>.json (status: draft حصراً) + نسخ صور السناب إلى
    <bank-root>/assets/snapshots/<LECTURE_REF>/
  - تقرير جودة QC_<LECTURE_REF>.md بجوار الدفعة + فحص mcq_batch_validator.py (subprocess)

القواعد المحكومة آلياً:
  1) 4 خيارات بالضبط، answer_index ضمن الحدود، شرح ≥ 25 حرفاً، سناب لكل سؤال بصفحة موجودة.
  2) توزيع الصعوبة قريب من 30/50/20 وhigh_yield بين 20-35% (تحذيرات لا رفض).
  3) لا تكرار داخلي ولا تصادم مع سجل البصمات (ثلاثة مواقع) — تصادم = رفض قاسٍ.
  4) معرفات نهائية GS-<SUBJECT>-NNNN من --id-start، وتُفحص ضد الدفعات الموجودة في bank-root.
  5) status = draft حصراً — لا ينتج هذا السكربت معتمداً أبداً.
خروج نظيف = 0، فشل = 1.
"""
import argparse, csv, datetime, json, re, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIFF_TARGET = {"easy": 0.30, "medium": 0.50, "hard": 0.20}


def norm_ar(s: str) -> str:
    s = re.sub(r"[\u064B-\u0652\u0670]", "", str(s))
    s = s.translate(str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ـ": ""}))
    return re.sub(r"\s+", " ", s).strip().lower()


def fp_stem(stem, options):
    import hashlib
    raw = norm_ar(stem) + "|" + "|".join(sorted(norm_ar(o) for o in (options or [])))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--draft", required=True)
    ap.add_argument("--snaps", required=True)
    ap.add_argument("--lecture", required=True, help="مسار المحاضرة كما في الأصل (للمصدر والتوثيق)")
    ap.add_argument("--lecture-ref", required=True, help="مثل ANAT-L01")
    ap.add_argument("--subject", default="ANAT")
    ap.add_argument("--source-label", default="", help="مرجع السؤال — الافتراضي مشتق من المحاضرة")
    ap.add_argument("--bank-root", default="", help="جذر البنك لفحص تكرار المعرفات ونسخ السناب")
    ap.add_argument("--out", required=True)
    ap.add_argument("--registry", default=str(HERE / "dedup_registry.json"))
    ap.add_argument("--id-start", type=int, default=1)
    ap.add_argument("--expected-count", type=int, default=80)
    ap.add_argument("--keep-going", action="store_true", help="لا توقف عند أخطاء المؤلَّف — اعرضها كلها")
    a = ap.parse_args()

    errors, warnings = [], []
    lecture_ref = a.lecture_ref.strip()
    subject = a.subject.strip().upper()
    lecture_name = Path(a.lecture).name

    # ---- 1) تحميل المسودات ----
    doc = json.loads(Path(a.draft).read_text(encoding="utf-8"))
    qs = doc.get("questions") if isinstance(doc, dict) else doc
    if not isinstance(qs, list) or not qs:
        print("⛔ ملف المسودات لا يحوي قائمة أسئلة"); sys.exit(1)
    if len(qs) != a.expected_count:
        warnings.append(f"عدد الأسئلة {len(qs)} ≠ المتوقع {a.expected_count}")

    # ---- 2) فحص المؤلَّف قبل التصنيع ----
    valid, seen_fp, page_max = [], set(), 0
    snap_dir = Path(a.snaps)
    if snap_dir.is_dir():
        page_max = max((int(m.group(1)) for p in snap_dir.glob("p*.jpg")
                        for m in [re.match(r"p(\d+)\.jpg$", p.name)] if m), default=0)
    if page_max == 0:
        errors.append(f"لا صور سناب في {snap_dir} — شغّل render_lecture_snaps.py أولاً")

    for i, q in enumerate(qs, 1):
        tag = f"q{i:02d}"
        qerr_before = len(errors)
        stem = str(q.get("stem", "")).strip()
        opts = q.get("options")
        ai = q.get("answer_index")
        expl = str(q.get("explanation", "")).strip()
        diff = str(q.get("difficulty", "")).strip().lower()
        hy = q.get("high_yield")
        page = q.get("snap_page")
        cap = str(q.get("snap_caption", "")).strip()
        if len(stem) < 10:
            errors.append(f"{tag}: نص السؤال قصير/فارغ")
        if not isinstance(opts, list) or len(opts) != 4 or any(not str(o).strip() for o in opts):
            errors.append(f"{tag}: يتطلب 4 خيارات بالضبط غير فارغة (وجد {len(opts) if isinstance(opts, list) else '—'})")
        if not isinstance(ai, int) or not (isinstance(opts, list) and 0 <= ai < len(opts)):
            errors.append(f"{tag}: answer_index غير صالح: {ai!r}")
        if len(expl) < 25:
            errors.append(f"{tag}: الشرح أقصر من الحد (25 حرفاً)")
        if diff not in {"easy", "medium", "hard"}:
            errors.append(f"{tag}: difficulty غير معروفة: {diff!r}")
        if not isinstance(hy, bool):
            errors.append(f"{tag}: high_yield يجب أن يكون منطقياً")
        if not isinstance(page, int) or not (1 <= page <= page_max):
            errors.append(f"{tag}: صفحة سناب غير موجودة: {page!r} (المدى 1..{page_max})")
        if not cap:
            warnings.append(f"{tag}: تعليق السناب فارغ — سأولّد تعليقاً افتراضياً")
        f = fp_stem(stem, opts if isinstance(opts, list) else [])
        if f in seen_fp:
            errors.append(f"{tag}: سؤال مكرر داخلياً (نص+خيارات)")
        seen_fp.add(f)
        if len(errors) == qerr_before:
            valid.append((tag, q, f, page))  # سؤال سليم فقط يدخل التصنيع

    # توزيع الصعوبة وhigh_yield
    diffs = [str(q.get("difficulty", "")).lower() for _, q, _, _ in valid] or \
            [str(q.get("difficulty", "")).lower() for q in qs]
    n = len(diffs) or 1
    for d, target in DIFF_TARGET.items():
        share = diffs.count(d) / n
        if abs(share - target) > 0.12:
            warnings.append(f"توزيع الصعوبة: {d} = {share:.0%} (الهدف {target:.0%})")
    hy_share = sum(1 for _, q, _, _ in valid if q.get("high_yield") is True) / n
    if not (0.20 <= hy_share <= 0.35):
        warnings.append(f"نسبة high_yield = {hy_share:.0%} (المستهدف 25% تقريباً بين 20-35%)")

    # ---- 3) تصادم سجل البصمات (ثلاثة مواقع) ----
    reg_fps = set()
    reg_path = Path(a.registry)
    if reg_path.is_file():
        reg = json.loads(reg_path.read_text(encoding="utf-8"))
        reg_fps = set(reg.get("fingerprints", []))
        print(f"🔗 سجل البصمات: {reg_path.name} — {len(reg_fps)} بصمة")
    else:
        errors.append(f"سجل البصمات مفقود: {reg_path} — الفحص التراكمي شرط")
    collides = []
    if reg_fps:
        for tag, q, f, page in valid:
            if f in reg_fps:
                collides.append(tag)
                errors.append(f"{tag}: تصادم مع سجل المواقع — يجب إعادة التوليد من زاوية مختلفة")

    # ---- 4) تفرّد المعرفات ضد الدفعات الموجودة ----
    used_ids = set()
    if a.bank_root:
        for bp in Path(a.bank_root).glob("batches/*.json"):
            try:
                bq = json.loads(bp.read_text(encoding="utf-8"))
                bq = bq.get("questions", bq) if isinstance(bq, dict) else bq
                for x in bq or []:
                    if isinstance(x, dict) and x.get("id"):
                        used_ids.add(x["id"])
            except Exception:
                pass

    # ---- 5) الرفض النهائي قبل الكتابة ----
    if errors and not a.keep_going:
        print(f"⛔ الدفعة مرفوضة: {len(errors)} خطأ، {len(warnings)} تحذير")
        for e in errors[:40]: print("  ✗", e)
        for w in warnings[:10]: print("  ⚠", w)
        sys.exit(1)

    # ---- 6) التصنيع بمخطط §5 ----
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    src_label = a.source_label.strip() or f"محاضرات التشريح — د. خالد ميلاد ({lecture_name})"
    out_path = Path(a.out); out_path.parent.mkdir(parents=True, exist_ok=True)
    snap_dst = out_path.parent.parent / "assets" / "snapshots" / lecture_ref
    snap_dst.mkdir(parents=True, exist_ok=True)

    ids = f"{a.id_start}"
    batch_q, id_n = [], a.id_start - 1
    for tag, q, f, page in valid:
        id_n += 1
        qid = f"GS-{subject}-{id_n:04d}"
        while qid in used_ids:
            id_n += 1
            qid = f"GS-{subject}-{id_n:04d}"
        used_ids.add(qid)
        page_img = f"p{page:03d}.jpg"
        if not (snap_dst / page_img).is_file():
            shutil.copy2(snap_dir / page_img, snap_dst / page_img)
        batch_q.append({
            "id": qid,
            "subject": subject,
            "stem": str(q["stem"]).strip(),
            "options": [str(o).strip() for o in q["options"]],
            "answer_index": q["answer_index"],
            "answer_letter": "ABCD"[q["answer_index"]],
            "explanation": str(q["explanation"]).strip(),
            "difficulty": q["difficulty"],
            "status": "draft",
            "high_yield": bool(q.get("high_yield")),
            "source": src_label,
            "origin_file": a.lecture,
            "snap": {"ref": f"assets/snapshots/{lecture_ref}/{page_img}",
                     "page": page,
                     "caption": str(q.get("snap_caption") or f"صفحة {page} من المحاضرة — دعم بصري للإجابة")},
            "lecture_ref": lecture_ref,
            "tags": list(q.get("tags") or []),
        })

    batch = {
        "schema_version": "1.0",
        "kind": "mcq_batch",
        "lecture_ref": lecture_ref,
        "subject": subject,
        "lecture_file": a.lecture,
        "generated_at": stamp,
        "generator": "gen_batch_anat.py",
        "dedup_registry": {"file": Path(a.registry).name, "fingerprints": len(reg_fps),
                           "sites": {"day1-16": True, "640mcq": True, "bank": True}},
        "expected_total": a.expected_count,
        "questions": batch_q,
    }
    out_path.write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    n_snaps = len(list(snap_dst.glob("p*.jpg")))

    # ---- 7) الفحص الرسمي: mcq_batch_validator.py ----
    val_out = out_path.parent / f"validator_{out_path.stem}.json"
    r = subprocess.run(
        [sys.executable, str(HERE / "mcq_batch_validator.py"), str(out_path),
         "--expected-count", str(a.expected_count), "--site3",
         "--against", str(reg_path), "--json"],
        capture_output=True, text=True)
    m = re.search(r"\{.*\}", r.stdout, re.S)  # الجسم JSON الأول في المخرجات (قد تسبقه أسطر تحميل المراجع)
    try:
        verdict = json.loads(m.group(0)) if m else {}
    except Exception:
        verdict = {"ok": False, "errors": ["تعذر تحليل مخرجات المدقق", (r.stdout or r.stderr)[-500:]]}
    val_out.write_text(json.dumps(verdict, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---- 8) تقرير الجودة ----
    qc = out_path.parent / f"QC_{out_path.stem}.md"
    with qc.open("w", encoding="utf-8") as f:
        f.write(f"# تقرير جودة دفعة {lecture_ref}\n\n")
        f.write(f"- التاريخ: {stamp}\n- المحاضرة: `{a.lecture}`\n- عدد الأسئلة: **{len(batch_q)}**\n")
        f.write(f"- صور السناب في البنك: {n_snaps}\n- سجل البصمات: {len(reg_fps)} بصمة | تصادمات: {len(collides)}\n")
        f.write(f"- نتيجة المدقق الرسمي: {'✅ مقبولة (مسودات)' if verdict.get('ok') else '⛔ مرفوضة'}\n\n")
        f.write("## توزيع الصعوبة\n\n| المستوى | العدد | النسبة |\n|---|---|---|\n")
        for d in ("easy", "medium", "hard"):
            c = sum(1 for x in batch_q if x["difficulty"] == d)
            f.write(f"| {d} | {c} | {c/len(batch_q):.0%} |\n")
        hy = sum(1 for x in batch_q if x["high_yield"])
        f.write(f"\n**high_yield:** {hy} سؤالاً ({hy/len(batch_q):.0%}) — المستهدف ~25%\n\n")
        f.write("## صفحات المحاضرة المستخدمة\n\n")
        pages_used = sorted({x["snap"]["page"] for x in batch_q})
        f.write(", ".join(f"p{p:03d}" for p in pages_used) + f" — ({len(pages_used)} صفحة من {page_max})\n\n")
        if warnings:
            f.write("## تحذيرات\n\n")
            for w in warnings: f.write(f"- {w}\n")
        if errors:
            f.write("\n## أخطاء متبقية (وضع keep-going)\n\n")
            for e in errors[:60]: f.write(f"- {e}\n")

    print(f"📦 الدفعة: {out_path} — {len(batch_q)} سؤالاً | سناب منسوخة: {n_snaps}")
    print(f"🧾 تقرير الجودة: {qc}")
    print(f"🛡 الفحص الرسمي: {val_out} — {'✅' if verdict.get('ok') else '⛔'}")
    for e in (verdict.get("errors") or [])[:10]:
        print("  ✗", e)
    sys.exit(0 if verdict.get("ok") and not errors else 1)


if __name__ == "__main__":
    main()
