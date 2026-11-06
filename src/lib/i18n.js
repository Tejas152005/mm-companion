import S from './strings.json'
export const LANGS = { en: 'English', hi: 'हिन्दी', bn: 'বাংলা' }
const T = {
  en: { tagline: 'See your progress before the results show.', concept: 'Concept app, not official Man Matters.',
    email: 'Your email', sendLink: 'Email me a sign-in link', checkMail: 'Check your inbox for the link.',
    tryDemo: 'Explore demo as a reviewer', consentTitle: 'Your data, your choice',
    next: 'Continue', finish: 'Finish setup', hello: 'Hi', signOut: 'Sign out',
    navToday: 'Today', navJourney: 'Journey', navRoutine: 'Routine', navOffers: 'Offers', navAsk: 'Ask' },
  hi: { tagline: 'नतीजे दिखने से पहले अपनी प्रगति देखें।', concept: 'कॉन्सेप्ट ऐप, आधिकारिक Man Matters नहीं।',
    email: 'आपका ईमेल', sendLink: 'साइन-इन लिंक ईमेल करें', checkMail: 'लिंक के लिए अपना इनबॉक्स देखें।',
    tryDemo: 'रिव्यूअर के रूप में डेमो देखें', consentTitle: 'आपका डेटा, आपकी पसंद',
    next: 'आगे बढ़ें', finish: 'सेटअप पूरा करें', hello: 'नमस्ते', signOut: 'साइन आउट',
    navToday: 'आज', navJourney: 'सफ़र', navRoutine: 'रूटीन', navOffers: 'ऑफ़र', navAsk: 'पूछें' },
  bn: { tagline: 'ফল দেখার আগেই আপনার অগ্রগতি দেখুন।', concept: 'কনসেপ্ট অ্যাপ, অফিসিয়াল Man Matters নয়।',
    email: 'আপনার ইমেল', sendLink: 'সাইন-ইন লিংক ইমেল করুন', checkMail: 'লিংকের জন্য ইনবক্স দেখুন।',
    tryDemo: 'রিভিউয়ার হিসেবে ডেমো দেখুন', consentTitle: 'আপনার ডেটা, আপনার সিদ্ধান্ত',
    next: 'এগিয়ে যান', finish: 'সেটআপ শেষ করুন', hello: 'নমস্কার', signOut: 'সাইন আউট',
    navToday: 'আজ', navJourney: 'যাত্রা', navRoutine: 'রুটিন', navOffers: 'অফার', navAsk: 'জিজ্ঞাসা' },
}
export const t = (lang, k) => (T[lang] && T[lang][k]) || T.en[k] || k

// L("English sentence") returns the sentence in the current language, or the English if it has no translation yet.
// The session sets the current language on every render, so pages only need to call L().
let current = 'en'
export const setCurrentLang = (l) => { current = l || 'en' }
export const L = (s, lang = current) => (lang === 'en' ? s : (S[s] && S[s][lang]) || s)
// Lf fills {placeholders}: Lf('Friends joined: {n}', { n: 3 })
export const Lf = (s, vars = {}) => L(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
