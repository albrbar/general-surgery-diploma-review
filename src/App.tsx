import { useEffect, useState } from 'react';

const previewLinks = {
  mcq640: 'https://gsexam-zv2uu94a.manus.space',
};

const assetBase = '/general-surgery-diploma-review/';

type Question = {
  id: string;
  topic?: string;
  subject?: string;
  difficulty: string;
  stem: string;
  options: string[];
  correctOptionIndex?: number;
  answer_index?: number;
  explanation: string;
  reference_snapshot?: string;
};

type Bank = {
  id: string;
  file: string;
  shortTitle: string;
  title: string;
  description: string;
  subject: string;
  color: string;
  tint: string;
  border: string;
  reviewNotice?: string;
};

const banks: Bank[] = [
  {
    id: 'abdomen',
    file: 'abdomen-80.json',
    shortTitle: 'Abdomen Anatomy',
    title: 'Abdomen Anatomy MCQ',
    description: 'Abdominal wall, inguinal region, gastrointestinal tract, hepatobiliary anatomy, pancreas, spleen, and peritoneum.',
    subject: 'ABD',
    color: 'text-orange-800',
    tint: 'bg-orange-100',
    border: 'border-orange-200 hover:border-orange-400',
  },
  {
    id: 'microbiology',
    file: 'microbiology-80.json',
    shortTitle: 'Microbiology & Immunology',
    title: 'Microbiology & Immunology MCQ',
    description: 'Specimen diagnostics, antimicrobial resistance, infection prevention, and immunology.',
    subject: 'MICRO',
    color: 'text-emerald-800',
    tint: 'bg-emerald-100',
    border: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    id: 'breast',
    file: 'breast-80.json',
    shortTitle: 'Chest / Breast Anatomy',
    title: 'Chest (Breast) Anatomy MCQ',
    description: 'Structure, lymphatic drainage, blood supply, and clinical anatomy.',
    subject: 'BRST',
    color: 'text-amber-800',
    tint: 'bg-amber-100',
    border: 'border-amber-200 hover:border-amber-400',
  },
  {
    id: 'pelvis-perineum',
    file: 'pelvis-perineum-80.json',
    shortTitle: 'Pelvis & Perineum',
    title: 'Pelvis & Perineum Anatomy MCQ',
    description: '80 source-provided questions with answers and explanations covering pelvic and perineal anatomy.',
    subject: 'PELV',
    color: 'text-violet-800',
    tint: 'bg-violet-100',
    border: 'border-violet-200 hover:border-violet-400',
  },
  {
    id: 'lower-limb',
    file: 'lower-limb-80.json',
    shortTitle: 'Lower Limb Anatomy',
    title: 'Lower Limb Anatomy MCQ',
    description: '80 source-provided questions with answers and explanations covering lower-limb anatomy.',
    subject: 'LOWER',
    color: 'text-sky-800',
    tint: 'bg-sky-100',
    border: 'border-sky-200 hover:border-sky-400',
  },
  {
    id: 'upper-limb',
    file: 'upper-limb-80.json',
    shortTitle: 'Upper Limb Anatomy',
    title: 'Upper Limb Anatomy MCQ',
    description: '80 source-provided questions with answers and explanations covering upper-limb anatomy.',
    subject: 'UPPER',
    color: 'text-indigo-800',
    tint: 'bg-indigo-100',
    border: 'border-indigo-200 hover:border-indigo-400',
  },
  {
    id: 'pathology-lecture1',
    file: 'pathology-lecture1-80.json',
    shortTitle: 'Diagnostic Pathology · Lecture 1',
    title: 'Principles of Diagnostic & Surgical Pathology — Lecture 1',
    description: 'Core diagnostic principles, biopsy types, specimen handling, fixation, labeling, and transportation.',
    subject: 'PATH 1',
    color: 'text-rose-800',
    tint: 'bg-rose-100',
    border: 'border-rose-200 hover:border-rose-400',
    reviewNotice: 'Source material · not independently clinically reviewed',
  },
];

type SubjectCategory = {
  number: string;
  title: string;
  topics: string[];
  bankIds: string[];
};

