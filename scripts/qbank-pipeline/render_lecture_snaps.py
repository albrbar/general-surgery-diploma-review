#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_lecture_snaps.py — تحويل صفحات محاضرة (PDF أو Word) إلى صور سناب | GSDIPLOMAREVISION
يُستخدم في دورة G قبل gen_batch_anat.py: يولّد صورة JPEG لكل صفحة من صفحات المحاضرة
لتُستخدم في حقل snap لأسئلة بنك MCQ (الموقع الثالث).

الاستخدام:
  python3 render_lecture_snaps.py "lecture.pdf"  --out-dir snaps_ANAT-L01 [--dpi 110] [--pages 1-30,35]
  python3 render_lecture_snaps.py "lecture.docx" --out-dir snaps_ANAT-L01
ملاحظات:
  - PDF: pdftoppm مباشرة. Word: soffice يحوّله إلى PDF مؤقتاً ثم تُرسم الصفحات.
  - المخرجات: <out-dir>/p001.jpg، p002.jpg … (ترقيم من 1 مطابق لصفحات PDF الأصلية).
  - --pages تحصر الصفحات المطلوبة فقط (أوفّر للحجم إذا سناب بعض الصفحات فقط).
"""
import argparse, shutil, subprocess, sys, tempfile
from pathlib import Path


def parse_pages(spec, max_page):
    """'1-30,35' → [1..30,35]؛ افتراضي: كل الصفحات."""
    if not spec:
        return list(range(1, max_page + 1))
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            pages |= set(range(int(a), int(b) + 1))
        elif part:
            pages.add(int(part))
    return sorted(p for p in pages if 1 <= p <= max_page)


def pdf_pages(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True)
    if out.returncode != 0:
        print(f"⛔ pdfinfo فشل: {out.stderr.strip()}"); sys.exit(1)
    for line in out.stdout.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    print("⛔ لم أعثر على عدد الصفحات"); sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lecture", help="ملف المحاضرة PDF أو DOCX")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--dpi", type=int, default=110)
    ap.add_argument("--pages", default="", help="مثل 1-30,35 — فارغ = كل الصفحات")
    a = ap.parse_args()

    src = Path(a.lecture).expanduser()
    if not src.is_file():
        print(f"⛔ الملف غير موجود: {src}"); sys.exit(1)

    tmp = None
    if src.suffix.lower() in {".pdf"}:
        pdf = src
    elif src.suffix.lower() in {".docx", ".doc"}:
        tmp = tempfile.mkdtemp(prefix="lecture_pdf_")
        print("⏳ تحويل Word إلى PDF عبر soffice …")
        r = subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, str(src)],
            capture_output=True, text=True, timeout=300)
        pdf = Path(tmp) / (src.stem + ".pdf")
        if not pdf.is_file():
            print(f"⛔ فشل التحويل: {r.stderr.strip()[:500]}"); sys.exit(1)
    else:
        print("⛔ صيغة غير مدعومة (PDF أو DOCX)"); sys.exit(1)

    total = pdf_pages(pdf)
    pages = parse_pages(a.pages, total)
    out_dir = Path(a.out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    print(f"📄 الصفحات: {total} | ستُرسم: {len(pages)} | DPI: {a.dpi}")

    for p in pages:
        out_prefix = out_dir / f"p{p:03d}"
        r = subprocess.run(
            ["pdftoppm", "-f", str(p), "-l", str(p), "-r", str(a.dpi),
             "-jpeg", "-jpegopt", "quality=80", str(pdf), str(out_prefix)],
            capture_output=True, text=True)
        produced = sorted(out_dir.glob(f"p{p:03d}*.jpg"))
        if produced:
            # pdftoppm قد يضيف لاحقة رقم الصفحة: نوحّدها إلى p003.jpg
            final = out_dir / f"p{p:03d}.jpg"
            if produced[0] != final:
                shutil.move(str(produced[0]), str(final))
        elif r.returncode != 0:
            print(f"⚠️ صفحة {p}: {r.stderr.strip()[:200]}")

    n = len(list(out_dir.glob("p*.jpg")))
    print(f"✅ {n} صورة سناب في {out_dir}")
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    sys.exit(0 if n == len(pages) else 1)


if __name__ == "__main__":
    main()
