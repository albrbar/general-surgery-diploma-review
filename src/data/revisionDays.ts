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
  ['Surgical Anatomy', 'Surgical anatomy'], ['Physiology and Perioperative Care', 'Physiology & perioperative care'],
  ['Trauma and Emergency Surgery', 'Trauma & emergency surgery'], ['Abdominal Surgery', 'Abdominal surgery'],
  ['Hepatobiliary Surgery', 'Hepatobiliary surgery'], ['Pancreatic and Splenic Surgery', 'Pancreas & spleen'],
  ['Colorectal Surgery', 'Colorectal surgery'], ['Anorectal Conditions', 'Anorectal conditions'],
  ['Breast and Endocrine Surgery', 'Breast & endocrine surgery'], ['Vascular Surgery', 'Vascular surgery'],
  ['Urology and Related Topics', 'Urology & related topics'], ['Paediatric Surgery', 'Paediatric surgery'],
  ['Transplantation and Oncology', 'Transplantation & oncology'], ['Critical Care and Complications', 'Critical care & complications'],
  ['Operative Decision-Making', 'Operative decision-making'], ['Final Integrated Revision', 'Final integrated revision'],
] as const;

const previewOptions = ['The question, answer options, and answer state', 'A title without answer options', 'An external link without answer state', 'A decorative image only'];

function createQuestions(dayNumber: number): PreviewQuestion[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `DAY-${String(dayNumber).padStart(2, '0')}-PREVIEW-${String(index + 1).padStart(2, '0')}`,
    stem: `Technical preview question ${index + 1}: Which element should appear in the question card for Day ${dayNumber}?`,
    options: previewOptions,
    correctOptionIndex: 0,
    explanation: 'This is a technical preview answer used to verify selection flow, explanation reveal, and score persistence. It is not a medical question and must not be used for clinical approval or examination.',
    sourceLabel: 'Preview interface data — not a clinical source',
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
