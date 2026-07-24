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
