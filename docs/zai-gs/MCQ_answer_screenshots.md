# MCQ answer screenshots

Place one answer screenshot per approved question in this directory.

## Naming convention

Use the stable question ID as the filename:

```text
GS-ABD-0001.png
GS-TRA-0002.webp
GS-END-0003.jpg
```

The corresponding JSON record should reference the file with a relative path:

```json
{
  "id": "GS-ABD-0001",
  "answerImage": "./GS-ABD-0001.png",
  "answerImageAlt": "Answer explanation screenshot for GS-ABD-0001"
}
```

Keep the answer image separate from the question stem. The MCQ interface must not render `answerImage` until the learner submits an answer or explicitly selects **Show Answer**.

Use `status: "approved"` only after the question and its clinical reference have passed review. Draft or pending records must not be shown in the learner-facing interface.
