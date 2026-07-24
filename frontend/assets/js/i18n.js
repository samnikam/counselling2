/* ============================================================
   Lightweight multilingual support — English / Hindi / Urdu.
   No build step, no external service. It:
     • injects a language switcher into the navbar,
     • translates known strings (by their English text),
     • switches to right-to-left for Urdu,
     • remembers the choice in localStorage across pages.
   Any string not in the dictionary simply stays in English,
   so nothing ever breaks — the dictionary can grow over time.

   NOTE: Hindi/Urdu wording should be reviewed by a native
   speaker before public launch.
   ============================================================ */
(function () {
  'use strict';

  // key = exact English text (trimmed). Add more entries any time.
  var STRINGS = {
    hi: {
      // ---- Navigation ----
      'Home': 'होम',
      'About Us': 'हमारे बारे में',
      'Services Offered': 'दी जाने वाली सेवाएँ',
      'Our Counsellors': 'हमारे काउंसलर',
      'Book Appointment': 'अपॉइंटमेंट बुक करें',
      'Self Assessment': 'स्व-मूल्यांकन',
      'Programs': 'कार्यक्रम',
      'Gallery': 'गैलरी',
      'Contact': 'संपर्क',
      'Login': 'लॉगिन',
      'Logout': 'लॉगआउट',
      'Dashboard': 'डैशबोर्ड',
      'Anantnag Youth Portal': 'अनंतनाग यूथ पोर्टल',
      'District Administration · J&K': 'जिला प्रशासन · जे&के',
      // ---- Hero ----
      'District Administration': 'जिला प्रशासन',
      'One digital platform for counselling, career guidance, events and everyday student support — connecting every\n          school and college in the district.':
        'काउंसलिंग, करियर मार्गदर्शन, कार्यक्रमों और रोज़मर्रा की छात्र सहायता के लिए एक ही डिजिटल मंच — जिले के हर स्कूल और कॉलेज को जोड़ता है।',
      'Book a Counsellor': 'काउंसलर बुक करें',
      'See Our Impact': 'हमारा प्रभाव देखें',
      'Higher Secondary': 'उच्चतर माध्यमिक',
      'Schools': 'स्कूल',
      'Colleges': 'कॉलेज',
      'Colleges\n            Connected': 'कॉलेज जुड़े',
      'Languages': 'भाषाएँ',
      'Supported': 'समर्थित',
      'Free & confidential': 'निःशुल्क और गोपनीय',
      'Talk to a trained counsellor': 'प्रशिक्षित काउंसलर से बात करें',
      // ---- Sections (eyebrows + headings) ----
      'Why This Portal': 'यह पोर्टल क्यों',
      'One Platform for the Whole District': 'पूरे जिले के लिए एक मंच',
      'About the Initiative': 'पहल के बारे में',
      'What You Can Do': 'आप क्या कर सकते हैं',
      'Support for Every Step of Student Life': 'छात्र जीवन के हर कदम पर सहायता',
      'Counselling System': 'काउंसलिंग प्रणाली',
      'Career Guidance': 'करियर मार्गदर्शन',
      'Events & Talent': 'कार्यक्रम और प्रतिभा',
      'Alumni Mentorship': 'पूर्व छात्र मार्गदर्शन',
      'Book a Session': 'सत्र बुक करें',
      'Explore Careers': 'करियर देखें',
      'See Events': 'कार्यक्रम देखें',
      'Learn More': 'और जानें',
      'Simple & Guided': 'सरल और मार्गदर्शित',
      'How the Portal Works': 'पोर्टल कैसे काम करता है',
      'Sign In': 'साइन इन',
      'Explore': 'खोजें',
      'Connect': 'जुड़ें',
      'Get Support': 'सहायता पाएँ',
      'Built for the District': 'जिले के लिए बनाया गया',
      'One Connected Community': 'एक जुड़ा हुआ समुदाय',
      'Our Reach': 'हमारी पहुँच',
      'Connecting an Entire District': 'पूरे जिले को जोड़ना',
      'Higher Secondary Schools': 'उच्चतर माध्यमिक स्कूल',
      'Students Connected': 'जुड़े छात्र',
      'Languages Supported': 'समर्थित भाषाएँ',
      'Notice Board': 'सूचना पट्ट',
      'Announcements & Updates': 'घोषणाएँ और अपडेट',
      'Details': 'विवरण',
      'Student Voices': 'छात्रों की आवाज़',
      'Get Started': 'शुरू करें',
      'The Right Support, at the Right Time': 'सही समय पर, सही सहायता',
      'Contact the Counselling Center': 'काउंसलिंग सेंटर से संपर्क करें',
      // ---- Footer ----
      'Website Policies': 'वेबसाइट नीतियाँ',
      'Citizen Services': 'नागरिक सेवाएँ',
      'Terms & Conditions': 'नियम एवं शर्तें',
      'Privacy Policy': 'गोपनीयता नीति',
      'Hyperlinking Policy': 'हाइपरलिंकिंग नीति',
      'Copyright Policy': 'कॉपीराइट नीति',
      'Disclaimer': 'अस्वीकरण',
      'Accessibility Statement': 'सुलभता कथन',
      'Screen Reader Access': 'स्क्रीन रीडर पहुँच',
      'Contact Us': 'हमसे संपर्क करें',
      'Grievance Redressal': 'शिकायत निवारण',
      'Right to Information': 'सूचना का अधिकार',
      'Feedback': 'प्रतिक्रिया',
      'Help': 'सहायता',
      'Sitemap': 'साइटमैप',
      'Government of Jammu & Kashmir': 'जम्मू और कश्मीर सरकार',
      'District Administration, Anantnag': 'जिला प्रशासन, अनंतनाग',
      // ---- Inner-page eyebrows & headings ----
      'COUNSELLING & YOUTH DEVELOPMENT': 'काउंसलिंग और युवा विकास',
      'Our Purpose': 'हमारा उद्देश्य',
      'One Platform. Every Student.': 'एक मंच। हर छात्र।',
      'The Need': 'आवश्यकता',
      'Why Anantnag Needs This Portal': 'अनंतनाग को यह पोर्टल क्यों चाहिए',
      'Who the Portal Covers': 'पोर्टल किसे शामिल करता है',
      'Expected Benefits': 'अपेक्षित लाभ',
      'What Everyone Gains': 'सभी को क्या मिलता है',
      'Meet Our Expert Guidance Team': 'हमारी विशेषज्ञ मार्गदर्शन टीम से मिलें',
      'WHAT WE OFFER': 'हम क्या देते हैं',
      'What We Offer': 'हम क्या देते हैं',
      'Everything the Portal Brings Together': 'पोर्टल जो कुछ एक साथ लाता है',
      'Inside the Portal': 'पोर्टल के अंदर',
      'Every Feature, in One Place': 'हर सुविधा, एक ही जगह',
      'Meet the Team': 'टीम से मिलें',
      'Qualified People, Ready to Listen': 'योग्य लोग, सुनने के लिए तैयार',
      'Confidential & Free': 'गोपनीय और निःशुल्क',
      'Every Session Stays Between You and Your Counsellor': 'हर सत्र आपके और आपके काउंसलर के बीच रहता है',
      'How We Help': 'हम कैसे मदद करते हैं',
      "Guidance for What You're Going Through": 'आप जिससे गुज़र रहे हैं उसके लिए मार्गदर्शन',
      'The Process': 'प्रक्रिया',
      'Booking a Session Is Simple': 'सत्र बुक करना आसान है',
      'Ready to Talk?': 'बात करने के लिए तैयार?',
      'Book a Confidential Counselling Session': 'एक गोपनीय काउंसलिंग सत्र बुक करें',
      'Request a Counselling Session': 'काउंसलिंग सत्र का अनुरोध करें',
      'Confidential · No Login · 2 Minutes': 'गोपनीय · कोई लॉगिन नहीं · 2 मिनट',
      'Explore Paths': 'रास्ते खोजें',
      'Career Options Worth Knowing': 'जानने योग्य करियर विकल्प',
      'Guidance Sessions': 'मार्गदर्शन सत्र',
      'Sessions That Answer Your Real Questions': 'ऐसे सत्र जो आपके असली सवालों के जवाब दें',
      'Build Skills That Open Doors': 'ऐसे कौशल बनाएँ जो अवसर खोलें',
      'Upcoming': 'आगामी',
      'Events & Competitions': 'कार्यक्रम और प्रतियोगिताएँ',
      'Talent Showcase': 'प्रतिभा प्रदर्शन',
      'Show the District What You Can Do': 'जिले को दिखाएँ कि आप क्या कर सकते हैं',
      'Moments from Across the District': 'पूरे जिले के पल',
      "Don't Miss Out": 'चूकें नहीं',
      'Every Notice. Every Event. On Your Dashboard.': 'हर सूचना। हर कार्यक्रम। आपके डैशबोर्ड पर।',
      'MOMENTS': 'पल',
      'Photo Gallery': 'फ़ोटो गैलरी',
      'Contact Details': 'संपर्क विवरण',
      'Reach the Center': 'सेंटर तक पहुँचें',
      'Quick Answers': 'त्वरित उत्तर',
      'Frequently Asked': 'अक्सर पूछे जाने वाले',
      'Terms & Conditions of Use': 'उपयोग के नियम एवं शर्तें',
    },
    ur: {
      // ---- Navigation ----
      'Home': 'ہوم',
      'About Us': 'ہمارے بارے میں',
      'Services Offered': 'پیش کردہ خدمات',
      'Our Counsellors': 'ہمارے کاؤنسلر',
      'Book Appointment': 'ملاقات بک کریں',
      'Self Assessment': 'خود جائزہ',
      'Programs': 'پروگرام',
      'Gallery': 'گیلری',
      'Contact': 'رابطہ',
      'Login': 'لاگ اِن',
      'Logout': 'لاگ آؤٹ',
      'Dashboard': 'ڈیش بورڈ',
      'Anantnag Youth Portal': 'اننت ناگ یوتھ پورٹل',
      'District Administration · J&K': 'ضلع انتظامیہ · جے اینڈ کے',
      // ---- Hero ----
      'District Administration': 'ضلع انتظامیہ',
      'One digital platform for counselling, career guidance, events and everyday student support — connecting every\n          school and college in the district.':
        'کاؤنسلنگ، کیریئر رہنمائی، تقریبات اور طلبہ کی روزمرہ معاونت کے لیے ایک ہی ڈیجیٹل پلیٹ فارم — ضلع کے ہر اسکول اور کالج کو جوڑتا ہے۔',
      'Book a Counsellor': 'کاؤنسلر بک کریں',
      'See Our Impact': 'ہمارا اثر دیکھیں',
      'Higher Secondary': 'ہائر سیکنڈری',
      'Schools': 'اسکول',
      'Colleges': 'کالج',
      'Colleges\n            Connected': 'کالج منسلک',
      'Languages': 'زبانیں',
      'Supported': 'معاونت',
      'Free & confidential': 'مفت اور خفیہ',
      'Talk to a trained counsellor': 'تربیت یافتہ کاؤنسلر سے بات کریں',
      // ---- Sections ----
      'Why This Portal': 'یہ پورٹل کیوں',
      'One Platform for the Whole District': 'پورے ضلع کے لیے ایک پلیٹ فارم',
      'About the Initiative': 'اقدام کے بارے میں',
      'What You Can Do': 'آپ کیا کر سکتے ہیں',
      'Support for Every Step of Student Life': 'طالبِ علمی کے ہر قدم پر معاونت',
      'Counselling System': 'کاؤنسلنگ نظام',
      'Career Guidance': 'کیریئر رہنمائی',
      'Events & Talent': 'تقریبات اور صلاحیت',
      'Alumni Mentorship': 'سابق طلبہ کی رہنمائی',
      'Book a Session': 'سیشن بک کریں',
      'Explore Careers': 'کیریئر دیکھیں',
      'See Events': 'تقریبات دیکھیں',
      'Learn More': 'مزید جانیں',
      'Simple & Guided': 'آسان اور رہنمائی شدہ',
      'How the Portal Works': 'پورٹل کیسے کام کرتا ہے',
      'Sign In': 'سائن اِن',
      'Explore': 'دریافت کریں',
      'Connect': 'رابطہ کریں',
      'Get Support': 'معاونت حاصل کریں',
      'Built for the District': 'ضلع کے لیے تیار',
      'One Connected Community': 'ایک منسلک برادری',
      'Our Reach': 'ہماری رسائی',
      'Connecting an Entire District': 'پورے ضلع کو جوڑنا',
      'Higher Secondary Schools': 'ہائر سیکنڈری اسکول',
      'Students Connected': 'منسلک طلبہ',
      'Languages Supported': 'معاون زبانیں',
      'Notice Board': 'نوٹس بورڈ',
      'Announcements & Updates': 'اعلانات اور اپ ڈیٹس',
      'Details': 'تفصیلات',
      'Student Voices': 'طلبہ کی آوازیں',
      'Get Started': 'آغاز کریں',
      'The Right Support, at the Right Time': 'صحیح وقت پر، صحیح معاونت',
      'Contact the Counselling Center': 'کاؤنسلنگ سینٹر سے رابطہ کریں',
      // ---- Footer ----
      'Website Policies': 'ویب سائٹ پالیسیاں',
      'Citizen Services': 'شہری خدمات',
      'Terms & Conditions': 'شرائط و ضوابط',
      'Privacy Policy': 'رازداری کی پالیسی',
      'Hyperlinking Policy': 'ہائپر لنکنگ پالیسی',
      'Copyright Policy': 'کاپی رائٹ پالیسی',
      'Disclaimer': 'دستبرداری',
      'Accessibility Statement': 'رسائی کا بیان',
      'Screen Reader Access': 'اسکرین ریڈر رسائی',
      'Contact Us': 'ہم سے رابطہ کریں',
      'Grievance Redressal': 'شکایات کا ازالہ',
      'Right to Information': 'حقِ معلومات',
      'Feedback': 'رائے',
      'Help': 'مدد',
      'Sitemap': 'سائٹ میپ',
      'Government of Jammu & Kashmir': 'حکومتِ جموں و کشمیر',
      'District Administration, Anantnag': 'ضلع انتظامیہ، اننت ناگ',
      // ---- Inner-page eyebrows & headings ----
      'COUNSELLING & YOUTH DEVELOPMENT': 'کاؤنسلنگ اور نوجوانوں کی ترقی',
      'Our Purpose': 'ہمارا مقصد',
      'One Platform. Every Student.': 'ایک پلیٹ فارم۔ ہر طالبِ علم۔',
      'The Need': 'ضرورت',
      'Why Anantnag Needs This Portal': 'اننت ناگ کو یہ پورٹل کیوں درکار ہے',
      'Who the Portal Covers': 'پورٹل کن کو شامل کرتا ہے',
      'Expected Benefits': 'متوقع فوائد',
      'What Everyone Gains': 'ہر ایک کو کیا حاصل ہوتا ہے',
      'Meet Our Expert Guidance Team': 'ہماری ماہر رہنمائی ٹیم سے ملیں',
      'WHAT WE OFFER': 'ہم کیا پیش کرتے ہیں',
      'What We Offer': 'ہم کیا پیش کرتے ہیں',
      'Everything the Portal Brings Together': 'پورٹل جو کچھ ایک ساتھ لاتا ہے',
      'Inside the Portal': 'پورٹل کے اندر',
      'Every Feature, in One Place': 'ہر خصوصیت، ایک ہی جگہ',
      'Meet the Team': 'ٹیم سے ملیں',
      'Qualified People, Ready to Listen': 'اہل افراد، سننے کے لیے تیار',
      'Confidential & Free': 'خفیہ اور مفت',
      'Every Session Stays Between You and Your Counsellor': 'ہر سیشن آپ اور آپ کے کاؤنسلر کے درمیان رہتا ہے',
      'How We Help': 'ہم کیسے مدد کرتے ہیں',
      "Guidance for What You're Going Through": 'آپ جس سے گزر رہے ہیں اس کے لیے رہنمائی',
      'The Process': 'طریقہ کار',
      'Booking a Session Is Simple': 'سیشن بک کرنا آسان ہے',
      'Ready to Talk?': 'بات کرنے کے لیے تیار؟',
      'Book a Confidential Counselling Session': 'ایک خفیہ کاؤنسلنگ سیشن بک کریں',
      'Request a Counselling Session': 'کاؤنسلنگ سیشن کی درخواست کریں',
      'Confidential · No Login · 2 Minutes': 'خفیہ · بغیر لاگ اِن · 2 منٹ',
      'Explore Paths': 'راستے دریافت کریں',
      'Career Options Worth Knowing': 'جاننے کے قابل کیریئر کے مواقع',
      'Guidance Sessions': 'رہنمائی سیشنز',
      'Sessions That Answer Your Real Questions': 'ایسے سیشن جو آپ کے حقیقی سوالوں کے جواب دیں',
      'Build Skills That Open Doors': 'ایسی مہارتیں بنائیں جو مواقع کھولیں',
      'Upcoming': 'آئندہ',
      'Events & Competitions': 'تقریبات اور مقابلے',
      'Talent Showcase': 'صلاحیتوں کی نمائش',
      'Show the District What You Can Do': 'ضلع کو دکھائیں کہ آپ کیا کر سکتے ہیں',
      'Moments from Across the District': 'پورے ضلع کے لمحات',
      "Don't Miss Out": 'محروم نہ رہیں',
      'Every Notice. Every Event. On Your Dashboard.': 'ہر نوٹس۔ ہر تقریب۔ آپ کے ڈیش بورڈ پر۔',
      'MOMENTS': 'لمحات',
      'Photo Gallery': 'تصویری گیلری',
      'Contact Details': 'رابطہ تفصیلات',
      'Reach the Center': 'سینٹر تک پہنچیں',
      'Quick Answers': 'فوری جوابات',
      'Frequently Asked': 'اکثر پوچھے گئے سوالات',
      'Terms & Conditions of Use': 'استعمال کی شرائط و ضوابط',
    },
  };

  // Whole-element (innerHTML) translations for the stylised hero titles that contain an
  // <em> highlight. Keyed by the data-i18n attribute on each title. The <em> is kept so
  // the coloured-word design is preserved in every language.
  var RICH = {
    hi: {
      'hero-home': 'अनंतनाग के हर <em>छात्र</em> को सशक्त बनाना',
      'hero-about': '<em>पहल</em> के बारे में',
      'hero-services': 'दी जाने वाली <em>सेवाएँ</em>',
      'hero-counsellors': 'हमारे <em>काउंसलर</em>',
      'hero-counselling': 'जब भी ज़रूरत हो, <em>मार्गदर्शन</em>',
      'hero-book': '<em>अपॉइंटमेंट</em> बुक करें',
      'hero-self': 'अपने <em>आप</em> से मिलिए',
      'hero-career': '<em>करियर</em> मार्गदर्शन और योजना',
      'hero-events': '<em>कार्यक्रम</em>, गतिविधियाँ और प्रतिभा',
      'hero-gallery': 'फ़ोटो <em>गैलरी</em>',
      'hero-contact': 'हमारी टीम से <em>संपर्क</em>',
      'hero-policies': 'वेबसाइट <em>नीतियाँ</em> और कानूनी जानकारी',
    },
    ur: {
      'hero-home': 'اننت ناگ کے ہر <em>طالبِ علم</em> کو بااختیار بنانا',
      'hero-about': '<em>اقدام</em> کے بارے میں',
      'hero-services': 'پیش کردہ <em>خدمات</em>',
      'hero-counsellors': 'ہمارے <em>کاؤنسلر</em>',
      'hero-counselling': 'جب بھی ضرورت ہو، <em>رہنمائی</em>',
      'hero-book': '<em>ملاقات</em> بک کریں',
      'hero-self': 'اپنے <em>آپ</em> سے ملیے',
      'hero-career': '<em>کیریئر</em> رہنمائی اور منصوبہ بندی',
      'hero-events': '<em>تقریبات</em>، سرگرمیاں اور صلاحیت',
      'hero-gallery': 'تصویری <em>گیلری</em>',
      'hero-contact': 'ہماری ٹیم سے <em>رابطہ</em>',
      'hero-policies': 'ویب سائٹ <em>پالیسیاں</em> اور قانونی معلومات',
    },
  };

  var LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिं' },
    { code: 'ur', label: 'اردو' },
  ];
  var STORE_KEY = 'portal_lang';

  // Snapshot each text node's original English once, so switching back always works.
  var originals = [];
  function collect() {
    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, OPTION: 1, SELECT: 1 };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== document.body) {
          if (skip[p.nodeName]) return NodeFilter.FILTER_REJECT;
          if (p.hasAttribute && p.hasAttribute('data-i18n')) return NodeFilter.FILTER_REJECT; // handled whole-element
          if (p.classList && p.classList.contains('pa-i18n')) return NodeFilter.FILTER_REJECT; // the switcher itself
          if (p.classList && p.classList.contains('notranslate')) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var node;
    while ((node = walker.nextNode())) {
      originals.push({ node: node, en: node.nodeValue });
    }
  }

  function apply(lang) {
    var dict = STRINGS[lang] || null;
    originals.forEach(function (o) {
      if (!o.node.parentNode) return; // node removed from DOM
      if (lang === 'en' || !dict) { o.node.nodeValue = o.en; return; }
      var key = o.en.trim();
      var t = dict[key];
      o.node.nodeValue = t ? o.en.replace(key, t) : o.en;
    });
    // Whole-element hero titles (keep their <em> highlight).
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.getAttribute('data-i18n-en') === null) el.setAttribute('data-i18n-en', el.innerHTML);
      var orig = el.getAttribute('data-i18n-en');
      var rich = RICH[lang] && RICH[lang][el.getAttribute('data-i18n')];
      el.innerHTML = (lang === 'en' || !rich) ? orig : rich;
    });
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
    // reflect the active button
    var btns = document.querySelectorAll('.pa-i18n button');
    btns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lang') === lang); });
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
  }

  function injectStyles() {
    var css =
      '.pa-i18n{display:inline-flex;gap:2px;align-items:center;margin-left:8px;' +
      'border:1.5px solid var(--sage,#c9d3c4);border-radius:var(--radius-pill,999px);padding:2px;background:var(--white,#fff)}' +
      '.pa-i18n button{font-family:var(--font-body,sans-serif);font-size:.72rem;font-weight:600;line-height:1;' +
      'color:var(--green,#21402f);background:transparent;border:none;border-radius:999px;padding:6px 10px;cursor:pointer;white-space:nowrap}' +
      '.pa-i18n button.on{background:var(--green,#21402f);color:var(--cream,#f7f3eb)}' +
      '[dir="rtl"] .pa-i18n{margin-left:0;margin-right:8px}';
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function mountSwitcher() {
    var host = document.querySelector('.navbar .nav-inner') || document.querySelector('.navbar');
    if (!host) return;
    var wrap = document.createElement('div');
    wrap.className = 'pa-i18n notranslate';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choose language / भाषा चुनें / زبان منتخب کریں');
    LANGS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.label;
      b.setAttribute('data-lang', l.code);
      b.setAttribute('lang', l.code);
      b.addEventListener('click', function () { apply(l.code); });
      wrap.appendChild(b);
    });
    host.appendChild(wrap);
  }

  function init() {
    collect();
    injectStyles();
    mountSwitcher();
    var saved = 'en';
    try { saved = localStorage.getItem(STORE_KEY) || 'en'; } catch (e) {}
    apply(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
