# Question Bank

هذا هو موضع ملفات بنك أسئلة الجراحة العامة.

يجب أن تكون لكل دفعة أو وحدة بنية موثقة، وأن يحتوي كل سؤال على معرّف ثابت، `stem`، أربعة `options`، و`correctOptionIndex` من 0 إلى 3، وشرح، ومصدر و`source_locator` قابل للتحقق. يدعم CI الحقول `stem`/`question` و`correctOptionIndex`/`answer` للتوافق. تمر التغييرات عبر Pull Request ومراجعة مستقلة.

في Q Bank 3، يجب أن يتبع `source_locator` النمط `PDF p. N; slide M` وأن يطابق رقم الشريحة المطبوع فعلًا في المصدر، لا أن يُنسخ رقم صفحة PDF على أنه رقم شريحة.

## Answer images and source links

- Answer screenshots are stored and served from this GitHub repository under `public/assets/mcq-answers/`, using the stable question ID as the filename (for example, `GS-ANAT03-AB-0001.png`). Do not set an answer-image URL to Google Drive or another external file host.
- Question data references the local asset path; application code prefixes the deployment base path so the same record works on GitHub Pages.
- Keep the answer image hidden until the learner submits/selects an answer.
- Do not create or publish answer screenshots for draft or `pending-clinical-review` questions. Add them only after the question and reference have been clinically approved.
- Drive may be used for the factual source reference, but never as the answer-image delivery host.