const basicSubjects: SubjectCategory[] = [
  {
    number: '1',
    title: 'Anatomy',
    topics: [
      'Abdomen',
      'Chest / Breast',
      'The Pelvis & Perineum',
      'Lower Limb: Nerves, Vessels & Lymphatics',
      'Upper Limb: Nerves, Vessels & Lymphatics',
    ],
    bankIds: ['abdomen', 'breast', 'pelvis-perineum', 'lower-limb', 'upper-limb'],
  },
  {
    number: '2',
    title: 'Microbiology & Immunology',
    topics: ['Diagnostic Microbiology & Specimen Collection', 'Antimicrobial Resistance', 'Immunology & Serology'],
    bankIds: ['microbiology'],
  },
  {
    number: '3',
    title: 'Pathology',
    topics: ['Principles of Diagnostic Pathology', 'Cell Injury and Death', 'Inflammation', 'Circulatory Disturbances', 'Neoplasia: Grading, Staging & Biomarkers'],
    bankIds: ['pathology-lecture1'],
  },
  {
    number: '4',
    title: 'Pharmacology',
    topics: ['Antimicrobial Chemotherapy & Antibiotics', 'Drugs for GIT Disorders', 'Drugs for Peptic Ulcer', 'Analgesics for Surgery', 'Cancer Chemotherapy & Blood-Disorder Drugs'],
    bankIds: [],
  },
];

const principlesTopics = [
  'Fluids & Electrolytes',
  'Shock',
  'Hemorrhage',
  'Blood and Blood Products',
  'Wound Healing',
  'Sterilisation and Disinfection',
  'Medical Ethics',
  'Consent',
  'Breaking Bad News',
  'Metabolic Response to Surgery and Trauma',
  'Nutritional Support in Surgical Patients',
  'Principles of Surgical Oncology',
  'Surgical Infections I',
  'Surgical Infections II',
  'Septic Shock',
  'Venous Thromboembolism',
  'Acid–Base Disturbances',
];

const publishedBankOrder = [banks[0], banks[2], banks[3], banks[4], banks[5], banks[6], banks[1]];

