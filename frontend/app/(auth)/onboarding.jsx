import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { changeLanguage } from '../../lib/i18n'
import { apiPatch } from '../../lib/api'
import { COLORS } from '../../constants/theme'

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English',    native: 'English' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi',      native: 'हिंदी' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic',     native: 'العربية' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish',    native: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'French',     native: 'Français' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese', native: 'Português' },
  { code: 'de', flag: '🇩🇪', name: 'German',     native: 'Deutsch' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese',   native: '日本語' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese',    native: '中文' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean',     native: '한국어' },
]

const TOTAL_STEPS = 5

export default function OnboardingScreen() {
  const router = useRouter()
  const { t } = useTranslation('onboarding')
  const theme = useTheme()
  const { setLanguage } = useSettingsStore()
  const { setGuest } = useAuthStore()

  const [step, setStep] = useState(1)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedGoals, setSelectedGoals] = useState([])
  const [customGoal, setCustomGoal] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const GOALS = ['webdev', 'data', 'mobile', 'devops', 'ml', 'security', 'uiux', 'blockchain']
  const LEVELS = [
    { key: 'beginner',     desc: t('levels.beginnerDesc') },
    { key: 'some',         desc: t('levels.someDesc') },
    { key: 'intermediate', desc: t('levels.intermediateDesc') },
    { key: 'advanced',     desc: t('levels.advancedDesc') },
  ]
  const TIMES = ['15min', '30min', '1hour', '2plus']

  async function handleLanguageSelect(code) {
    setSelectedLanguage(code)
    setLanguage(code)
    await changeLanguage(code)
  }

  function toggleGoal(goal) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    )
  }

  async function handleSkip() {
    setGuest(true)
    router.replace('/(tabs)')
  }

  async function handleEmailSignup() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await saveOnboardingData()
    router.replace('/(tabs)')
  }

  async function saveOnboardingData() {
    try {
      await apiPatch('/api/auth/user', {
        language:      selectedLanguage,
        goals:         selectedGoals,
        customGoal,
        level:         selectedLevel,
        dailyMinutes:  selectedTime,
      })
    } catch {
      // Non-fatal — profile can be updated later
    }
  }

  const canProceed = () => {
    if (step === 1) return !!selectedLanguage
    if (step === 2) return selectedGoals.length > 0 || customGoal.trim().length > 0
    if (step === 3) return !!selectedLevel
    if (step === 4) return !!selectedTime
    return true
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: theme.border, marginTop: 48 }}>
        <View style={{ height: 3, backgroundColor: theme.accent, width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32, flexGrow: 1 }}>
        {/* Step dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i + 1 === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i + 1 <= step ? theme.accent : theme.border,
              }}
            />
          ))}
        </View>

        {/* Step 1: Language */}
        {step === 1 && (
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {t('step1.title')}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {t('step1.subtitle')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  style={{
                    width: '30%',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: selectedLanguage === lang.code ? theme.accent : theme.border,
                    backgroundColor: selectedLanguage === lang.code
                      ? `${theme.accent}22`
                      : theme.surface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                  <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                    {lang.native}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {t('step2.title')}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {t('step2.subtitle')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  onPress={() => toggleGoal(goal)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: selectedGoals.includes(goal) ? theme.accent : theme.border,
                    backgroundColor: selectedGoals.includes(goal) ? `${theme.accent}22` : theme.surface,
                  }}
                >
                  <Text style={{
                    color: selectedGoals.includes(goal) ? theme.accent : theme.textSecondary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    {t(`goals.${goal}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={customGoal}
              onChangeText={setCustomGoal}
              placeholder={t('step2.placeholder')}
              placeholderTextColor={theme.textMuted}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 14,
                color: theme.textPrimary,
                fontSize: 15,
              }}
            />
          </View>
        )}

        {/* Step 3: Level */}
        {step === 3 && (
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {t('step3.title')}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {t('step3.subtitle')}
            </Text>
            <View style={{ gap: 12 }}>
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  onPress={() => setSelectedLevel(level.key)}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: selectedLevel === level.key ? theme.accent : theme.border,
                    backgroundColor: selectedLevel === level.key ? `${theme.accent}22` : theme.surface,
                  }}
                >
                  <Text style={{
                    color: theme.textPrimary,
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 4,
                  }}>
                    {t(`levels.${level.key}`)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{level.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Daily time */}
        {step === 4 && (
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {t('step4.title')}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 24 }}>
              {t('step4.subtitle')}
            </Text>
            <View style={{ gap: 12 }}>
              {TIMES.map((time) => (
                <TouchableOpacity
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: selectedTime === time ? theme.accent : theme.border,
                    backgroundColor: selectedTime === time ? `${theme.accent}22` : theme.surface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: selectedTime === time ? theme.accent : theme.textPrimary,
                    fontSize: 18,
                    fontWeight: '700',
                  }}>
                    {t(`time.${time}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5: Account creation */}
        {step === 5 && (
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
              {t('step5.title')}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 32 }}>
              {t('step5.subtitle')}
            </Text>

            {error && (
              <Text style={{ color: COLORS.error, fontSize: 14, marginBottom: 16 }}>{error}</Text>
            )}

            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('step5.emailLabel')}
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  padding: 14,
                  color: theme.textPrimary,
                  fontSize: 15,
                  marginBottom: 10,
                }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('step5.passwordLabel')}
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  padding: 14,
                  color: theme.textPrimary,
                  fontSize: 15,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleEmailSignup}
              disabled={loading || !email || !password}
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: theme.accent,
                alignItems: 'center',
                marginBottom: 12,
                opacity: loading || !email || !password ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: 'bold' }}>
                {loading ? '...' : t('step5.signupCTA')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={{ alignItems: 'center', padding: 12 }}>
              <Text style={{ color: theme.textMuted, fontSize: 15 }}>{t('step5.skipCTA')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom nav for steps 1-4 */}
      {step < 5 && (
        <View style={{ padding: 24, flexDirection: 'row', gap: 12 }}>
          {step > 1 && (
            <TouchableOpacity
              onPress={() => setStep((s) => s - 1)}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
                {t('actions.back', { ns: 'common' })}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            style={{
              flex: 2,
              padding: 16,
              borderRadius: 12,
              backgroundColor: theme.accent,
              alignItems: 'center',
              opacity: canProceed() ? 1 : 0.5,
            }}
          >
            <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: 'bold' }}>
              {t('actions.next', { ns: 'common' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
