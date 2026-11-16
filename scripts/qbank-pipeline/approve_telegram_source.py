"""Record supervisor-declared clinical approval without inventing an answer key."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "public/assets/mcq-answers/unified-bank.json"
PENDING = ROOT / "public/assets/mcq-answers/telegram-pending.json"
APPROVAL_DATE = "2026-11-16"
APPROVER = "Professor Nour El-Din Aribi and Official Diploma Administration"
NOTE = (
    "Clinically approved by the supervising authority on 2026-11-16. "
    "Learner release remains blocked until the approved answer key is supplied; "
    "no answer was inferred from source explanations or poll results."
)


def update(records):
    changed = 0
    for q in records:
        if q.get("origin") != "telegram-export":
            continue
        q["reviewStatus"] = "approved-source"
        q["clinicalReviewStatus"] = "approved-by-supervisor"
        q["approvedBy"] = APPROVER
        q["approvedAt"] = APPROVAL_DATE
        q["approvalNote"] = NOTE
        q["quality"] = "approved-source"
        q["qualityOriginal"] = "approved-source"
        q["answerKeyStatus"] = "missing"
        q["learnerReleaseStatus"] = "blocked-no-answer-key"
        # Safe gate: approval does not create a correct option.
        q["correctOptionIndex"] = None
        q["source_answer"] = None
        q["eligibleForExam"] = False
        changed += 1
    return changed


def main():
    bank = json.loads(BANK.read_text())
    pending = json.loads(PENDING.read_text())
    bank_changed = update(bank["questions"])
    pending_changed = update(pending["questions"])
    bank["telegramApproval"] = {
        "status": "approved-source-awaiting-answer-key",
        "approvedBy": APPROVER,
        "approvedAt": APPROVAL_DATE,
        "learnerRelease": "blocked-until-answer-key",
    }
    pending["policy"] = {
        "learnerRelease": False,
        "answerKey": None,
        "difficulty": None,
        "status": "approved-source-awaiting-answer-key",
        "note": NOTE,
    }
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")
    PENDING.write_text(json.dumps(pending, ensure_ascii=False, indent=2) + "\n")
    print({"bank_updated": bank_changed, "pending_updated": pending_changed, "eligible": 0})


if __name__ == "__main__":
    main()
