export type PreviewQuestion = {
  id: string;
  stem: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type RevisionDay = {
  number: number;
  code: string;
  title: string;
  english: string;
  questions: PreviewQuestion[];
};

const daySeed = [
  ['التشريح الجراحي', 'Surgical anatomy'], ['الفسيولوجيا والرعاية المحيطة بالجراحة', 'Physiology & perioperative care'],
  ['الإصابات وجراحة الطوارئ', 'Trauma & emergency surgery'], ['جراحة البطن', 'Abdominal surgery'],
  ['جراحة الكبد والمرارة', 'Hepatobiliary surgery'], ['جراحة البنكرياس والطحال', 'Pancreas & spleen'],
  ['جراحة القولون والمستقيم', 'Colorectal surgery'], ['أمراض الشرج والمستقيم', 'Anorectal conditions'],
  ['جراحة الثدي والغدد الصماء', 'Breast & endocrine surgery'], ['جراحة الأوعية الدموية', 'Vascular surgery'],
  ['المسالك والموضوعات المرتبطة', 'Urology & related topics'], ['جراحة الأطفال', 'Paediatric surgery'],
  ['الزراعة والأورام', 'Transplantation & oncology'], ['العناية المركزة والمضاعفات', 'Critical care & complications'],
  ['القرار الجراحي', 'Operative decision-making'], ['المراجعة التكاملية النهائية', 'Final integrated revision'],
] as const;

const previewOptions = ['السؤال والخيارات وحالة الإجابة', 'العنوان فقط دون خيارات', 'رابط خارجي بلا حالة', 'صورة زخرفية فقط'];

function createQuestions(dayNumber: number): PreviewQuestion[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `DAY-${String(dayNumber).padStart(2, '0')}-PREVIEW-${String(index + 1).padStart(2, '0')}`,
    stem: `سؤال معاينة تقني ${index + 1}: ما العنصر الذي يجب أن يظهر في بطاقة السؤال في اليوم ${dayNumber}؟`,
    options: previewOptions,
    correctOptionIndex: 0,
    explanation: 'هذه إجابة معاينة تقنية للتحقق من تدفق الاختيار وكشف الشرح وحفظ النتيجة. لا تمثل سؤالًا طبيًا ولا تُستخدم للاعتماد أو الاختبار.',
    sourceLabel: 'بيانات واجهة المعاينة — ليست مصدرًا سريريًا',
    sourceUrl: 'https://github.com/albrbar/general-surgery-diploma-review/tree/content/issue-5-qbank3-anatomy/src/data',
  }));
}

export const revisionDays: RevisionDay[] = daySeed.map(([title, english], index) => ({
  number: index + 1,
  code: `DAY-${String(index + 1).padStart(2, '0')}`,
  title,
  english,
  questions: createQuestions(index + 1),
}));
