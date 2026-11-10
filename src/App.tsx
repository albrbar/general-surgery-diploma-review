import { useState } from 'react';

const previewLinks = {
  day16: 'https://day1quiz-hg9nk850.manus.space',
  mcq640: 'https://gsexam-zv2uu94a.manus.space',
};

export default function App() {
  const [modalTitle, setModalTitle] = useState<string | null>(null);

  const openComingSoon = (title: string) => {
    setModalTitle(title);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              GS
            </div>
            <div>
              <h1 className="text-lg font-bold text-teal-900 leading-tight">GSDIPLOMAREVISION</h1>
              <p className="text-xs text-gray-500">مرجعية د. رجب البربار — النظام الموحد</p>
            </div>
          </div>
          <div>
            <button onClick={() => openComingSoon('حساب الطبيب')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition">
              حساب الطبيب (قريباً)
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-10 flex-grow w-full">
        {/* Banner */}
        <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 mb-10 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="bg-emerald-500 text-teal-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
              حالة المنصة: مفعلة وجاهزة للإطلاق التجريبي
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-2">منصتك الإكلينيكية والامتحانية المتكاملة</h2>
            <p className="text-teal-100 text-sm sm:text-base max-w-2xl">
              بوابة موحدة تجمع مسارات المراجعة، بنوك الأسئلة المحققة بمعرفات ثابتة، وخدمات التدريب والأبحاث.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a href={previewLinks.day16} target="_blank" rel="noreferrer" className="px-5 py-3 bg-white text-teal-900 font-bold rounded-xl text-center shadow hover:bg-teal-50 transition">
              Day1–Day16 Revision · معاينة ↗
            </a>
            <a href={previewLinks.mcq640} target="_blank" rel="noreferrer" className="px-5 py-3 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-center shadow transition border border-teal-600">
              640 MCQ · معاينة ↗
            </a>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-6">قائمة الخدمات المركزية</h3>

        {/* 8 Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div onClick={() => window.open(previewLinks.day16, '_blank')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl mb-4">16</div>
            <h4 className="font-bold text-gray-900 mb-1">Day1–Day16 Revision</h4>
            <p className="text-xs text-gray-500">الموقع الأول للمراجعة المنظمة على مسار 16 يوماً — معاينة.</p>
          </div>

          <div onClick={() => window.open(previewLinks.mcq640, '_blank')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-4">📊</div>
            <h4 className="font-bold text-gray-900 mb-1">640 MCQ</h4>
            <p className="text-xs text-gray-500">الموقع الثاني لبنك الأسئلة المكثف — معاينة.</p>
          </div>

          <div onClick={() => openComingSoon('فيديوهات عملي جراحة')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl mb-4">🎥</div>
            <h4 className="font-bold text-gray-900 mb-1">فيديوهات عملي جراحة</h4>
            <p className="text-xs text-gray-500">المكتبة المرئية للمهارات الجراحية الأساسية.</p>
          </div>

          <div onClick={() => openComingSoon('عناوين المحاضرات')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl mb-4">📚</div>
            <h4 className="font-bold text-gray-900 mb-1">عناوين المحاضرات</h4>
            <p className="text-xs text-gray-500">الخريطة الأكاديمية ومحاور المقرر الدراسي.</p>
          </div>

          <div onClick={() => openComingSoon('منتدى الطلبة')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition relative">
            <span className="absolute top-3 left-3 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">قريباً</span>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center font-bold text-xl mb-4">💬</div>
            <h4 className="font-bold text-gray-900 mb-1">منتدى الطلبة</h4>
            <p className="text-xs text-gray-500">مساحة تفاعلية للدراسة الجماعية ونقاش الحالات.</p>
          </div>

          <div onClick={() => openComingSoon('فرص عمل')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition relative">
            <span className="absolute top-3 left-3 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">قريباً</span>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center font-bold text-xl mb-4">💼</div>
            <h4 className="font-bold text-gray-900 mb-1">فرص عمل</h4>
            <p className="text-xs text-gray-500">ملتقى مهني يربط الأطباء الجراحين بالفرص الوظيفية.</p>
          </div>

          <div onClick={() => openComingSoon('الأبحاث والورقات العلمية')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition relative">
            <span className="absolute top-3 left-3 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">قريباً</span>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center font-bold text-xl mb-4">🔬</div>
            <h4 className="font-bold text-gray-900 mb-1">الأبحاث العلمية</h4>
            <p className="text-xs text-gray-500">منصة لدعم الإنتاج العلمي وتنظيم الأيام العلمية.</p>
          </div>

          <div onClick={() => openComingSoon('ورش العمل والتدريب')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition relative">
            <span className="absolute top-3 left-3 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">قريباً</span>
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center font-bold text-xl mb-4">🏥</div>
            <h4 className="font-bold text-gray-900 mb-1">ورش العمل والتدريب</h4>
            <p className="text-xs text-gray-500">إعلانات التسجيل في الدورات وجراحات المناظير.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-500">
        <p>جميع الحقوق محفوظة © 2026 — مشروع GSDIPLOMAREVISION | مرجعية د. رجب البربار</p>
      </footer>

      {/* Modal */}
      {modalTitle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{modalTitle}</h3>
            <p className="text-sm text-gray-600 mb-6">هذا القسم قيد التطور وسيتم تفعيله قريباً ضمن التحديثات.</p>
            <button onClick={() => setModalTitle(null)} className="w-full py-2 bg-teal-800 text-white font-semibold rounded-xl">فهمت</button>
          </div>
        </div>
      )}
    </div>
  );
}
