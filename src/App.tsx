import { useState } from 'react';

const previewLinks = {
  day16: 'https://day1quiz-hg9nk85o.manus.space',
  mcq640: 'https://gsexam-zv2uu94a.manus.space',
};

const assetBase = '/general-surgery-diploma-review/';

const days = [
  ['Day 1', 'Surgical anatomy'],
  ['Day 2', 'Physiology and perioperative care'],
  ['Day 3', 'Trauma and emergency surgery'],
  ['Day 4', 'Abdominal surgery'],
  ['Day 5', 'Hepatobiliary surgery'],
  ['Day 6', 'Pancreatic and splenic surgery'],
  ['Day 7', 'Colorectal surgery'],
  ['Day 8', 'Anorectal conditions'],
  ['Day 9', 'Breast and endocrine surgery'],
  ['Day 10', 'Vascular surgery'],
  ['Day 11', 'Urology and related topics'],
  ['Day 12', 'Paediatric surgery'],
  ['Day 13', 'Transplantation and oncology'],
  ['Day 14', 'Critical care and complications'],
  ['Day 15', 'Operative decision-making'],
  ['Day 16', 'Final integrated revision'],
] as const;

export default function App() {
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const openComingSoon = (title: string) => setModalTitle(title);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="ltr">
      <header className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center gap-4">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            <img src={`${assetBase}assets/platform-cover.svg`} alt="GSDiplomaRevision" className="w-11 h-11 rounded-xl object-cover shadow-sm" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-teal-900 leading-tight truncate">GSDIPLOMAREVISION</h1>
              <p className="text-xs text-slate-500 truncate">Dr. Ragab Al-Barbar — Unified Revision System</p>
            </div>
          </a>
          <button onClick={() => openComingSoon('Doctor account')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition whitespace-nowrap">
            Doctor account (coming soon)
          </button>
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-4 py-8 sm:py-10 flex-grow w-full">
        <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-cyan-900 text-white rounded-3xl p-5 sm:p-8 mb-10 shadow-xl overflow-hidden relative">
          <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-cyan-400/10" />
          <div className="relative grid lg:grid-cols-[1fr_240px] gap-8 items-center">
            <div>
              <span className="bg-emerald-400 text-teal-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-4">
                Platform status: active preview
              </span>
              <h2 className="text-2xl sm:text-4xl font-black mb-3">Your integrated clinical and exam revision platform</h2>
              <p className="text-teal-100 text-sm sm:text-base max-w-2xl leading-7">
                A unified gateway for the Day 1–Day 16 revision pathway, verified question banks, and future clinical learning services.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <a href={previewLinks.day16} target="_blank" rel="noreferrer" className="px-5 py-3 bg-white text-teal-900 font-bold rounded-xl text-center shadow hover:bg-teal-50 transition">
                  Open Day 1–Day 16 Revision ↗
                </a>
                <a href={previewLinks.mcq640} target="_blank" rel="noreferrer" className="px-5 py-3 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-center shadow transition border border-teal-500">
                  Open 640 MCQ ↗
                </a>
              </div>
            </div>
            <img src={`${assetBase}assets/platform-cover.svg`} alt="General Surgery Diploma revision platform cover" className="hidden lg:block w-full rounded-2xl shadow-2xl ring-1 ring-white/20" />
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-[0.18em]">Primary pathway</p>
              <h3 className="text-2xl font-black text-slate-900">Day 1–Day 16 Revision</h3>
            </div>
            <a href={previewLinks.day16} target="_blank" rel="noreferrer" className="text-sm font-bold text-teal-700 hover:text-teal-900">Open full site ↗</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {days.map(([day, topic], index) => (
              <a key={day} href={previewLinks.day16} target="_blank" rel="noreferrer" className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition">
                <img src={`${assetBase}assets/day-icons/day-${String(index + 1).padStart(2, '0')}.svg`} alt={`${day} icon`} className="w-full aspect-[380/214] object-cover" />
                <div className="p-3">
                  <p className="text-sm font-black text-slate-900">{day}</p>
                  <p className="text-[11px] leading-4 text-slate-500 mt-1">{topic}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-5">Central services</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <a href={previewLinks.day16} target="_blank" rel="noreferrer" className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border-2 border-teal-100 hover:border-teal-300 transition">
              <div className="w-12 h-12 rounded-xl overflow-hidden mb-4"><img src={`${assetBase}assets/day-icons/day-16.svg`} alt="Day 16" className="w-full h-full object-cover" /></div>
              <h4 className="font-bold text-slate-900 mb-1">Day 1–Day 16 Revision</h4>
              <p className="text-xs text-slate-500">The structured 16-day revision website — available now.</p>
            </a>
            <a href={previewLinks.mcq640} target="_blank" rel="noreferrer" className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-blue-100 hover:border-blue-300 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-4">MCQ</div>
              <h4 className="font-bold text-slate-900 mb-1">640 MCQ</h4>
              <p className="text-xs text-slate-500">The intensive question-bank website — available now.</p>
            </a>
            <button onClick={() => openComingSoon('MCQ Bank 03 — Anatomy')} className="text-left bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-amber-100 hover:border-amber-300 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm mb-4">ANAT</div>
              <h4 className="font-bold text-slate-900 mb-1">MCQ Bank 03 — Anatomy</h4>
              <p className="text-xs text-slate-500">80 source-grounded draft questions are being prepared for clinical review.</p>
            </button>
            {[
              ['🎥', 'Surgical skills videos', 'The visual library for essential operative skills.'],
              ['📚', 'Lecture index', 'The academic map and curriculum topics.'],
            ].map(([icon, title, description]) => (
              <button key={title} onClick={() => openComingSoon(title)} className="text-left bg-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl mb-4">{icon}</div>
                <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
                <p className="text-xs text-slate-500">{description}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        <p>© 2026 GSDIPLOMAREVISION — General Surgery Diploma Revision</p>
      </footer>

      {modalTitle && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{modalTitle}</h3>
            <p className="text-sm text-slate-600 mb-6">This section is under development and will be activated in a future release.</p>
            <button onClick={() => setModalTitle(null)} className="w-full py-2 bg-teal-800 text-white font-semibold rounded-xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
