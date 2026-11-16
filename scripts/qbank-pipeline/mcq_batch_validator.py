#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mcq_batch_validator.py v1.2 — مدقق دفعات MCQ | GSDIPLOMAREVISION
دورة G: 80 MCQ لكل محاضرة (مثل exam/anatomy drkhaledmilad) بشرط عدم التكرار عبر ثلاثة مواقع.

الاستخدام:
  python3 mcq_batch_validator.py gen_ANAT-L01.json [--expected-count 80]
          [--site3] [--against day16_pool.json 640mcq_pool.json] [--json]

المحكومات الأساسية:
  - مخطط القسم 5 من GOVERNANCE.md كامل الحقول، معرف GS-<SUBJECT>-NNNN فريد.
  - subject من الرموز العشرة، answer_index داخل الحدود، difficulty معروفة.
  - status = draft حصراً (المولّد لا ينتج معتمداً).
  - لا تكرار داخلي (نص + خيارات).
وضع الموقع الثالث (--site3) يضيف:
  - 4 خيارات بالضبط (أسلوب الموقع المعتمد).
  - حقل snap بصورة سناب (ref إلزامي يشير إلى assets/snapshots/...).
  - lecture_ref يربط السؤال بمحاضرته.
منع التكرار عبر المواقع (--against ملف1 ملف2 ...):
  - كل ملف مرجعي: قائمة أسئلة أو كائن فيه questions/items/bank.
  - بصمة stem+options مطبّعة (عربياً: توحيد الألف/الهاء/الياء، إزالة التشكيل، ضغط المسافات).
  - أي تصادم = خطأ رفض للدفعة.
خروج نظيف = 0، فشل = 1.

v1.2: إضافة الرمز ANAT (العلوم الأساسية — التشريح) للمواد المعتمدة وصيغة المعرف،
  لسرد دورة G على محاضرات exam/anatomy drkhaledmilad (باقات ANAT-Lxx)؛ يُضاف الرمز
  نفسه إلى syllabus/subject_codes.json عند أول Apply بعد التوليد (قاعدة القسم 4-5).
