import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// In a real app, we'd use i18next-http-backend to load translations asynchronously.
// For this prototype, we'll inline them or import them.
import enTranslation from '../public/locales/en/translation.json';
import hiTranslation from '../public/locales/hi/translation.json';
import knTranslation from '../public/locales/kn/translation.json';

const resources = {
  en: { translation: enTranslation.translation },
  hi: { translation: hiTranslation.translation },
  kn: { translation: knTranslation.translation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
