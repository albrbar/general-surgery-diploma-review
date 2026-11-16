export const telegramSources = {
  "inspectionDate": "2026-11-16",
  "groups": [
    {
      "id": "group1",
      "title": "دبلومة الجراحة العامة",
      "kind": "Announcements and lecture files",
      "memberCount": 38,
      "visibleMessages": 35,
      "dateRange": {
        "from": "2026-10-05",
        "to": "2026-11-14"
      },
      "examAnnouncement": {
        "date": "2026-11-21",
        "time": "09:00",
        "location": "مركز تنمية القوى العاملة الطبية",
        "format": "MCQ",
        "questionCount": 80,
        "sourceMessageId": "4294967457"
      },
      "fileCount": 23,
      "gaps": [
        "لم يظهر بنك MCQ أو أسئلة تدريبية أو مفتاح إجابة في الرسائل المحمّلة.",
        "لا توجد خريطة رسمية تربط كل ملف بمحور الامتحان أو بعدد الأسئلة.",
        "لا يظهر ملف acid base مستقل في النطاق المرئي، رغم ذكر المحور في إعلان الامتحان.",
        "لم يظهر موعد أو قالب أو معايير تقييم أو اختيار لمتطلب case presentation.",
        "لم يظهر توزيع الأسئلة، مدة الامتحان، درجة النجاح، أو تعليمات الحضور التفصيلية.",
        "لم تُثبت محتويات الشرائح أو مطابقتها للمحاور؛ التصنيفات مبنية على أسماء الملفات.",
        "المحاور الأساسية Pathology وanatomy وpharmacology وMicrobiology لا يظهر لكل منها ملف مستقل واضح في التغطية الحالية، باستثناء ملف immunology ذي الاسم المطابق لمحور معلن."
      ]
    },
    {
      "id": "group2",
      "title": "Diploma GS الدفعة الثالثة 6-2026",
      "kind": "Videos and MCQ review",
      "memberCount": 32,
      "visibleMessages": 168,
      "dateRange": {
        "from": "2026-08-29",
        "to": "2026-11-16"
      },
      "examAnnouncement": null,
      "fileCount": 9,
      "questionCount": 58,
      "missingQuestionNumbers": [
        1
      ],
      "duplicateQuestionNumbers": [
        31,
        37
      ],
      "questionsWithExplanations": 57,
      "gaps": [
        "لم يظهر إعلان امتحان أو نطاق منهج أو رسالة مثبتة في موضوعات المجموعة المفحوصة.",
        "لم يُلتقط السؤال 1، ولا يثبت العدد 58 اكتمال بنك المجموعة كله.",
        "حُفظت بعض رسائل السؤال والشرح دون الاستطلاع المصاحب، لكن جميع النصوص والخيارات الخمسة مكتملة.",
        "ظهر نشر مكرر للسؤال 31 بالنص والخيارات نفسها؛ احتُسب مرة واحدة مع حفظ معرفي المصدر.",
        "كل source_answer=null؛ لم تُعتمد إجابات أو تُفسر أصوات الاستطلاعات كمفتاح حل.",
        "لا توجد مطابقة متحققة مع بنك Day1–16 أو Q Bank3 ولا خريطة رسمية لكل سؤال إلى المنهج.",
        "لم تُفتح الفيديوهات أو تُنزّل ولا توجد روابط تنزيل عامة دائمة."
      ]
    }
  ],
  "policy": {
    "learnerRelease": false,
    "answerKey": null,
    "difficulty": null,
    "status": "approved-source-awaiting-answer-key",
    "note": "Source content is clinically approved by the supervising authority; learner release remains blocked until the approved answer key is supplied."
  }
} as const;