function QuestionBank({ bank }: { bank: Bank }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`${assetBase}assets/mcq-answers/${bank.file}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('bank unavailable')))
      .then((data) => setQuestions(data.questions.map((item: Question) => ({
        ...item,
        correctOptionIndex: item.correctOptionIndex ?? item.answer_index,
      }))))
      .catch(() => setLoadError(true));
  }, [bank.file]);

  const question = questions[current];
  const next = () => {
    setCurrent((value) => (value + 1) % questions.length);
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <section id={bank.id} className="scroll-mt-24 mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${bank.tint} ${bank.color}`}>{bank.subject}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{bank.reviewNotice ?? 'Question bank · 80 questions'}</p>
            <h3 className="text-xl font-black text-slate-900 sm:text-2xl">{bank.title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{bank.description}</p>
          </div>
        </div>
        {questions.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
            Question {current + 1} of {questions.length}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-8">
        {loadError && <p className="rounded-xl bg-red-50 p-4 text-red-700">This question bank could not be loaded. Please refresh the page and try again.</p>}
        {!loadError && !question && <p className="text-slate-500">Loading questions…</p>}
        {question && (
          <div dir="ltr">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{question.topic ?? question.subject ?? bank.subject}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{question.difficulty}</span>
            </div>
            <h4 className="mb-5 text-lg font-bold leading-8 text-slate-900 sm:text-xl">{question.stem}</h4>
            <div className="grid gap-3">
              {question.options.map((option, index) => {
                const correctIndex = question.correctOptionIndex ?? question.answer_index ?? -1;
                const isCorrect = submitted && index === correctIndex;
                const isWrong = submitted && selected === index && index !== correctIndex;
                const style = isCorrect
                  ? 'border-emerald-500 bg-emerald-50'
                  : isWrong
                    ? 'border-red-500 bg-red-50'
                    : selected === index
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300';
                return (
                  <button
                    key={`${question.id}-${index}`}
                    type="button"
                    aria-pressed={selected === index}
                    onClick={() => !submitted && setSelected(index)}
                    className={`rounded-xl border p-4 text-left transition ${style}`}
                  >
                    <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {!submitted ? (
                <button disabled={selected === null} onClick={() => setSubmitted(true)} className="rounded-xl bg-teal-800 px-5 py-3 font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
                  Submit answer
                </button>
              ) : (
                <button onClick={next} className="rounded-xl bg-teal-800 px-5 py-3 font-bold text-white transition hover:bg-teal-700">
                  Next question
                </button>
              )}
            </div>
            {submitted && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7">
                <strong>{selected === (question.correctOptionIndex ?? question.answer_index) ? 'Correct.' : 'Review the highlighted answer.'}</strong> {question.explanation}
              </div>
            )}
            {question.reference_snapshot && (
              <details className="mt-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-slate-700">
                <summary className="cursor-pointer font-bold text-teal-900">Slide evidence card</summary>
                <p className="mt-3">{question.reference_snapshot}</p>
              </details>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-slate-50 font-sans text-slate-900" dir="ltr">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[76px] sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="GSDIPLOMAREVISION home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-sm font-black tracking-tight text-white">GS</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-wide text-teal-950 sm:text-base">GSDIPLOMAREVISION</span>
              <span className="hidden text-xs text-slate-500 sm:block">General Surgery Diploma · Revision & MCQs</span>
            </span>
          </a>
          <nav className="flex items-center gap-3 text-xs font-bold sm:gap-6 sm:text-sm" aria-label="Main navigation">
            <a href="#question-banks" className="text-slate-600 transition hover:text-teal-800">Question banks</a>
            <a href="#principles" className="hidden text-slate-600 transition hover:text-teal-800 lg:inline">Principles of Surgery</a>
            <a href="#other-resources" className="hidden text-slate-600 transition hover:text-teal-800 sm:inline">Other resources</a>
            <a href="#abdomen" className="rounded-lg bg-teal-800 px-3 py-2 text-white transition hover:bg-teal-700 sm:px-4">Open Abdomen MCQ</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-cyan-900 px-5 py-8 text-white shadow-xl sm:px-10 sm:py-12 lg:px-14">
          <div className="absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full border-[36px] border-white/5" />
          <div className="absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <span className="inline-flex rounded-full border border-teal-200/30 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-teal-100">GENERAL SURGERY DIPLOMA</span>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">Focused revision. Clear progress.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-100 sm:text-base">
                Practice from focused, interactive question banks and review each answer as you go.
              </p>
              <a href="#question-banks" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-teal-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-teal-50">
                Browse question banks <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur sm:gap-3 sm:p-5">
              <div><span className="block text-2xl font-black sm:text-3xl">7</span><span className="mt-1 block text-[10px] leading-4 text-teal-100 sm:text-xs">Question banks</span></div>
              <div className="border-x border-white/15"><span className="block text-2xl font-black sm:text-3xl">560</span><span className="mt-1 block text-[10px] leading-4 text-teal-100 sm:text-xs">Questions</span></div>
              <div><span className="block text-2xl font-black sm:text-3xl">MCQ</span><span className="mt-1 block text-[10px] leading-4 text-teal-100 sm:text-xs">Instant feedback</span></div>
            </div>
          </div>
        </section>

        <section id="question-banks" className="scroll-mt-24 pt-10 sm:pt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Course directory</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Lectures & Question Banks</h2>
              <p className="mt-2 text-sm text-slate-500">Browse the course subjects and open the question banks currently published on this site.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">7 published banks · 560 questions</span>
          </div>
          <h3 className="mb-4 text-lg font-black text-slate-900 sm:text-xl">Lectures in Basic Surgical Sciences</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {basicSubjects.map((subject) => (
              <article key={subject.number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-sm font-black text-white">{subject.number}</span>
                  <h4 className="text-lg font-black text-slate-900">{subject.title}</h4>
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {subject.topics.map((topic) => (
                    <li key={topic} className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700">{topic}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {subject.bankIds.map((bankId) => {
                    const bank = banks.find((item) => item.id === bankId);
                    if (!bank) return null;
                    return (
                      <a key={bank.id} href={`#${bank.id}`} className={`rounded-lg border px-3 py-2 text-xs font-black transition hover:bg-teal-50 ${bank.border}`}>
                        Open {bank.shortTitle} · 80 MCQs
                      </a>
                    );
                  })}
                  {subject.bankIds.length === 0 && (
                    <span className="text-xs font-semibold text-slate-500">Lecture topics listed · interactive question bank not yet published</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Interactive question banks" className="pt-2">
          {publishedBankOrder.map((bank) => <QuestionBank key={bank.id} bank={bank} />)}
        </section>

        <section id="principles" className="scroll-mt-24 mt-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Course directory</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Lectures in Principles of Surgery</h2>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {principlesTopics.map((topic, index) => (
              <li key={topic} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                <span className="mt-0.5 font-black tabular-nums text-teal-800">{String(index + 1).padStart(2, '0')}</span>
                <span>{topic}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="other-resources" className="scroll-mt-24 mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Additional resource</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">640 MCQ practice site</h2>
              <p className="mt-1 text-sm text-slate-500">Open the separate intensive question-bank website.</p>
            </div>
            <a href={previewLinks.mcq640} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-teal-800 px-5 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50">
              Open 640 MCQ <span className="ml-2" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        <p>© 2026 GSDIPLOMAREVISION · General Surgery Diploma Revision</p>
      </footer>
    </div>
  );
}
