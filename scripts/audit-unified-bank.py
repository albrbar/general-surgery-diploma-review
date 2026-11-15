#!/usr/bin/env python3
"""Deterministic quality gate for the unified MCQ bank."""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

BANK = Path('public/assets/mcq-answers/unified-bank.json')
REPORT = Path('public/assets/mcq-answers/unified-bank-audit.json')
TARGET = 40
ALLOWED = {'easy', 'moderate', 'hard', 'very easy', 'very hard'}

def clean(s):
    return re.sub(r'[^a-z0-9]+', '', str(s).lower())

def main():
    data = json.loads(BANK.read_text(encoding='utf-8'))
    questions = data.get('questions', [])
    errors, seen, by_source = [], set(), defaultdict(list)
    for i, q in enumerate(questions, 1):
        src = q.get('source') or 'Unassigned'
        by_source[src].append(q)
        stem = q.get('stem', '')
        fp = clean(stem)
        if not isinstance(stem, str) or len(stem.strip()) < 25: errors.append([i, 'short stem'])
        if fp in seen: errors.append([i, 'duplicate stem'])
        seen.add(fp)
        opts = q.get('options')
        if not isinstance(opts, list) or len(opts) != 4: errors.append([i, 'must have exactly four options'])
        elif len({clean(x) for x in opts}) != 4: errors.append([i, 'duplicate options'])
        if q.get('correctOptionIndex') not in range(4): errors.append([i, 'invalid correct option'])
        if not isinstance(q.get('explanation'), str) or len(q.get('explanation','').strip()) < 25: errors.append([i, 'short explanation'])
        if not isinstance(src, str) or not src.strip(): errors.append([i, 'missing source'])
        if q.get('difficulty','').lower() not in ALLOWED: errors.append([i, 'invalid difficulty'])
    summary = {}
    for src, qs in sorted(by_source.items()):
        diff = Counter(q.get('difficulty','').lower() for q in qs)
        summary[src] = {'count': len(qs), 'shortfallTo40': max(0, TARGET-len(qs)), 'difficulty': dict(diff), 'qualityIssues': 0}
    for i, reason in errors:
        src = questions[i-1].get('source') or 'Unassigned'
        summary[src]['qualityIssues'] += 1
    report = {'bankQuestions': len(questions), 'sourceCount': len(summary), 'targetPerSource': TARGET, 'sources': summary, 'qualityIssueCount': len(errors), 'qualityIssues': errors[:500], 'status': 'pass' if not errors else 'fail'}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'questions': len(questions), 'sources': len(summary), 'qualityIssues': len(errors), 'shortSources': sum(v['shortfallTo40'] > 0 for v in summary.values())}, ensure_ascii=False))
    for src, v in summary.items():
        if v['shortfallTo40'] or v['qualityIssues']:
            print(f"{src}\tcount={v['count']}\tshortfall={v['shortfallTo40']}\tqualityIssues={v['qualityIssues']}")
    return 0 if not errors else 1

if __name__ == '__main__': sys.exit(main())
