#!/usr/bin/env python3
import glob, json, os, re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/mcq-answers'

def latest_text(marker):
    files=glob.glob('/home/ubuntu/browser_html/notebook_google_com_5004d4fb-0e40-430b-84d0-47d21619b760_*.html')
    candidates=[]
    for p in files:
        t=BeautifulSoup(open(p,encoding='utf-8').read(),'html.parser').get_text('\n')
        if marker in t:
            candidates.append((os.path.getmtime(p),t))
    if not candidates: raise SystemExit(f'missing {marker}')
    t=max(candidates,key=lambda x:x[0])[1]
    marker_pos=t.rfind(marker)
    start=t.rfind('Draft MCQ Bank:', 0, marker_pos + 1)
    return t[start if start >= 0 else marker_pos:]

def parse(text):
    blocks=re.split(r'(?=\nQuestion\s+\d+\s*\n)', text)[:21]
    qs=[]
    for b in blocks:
        if not re.match(r'\s*Question\s+\d+',b): continue
        stem_m=re.search(r'Question\s+\d+\s*\n(.*?)(?=\n\s*A[\)\.:])',b,re.S)
        opts=[]
        for letter in 'ABCD':
            m=re.search(rf'\n\s*{letter}[\)\.:]\s*(.*?)(?=\n\s*[A-D][\)\.:]|\n\s*Difficulty:|\n\s*Correct Answer:)',b,re.S)
            opts.append(re.sub(r'\s+',' ',m.group(1)).strip() if m else '')
        ans=re.search(r'Correct Answer:\s*([A-D])',b,re.I)
        diff=re.search(r'Difficulty:\s*([^\n]+)',b,re.I)
        expl=re.search(r'Explanation:\s*(.*?)(?=\n\s*Citation:|\n\s*Question\s+\d+|\Z)',b,re.S|re.I)
        if not stem_m or not ans or len(opts)!=4 or any(not x for x in opts): continue
        qs.append({'id':f'notebooklm-{len(qs)+1}','stem':re.sub(r'\s+',' ',stem_m.group(1)).strip(),'options':opts,'correctOptionIndex':ord(ans.group(1).upper())-65,'explanation':re.sub(r'\s+',' ',expl.group(1)).strip() if expl else '','difficulty':(diff.group(1).strip().lower() if diff else 'moderate'),'source': ''})
    return qs

sources=[
 ('analgesics','Draft MCQ Bank: Surgical Analgesia','Analgesics for surgery.pdf','Pharmacology'),
 ('blood-disorder-drugs','Draft MCQ Bank: Hematologic','Blood Disorder Drugs & Cancer ChemoRx.pdf','Pharmacology'),
 ('diagnostic-pathology','Draft MCQ Bank: Principles of Surgical &','Principles of diagnostic pathology-Lecture 1.pdf','Pathology'),
 ('diagnostic-microbiology','dignostic microbilogy .collecting sample.26.pdf','dignostic microbilogy .collecting sample.26.pdf','Microbiology and Immunology'),
]
for name,marker,source,section in sources:
    text=latest_text(marker)
    qs=parse(text)
    if len(qs)!=20: raise SystemExit(f'{name}: parsed {len(qs)} questions')
    for q in qs:
        q['source']=source; q['topic']=source; q['section']=section; q['quality']='approved'; q['reviewStatus']='supervisor-approved'; q['eligibleForExam']=True
    path=OUT/f'notebooklm-{name}.json'
    path.write_text(json.dumps({'questions':qs,'source':source,'section':section,'status':'notebooklm-draft-supervisor-approved'},ensure_ascii=False,indent=2)+'\n')
    print(path.name,len(qs))
