import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import { I18nManager } from 'react-native'
import * as Updates from 'expo-updates'

const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa']

export function initI18n(savedLanguage) {
  const lang = savedLanguage || Localization.locale.split('-')[0]
  const isRTL = RTL_LANGUAGES.includes(lang)

  I18nManager.allowRTL(isRTL)
  I18nManager.forceRTL(isRTL)

  i18n.use(initReactI18next).init({
    resources: {
      en: {
        common:      require('../locales/en/common.json'),
        lessons:     require('../locales/en/lessons.json'),
        errors:      require('../locales/en/errors.json'),
        onboarding:  require('../locales/en/onboarding.json'),
      },
      hi: {
        common:      require('../locales/hi/common.json'),
        lessons:     require('../locales/hi/lessons.json'),
        errors:      require('../locales/hi/errors.json'),
        onboarding:  require('../locales/hi/onboarding.json'),
      },
      ar: {
        common:      require('../locales/ar/common.json'),
        lessons:     require('../locales/ar/lessons.json'),
        errors:      require('../locales/ar/errors.json'),
        onboarding:  require('../locales/ar/onboarding.json'),
      },
    },
    lng:          lang,
    fallbackLng:  'en',
    defaultNS:    'common',
    interpolation: { escapeValue: false },
  })
}

// Call after language change in settings.
// RTL changes require an app reload (EAS dev build — does NOT work in Expo Go).
export async function changeLanguage(lang) {
  await i18n.changeLanguage(lang)
  const isRTL = RTL_LANGUAGES.includes(lang)
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL)
    await Updates.reloadAsync()
  }
}

export default i18n
