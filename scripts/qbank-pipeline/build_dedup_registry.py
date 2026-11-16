#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_dedup_registry.py — بناء سجل بصمات منع التكرار | GSDIPLOMAREVISION (الموقع الثالث)
يحوّل تصديرات أسئلة المواقع الأخرى (day1-to-day16، 640 MCQ) بصيغ JSON/CSV/TSV/XLSX
إلى ملف بصمات مطبّعة عربياً، ويدمجها في dedup_registry.json موحداً لفحص الدفعات بـ:
  python3 mcq_batch_validator.py gen_X.json --site3 --against dedup_registry.json

الاستخدام:
  python3 build_dedup_registry.py --site day1-16 --out dedup_day1-16.json pool1.json pool2.csv
  python3 build_dedup_registry.py --merge dedup_day1-16.json dedup_640.json --out dedup_registry.json
ملاحظة: تُخزّن البصمات فقط (لا نصوص الأسئلة) — أخف وأأمن للتخزين.
"""
import argparse, csv, hashlib, json, re, sys, datetime

_DIAC = re.compile(r"[\u064B-\u0652\u0670]")
_NORM_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ـ": ""})
STEM_COLS = ["stem", "question", "سؤال", "نص السؤال", "السؤال", "question_text"]
OPTS_COLS = ["options", "choices", "الخيارات", "الاختيارات", "خيارات"]


def norm_ar(s):
    s = _DIAC.sub("", str(s))
    s = s.translate(_NORM_MAP)
    return re.sub(r"\s+", " ", s).strip().lower()


def fp(stem, opts):
    raw = norm_ar(stem) + "|" + "|".join(sorted(norm_ar(o) for o in opts))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def opts_from_row(row, colmap, sep_re=re.compile(r"\s*[|/;،]\s*")):
    """استخراج الخيارات: عمود واحد مفصول بـ |/;، أو أعمدة opt1..opt5/خيار1.."""
    single = next((colmap[c] for c in OPTS_COLS if c in colmap and str(row[colmap[c]] or "").strip()), None)
    if single is not None:
        parts = [p for p in sep_re.split(str(row[single]).strip()) if p.strip()]
        if len(parts) >= 2:
            return parts
    idx_cols = sorted((c for c in colmap
                       if re.match(r"^(opt|choice|خيار|اختيار)\s*[-_. ]?\d+$", c, re.I)),
                      key=lambda c: int(re.search(r"(\d+)$", c).group(1)))
    vals = [str(row[colmap[c]]).strip() for c in idx_cols]
    return [v for v in vals if v]


def read_table(path):
    """يقرأ JSON أو CSV/TSV/XLSX ويعيد قائمة أسئلة (dicts) بأي تسمية أعمدة شائعة."""
    p = str(path).lower()
    if p.endswith(".json"):
        doc = json.loads(open(path, encoding="utf-8").read())
        if isinstance(doc, list):
            return doc
        for k in ("questions", "items", "bank", "question_bank", "data", "mcqs"):
            if isinstance(doc, dict) and isinstance(doc.get(k), list):
                return doc[k]
        raise ValueError("بنية JSON غير معروفة")
    if p.endswith((".csv", ".tsv", ".txt")):
        sep = "\t" if p.endswith(".tsv") else None
        with open(path, encoding="utf-8-sig", newline="") as f:
            if sep is None:
                sep = ";" if f.readline().count(";") > f.readline().count(",") else ","
                f.seek(0)
            rows = list(csv.DictReader(f, delimiter=sep))
    elif p.endswith(".xlsx"):
        try:
            from openpyxl import load_workbook
        except ImportError:
            raise ValueError("openpyxl غير متاح — احفظ الملف CSV ثم أعد المحاولة")
        ws = load_workbook(path, read_only=True).active
        rows_iter = ws.iter_rows(values_only=True)
        header = [str(c or "").strip() for c in next(rows_iter)]
        rows = [dict(zip(header, r)) for r in rows_iter]
    else:
        raise ValueError("صيغة غير مدعومة (JSON/CSV/TSV/XLSX)")
    return rows


def collect(path):
    qs = read_table(path)
    if not qs:
        raise ValueError("لا أسئلة في الملف")
    colmap = {str(k).strip().lower(): k for k in qs[0].keys()}
    stem_col = next((colmap[c] for c in STEM_COLS if c in colmap), None)
    if stem_col is None:  # أول عمود نصي طويل يُعامل نص سؤال
        stem_col = max(colmap.values(), key=lambda c: len(str(qs[0].get(c) or "")))
    fps = set()
    opt_col = next((colmap[c] for c in OPTS_COLS if c in colmap), None)
    for r in qs:
        stem = str(r.get(stem_col) or "").strip()
        if not stem:
            continue
        raw = r.get(opt_col) if opt_col else None
        if isinstance(raw, (list, tuple)):  # مصدر JSON: الخيارات قائمة أصلية
            opts = [str(x).strip() for x in raw if str(x).strip()]
        else:
            opts = opts_from_row(r, colmap) if len(r) > 1 else []
        fps.add(fp(stem, opts))
    return fps, len(qs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", help="اسم الموقع المصدر (مثل day1-16 أو 640mcq)")
    ap.add_argument("--merge", nargs="*", help="ملفات بصمات قائمة لدمجها")
    ap.add_argument("--out", required=True, help="ملف الإخراج")
    ap.add_argument("inputs", nargs="*", help="ملفات الأسئلة الخام (JSON/CSV/TSV/XLSX)")
    a = ap.parse_args()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    if a.merge:
        sites, union = {}, set()
        for p in a.merge:
            d = json.loads(open(p, encoding="utf-8").read())
            sites[d.get("site", p)] = d.get("count", len(d.get("fingerprints", [])))
            union |= set(d.get("fingerprints", []))
        json.dump({"schema_version": "1.0", "kind": "dedup_registry", "generated_at": now,
                   "sites": sites, "total": len(union), "fingerprints": sorted(union)},
                  open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"✅ سجل مدمج: {a.out} | مواقع: {sites} | بصمات فريدة: {len(union)}")
        return

    if not a.site or not a.inputs:
        ap.error("يتطلب --site وملفات إدخال، أو --merge")
    union = set()
    for p in a.inputs:
        fps, n = collect(p)
        union |= fps
        print(f"  ↳ {p}: {n} سؤالاً → {len(fps)} بصمة")
    json.dump({"schema_version": "1.0", "kind": "dedup_pool", "site": a.site,
               "generated_at": now, "count": len(union), "fingerprints": sorted(union)},
              open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✅ بصمات {a.site}: {a.out} | فريدة: {len(union)}")


if __name__ == "__main__":
    main()
