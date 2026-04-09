# AI Editor Blocks - Plugin Architecture

هذا الملف يوثق البنية الهيكلية وخطة العمل لإنشاء إضافة "AI Editor Blocks" الخاصة بووردبريس.

## 1. هيكلية ملفات الإضافة (Plugin Structure)
ستتبع الإضافة بنية قياسية ونظيفة، تفصل بين منطق PHP (الخلفية) وأكواد JavaScript/React (الواجهة الأمامية للمحرر). تم تبسيط المعمارية بحيث يتم الاتصال بـ AI API مباشرة من الواجهة الأمامية (المتصفح) باستخدام مكتبة `openai`.

```text
ai-editor-blocks/
├── ai-editor-blocks.php       # الملف الرئيسي للإضافة (الترويسة والتهيئة)
├── ARCHITECTURE.md            # هذا الملف (التوثيق المعماري)
├── includes/                  # مجلد يحتوي على فئات PHP
│   ├── class-aieb-settings.php # إدارة صفحة الإعدادات (Settings API)
│   ├── class-aieb-theme.php    # استخراج بيانات theme.json
│   └── class-aieb-assets.php   # تسجيل السكربتات وتمرير الإعدادات لـ JS
├── src/                       # مجلد الأكواد المصدرية للمكون (React)
│   ├── index.js               # نقطة الإدخال لتسجيل المكون
│   ├── edit.js                # واجهة المكون في المحرر (إدخال المطالبة والاتصال بـ AI)
│   ├── save.js                # واجهة المكون في الواجهة الأمامية
│   ├── style.scss             # التنسيقات العامة
│   ├── editor.scss            # تنسيقات المحرر فقط
│   └── block.json             # البيانات الوصفية للمكون
├── build/                     # الملفات المجمعة (يتم إنشاؤها بواسطة @wordpress/scripts)
└── package.json               # الاعتماديات وسكربتات البناء (npm)
```

## 2. صفحة الإعدادات (Settings API)
سيتم إنشاء صفحة إعدادات تحت قائمة "الإعدادات" (Settings -> AI Editor Blocks) باستخدام WordPress Settings API.
سيتم حفظ الإعدادات في مصفوفة واحدة داخل جدول `wp_options` لتقليل استعلامات قاعدة البيانات.

- **Option Name:** `aieb_settings`
- **الحقول المطلوبة:**
  - `api_url`: حقل نصي (Base URL / Endpoint).
  - `api_key`: حقل كلمة مرور (API Key).
  - `model_name`: حقل نصي (Model).

*ملاحظة: سيتم تمرير هذه الإعدادات من PHP إلى JavaScript باستخدام `wp_add_inline_script` أو `wp_localize_script` لتكون متاحة في كائن عام (مثلاً `window.aiebSettings`).*

## 3. بنية المكون (Block Architecture)
سيتم بناء المكون باستخدام حزمة `@wordpress/create-block`.

- **اسم المكون في قائمة الإدراج (Inserter):** `AI Gen Blocks`
- **السمات (Attributes):**
  - `prompt`: نص (يخزن مطالبة المستخدم).
- **تدفق العمل في واجهة المحرر (`edit.js`):**
  1. **التحقق من الإعدادات:** عند إدراج المكون، يتحقق أولاً من وجود الإعدادات المطلوبة (API Key, Base URL, Model) في الكائن العام `window.aiebSettings`.
  2. **حالة عدم توفر الإعدادات:** يعرض المكون رسالة تنبيه (Notice) تطلب من المستخدم الذهاب إلى صفحة الإعدادات لإدخال المعلومات اللازمة، مع توفير رابط للصفحة.
  3. **حالة توفر الإعدادات:** يعرض المكون حقل إدخال نصي (Textarea) لكتابة المطالبة (Prompt) وزر "توليد" (Generate).
  4. **الاتصال بـ AI:** عند إرسال المطالبة، يقوم المكون بإنشاء نسخة من عميل `OpenAI` باستخدام الإعدادات المحفوظة:
     ```javascript
     import OpenAI from "openai";
     const client = new OpenAI({
       apiKey: window.aiebSettings.apiKey,
       baseURL: window.aiebSettings.baseUrl,
       dangerouslyAllowBrowser: true // مطلوب للاستخدام في الواجهة الأمامية
     });
     ```
  5. **الاستبدال:** عند استلام الرد (Block Markup)، سيتم استخدام `wp.blocks.parse` لتحويل النص إلى مكونات فعلية، ثم استخدام `wp.data.dispatch('core/block-editor').replaceBlocks` لاستبدال مكون "AI Gen Blocks" الحالي بالمكونات التي تم توليدها.
- **واجهة الحفظ (`save.js`):**
  - بما أن المكون سيستبدل نفسه بالمكونات المولدة، فإن دالة الحفظ ستعود بـ `null`.

## 4. الـ System Prompt ودمج `theme.json`
لضمان توليد مكونات ووردبريس صالحة ومتوافقة مع القالب:

1. **استخراج بيانات القالب (PHP):** في ملف `class-aieb-theme.php`، سنستخرج البيانات المهمة (مثل لوحة الألوان `color.palette`، وأحجام الخطوط `typography.fontSizes`) باستخدام `WP_Theme_JSON_Resolver` ونمررها إلى JavaScript.
2. **صياغة الـ System Prompt (JavaScript):** سيقوم المكون ببناء توجيهات النظام (System Prompt) قبل إرسال الطلب إلى AI. سيتضمن هذا التوجيه:
   - **مهارة تطوير مكونات ووردبريس (WP Block Development Skill):** ملخص لقواعد كتابة مكونات Gutenberg صالحة (استخدام تعليقات HTML الصحيحة `<!-- wp:block-name -->`، هيكلة الـ JSON للسمات، إلخ).
   - **بيانات القالب:** توجيه الـ AI لاستخدام الألوان والخطوط المتاحة في القالب الحالي.
   - **قواعد صارمة:** التأكيد على إرجاع كود HTML/Block Markup فقط بدون أي نصوص إضافية أو تنسيق Markdown (بدون ```html).

## 5. الخطوات القادمة (للتنفيذ في وضع Code)
1. تهيئة مجلد الإضافة وإنشاء ملف `ai-editor-blocks.php`.
2. إعداد `package.json` وتثبيت مكتبة `openai` (`npm install openai`).
3. كتابة أصناف PHP في مجلد `includes` (الإعدادات، استخراج theme.json، وتمرير البيانات إلى JS).
4. تطوير واجهة المكون في `edit.js` لتنفيذ تدفق العمل الجديد (التحقق من الإعدادات -> عرض Prompt -> الاتصال المباشر بـ AI -> استبدال المكون).
5. اختبار الإضافة والتأكد من صحة المكونات المولدة.