"""
import argparse, hashlib, json, re, sys

SUBJECTS = {"ABD", "BRST", "TRA", "ENDO", "PEDS", "CRST", "VASC", "THOR", "CRIT", "GEN", "ANAT"}
REQUIRED = ["id", "subject", "stem", "options", "answer_index", "explanation",
            "difficulty", "status", "high_yield", "source", "origin_file"]
ID_RE = re.compile(r"^GS-(?:ABD|BRST|TRA|ENDO|PEDS|CRST|VASC|THOR|CRIT|GEN|ANAT)-\d{4}$")
DIFFS = {"easy", "medium", "hard"}
DRAFTS = {"draft", "pending", "review", "مسودة", "قيد المراجعة", "غير معتمد"}
APPROVED = {"approved", "final", "published", "معتمد", "نهائي", "مقبول"}

_DIAC = re.compile(r"[\u064B-\u0652\u0670]")
_NORM_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ـ": ""})


def norm_ar(s: str) -> str:
    s = _DIAC.sub("", str(s))
    s = s.translate(_NORM_MAP)
    return re.sub(r"\s+", " ", s).strip().lower()


def fp_stem(stem, options):
    raw = norm_ar(stem) + "|" + "|".join(sorted(norm_ar(o) for o in (options or [])))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def load_pool(path):
    """يقرأ ملفاً مرجعياً: بصمات جاهزة (dedup_pool/registry) أو أسئلة خام."""
    doc = json.loads(open(path, encoding="utf-8").read())
    if isinstance(doc, dict) and isinstance(doc.get("fingerprints"), list) \
            and all(isinstance(x, str) and len(x) >= 16 for x in doc["fingerprints"]):
        fps = set(doc["fingerprints"])
        return fps, len(fps)
    qs = doc if isinstance(doc, list) else None
    if qs is None:
        for k in ("questions", "items", "bank", "question_bank", "data", "mcqs"):
            if isinstance(doc, dict) and isinstance(doc.get(k), list):
                qs = doc[k]; break
    fps = set()
    for q in qs or []:
        if not isinstance(q, dict):
            continue
        stem = q.get("stem") or q.get("question") or q.get("السؤال") or q.get("نص السؤال") or ""
        opts = q.get("options") or q.get("choices") or q.get("الخيارات") or q.get("الاختيارات") or []
        if isinstance(opts, dict):
            opts = [v for v in opts.values()]
        if str(stem).strip():
            fps.add(fp_stem(stem, opts))
    return fps, len(fps)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("batch")
    ap.add_argument("--expected-count", type=int, default=80)
    ap.add_argument("--site3", action="store_true", help="وضع الموقع الثالث: 4 خيارات + صورة سناب + lecture_ref")
    ap.add_argument("--against", nargs="*", default=[], help="ملفات بصمات المواقع الأخرى لمنع التكرار العابر")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    errors, warnings, seen_ids, seen_fps = [], [], set(), set()
    try:
        doc = json.loads(open(a.batch, encoding="utf-8").read())
    except Exception as e:
        print(f"⛔ JSON غير صالح: {e}"); sys.exit(1)

    qs = doc.get("questions") if isinstance(doc, dict) else doc
    if not isinstance(qs, list):
        errors.append("البنية: قائمة أسئلة أو كائن فيه questions:[]")
        qs = []

    if len(qs) != a.expected_count:
        warnings.append(f"عدد الأسئلة {len(qs)} ≠ المتوقع {a.expected_count}")

    pools = {}
    for p in a.against:
        try:
            fps, cnt = load_pool(p)
            pools[p] = fps
            print(f"🔗 حمّلت المرجع {p}: {cnt} بصمة")
        except Exception as e:
            errors.append(f"تعذر قراءة ملف مرجعي {p}: {e}")

    cross_hits = []
    for i, q in enumerate(qs, 1):
        qid = q.get("id") or f"#{i}"
        for f in REQUIRED:
            if f not in q or q[f] in (None, ""):
                errors.append(f"{qid}: حقل إلزامي مفقود/فارغ: {f}")
        if not ID_RE.match(str(q.get("id", ""))):
            errors.append(f"{qid}: صيغة المعرف غير صحيحة: {q.get('id')!r}")
        elif q["id"] in seen_ids:
            errors.append(f"{qid}: معرف مكرر داخل الدفعة")
        else:
            seen_ids.add(q["id"])
        if q.get("subject") not in SUBJECTS:
            errors.append(f"{qid}: مادة غير معتمدة: {q.get('subject')!r}")
        stem = str(q.get("stem", "")).strip()
        if len(stem) < 10:
            errors.append(f"{qid}: نص السؤال قصير/فارغ")
        opts = q.get("options")
        if not isinstance(opts, list) or any(not str(o).strip() for o in (opts or [])):
            errors.append(f"{qid}: خيارات غير صالحة")
        elif a.site3 and len(opts) != 4:
            errors.append(f"{qid}: الموقع الثالث يتطلب 4 خيارات بالضبط (وجد {len(opts)})")
        elif not a.site3 and len(opts) < 2:
            errors.append(f"{qid}: خياران على الأقل مطلوبة")
        ai = q.get("answer_index")
        if not isinstance(ai, int) or not (0 <= ai < len(opts or [])):
            errors.append(f"{qid}: answer_index خارج الحدود: {ai!r}")
        if q.get("difficulty") not in DIFFS:
            errors.append(f"{qid}: difficulty غير معروفة: {q.get('difficulty')!r}")
        sval = str(q.get("status", "")).strip().lower()
        if sval in APPROVED:
            errors.append(f"{qid}: المولّد ينتج مسودات فقط — status معتمد مرفوض")
        elif sval not in DRAFTS:
            errors.append(f"{qid}: status غير معروفة: {q.get('status')!r}")
        if not isinstance(q.get("high_yield"), bool):
            errors.append(f"{qid}: high_yield يجب أن يكون منطقياً")
        if len(str(q.get("explanation", "")).strip()) < 10:
            warnings.append(f"{qid}: شرح الإجابة قصير")
        if a.site3:
            snap = q.get("snap")
            if not isinstance(snap, dict) or not str(snap.get("ref", "")).strip():
                errors.append(f"{qid}: صورة السناب مطلوبة (snap.ref يشير إلى assets/snapshots/...)")
            if not str(q.get("lecture_ref", "")).strip():
                errors.append(f"{qid}: lecture_ref مطلوب لربط السؤال بمحاضرته")
        f = fp_stem(stem, opts if isinstance(opts, list) else [])
        if f in seen_fps:
            errors.append(f"{qid}: سؤال مكرر داخل الدفعة (نص+خيارات)")
        seen_fps.add(f)
        for pname, pfps in pools.items():
            if f in pfps:
                cross_hits.append(f"{qid}: مكرر مع {pname}")

    for c in cross_hits:
        errors.append(c)

    result = {"batch": a.batch, "questions": len(qs), "site3": a.site3,
              "cross_duplicates": len(cross_hits), "errors": errors,
              "warnings": warnings, "ok": not errors}
    if a.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"=== مدقق الدفعة: {a.batch} ===")
        print(f"أسئلة: {len(qs)} | أخطاء: {len(errors)} | تحذيرات: {len(warnings)} | تكرار عابر للمواقع: {len(cross_hits)}")
        for e in errors[:30]:   print("  ✗", e)
        for w in warnings[:10]: print("  ⚠", w)
        print("النتيجة:", "✅ مقبولة للمسار (مسودات)" if not errors else "⛔ مرفوضة — صحّح ثم أعد التدقيق")
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
