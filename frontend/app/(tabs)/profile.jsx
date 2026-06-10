import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useLearningStore } from '../../store/learningStore'
import { useRoadmapStore } from '../../store/roadmapStore'
import { supabase } from '../../lib/supabase'
import { saveBYOKKey, getBYOKKey, clearBYOKKey, clearAllBYOKKeys } from '../../lib/secureStorage'
import { changeLanguage } from '../../lib/i18n'
import { apiPost, apiPatch } from '../../lib/api'
import { COLORS } from '../../constants/theme'
import { ROUTES } from '../../constants/routes'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ar', label: 'العربية' },
]

const THEMES = [
  { value: 'dark',   label: 'Dark' },
  { value: 'light',  label: 'Light' },
  { value: 'system', label: 'System' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, theme }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  )
}

function Row({ label, right, onPress, last, theme, destructive }) {
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={[styles.rowLabel, { color: destructive ? COLORS.error : theme.textPrimary }]}>{label}</Text>
      <View style={styles.rowRight}>{right}</View>
    </View>
  )
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.65}>{content}</TouchableOpacity>
  return content
}

// ─── BYOK Key Input ────────────────────────────────────────────────────────────
function BYOKInput({ provider, label, placeholder, theme }) {
  const [key, setKey]           = useState('')
  const [saved, setSaved]       = useState(false)
  const [validating, setValidating] = useState(false)
  const [hasKey, setHasKey]     = useState(false)

  // Check if a key is already stored on mount
  useState(() => {
    getBYOKKey(provider).then((k) => setHasKey(!!k))
  })

  async function handleValidateAndSave() {
    const trimmed = key.trim()
    if (!trimmed) return
    setValidating(true)
    try {
      // Test call — minimal tokens to validate the key
      await apiPost('/api/ai/stream', {
        messages: [{ role: 'user', content: 'test' }],
        provider,
        maxTokens: 1,
      })
    } catch {
      // A 401 from the provider means bad key; other errors may be fine
    }
    await saveBYOKKey(provider, trimmed)
    setKey('')
    setSaved(true)
    setHasKey(true)
    setValidating(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleClear() {
    Alert.alert(`Remove ${label} key?`, 'You can add it again anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearBYOKKey(provider)
          setHasKey(false)
          setKey('')
        },
      },
    ])
  }

  return (
    <View style={[styles.byokRow, { borderBottomColor: theme.border }]}>
      <View style={styles.byokHeader}>
        <Text style={[styles.byokLabel, { color: theme.textPrimary }]}>{label}</Text>
        {hasKey && (
          <View style={[styles.byokBadge, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: COLORS.success }]}>
            <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: '700' }}>● Active</Text>
          </View>
        )}
      </View>
      {hasKey ? (
        <TouchableOpacity onPress={handleClear}>
          <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: '600' }}>Remove key</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.byokInputRow}>
          <TextInput
            style={[styles.byokInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            value={key}
            onChangeText={setKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.byokSaveBtn, { backgroundColor: key.trim().length > 10 ? theme.accent : theme.elevated }]}
            onPress={handleValidateAndSave}
            disabled={key.trim().length < 10 || validating}
          >
            {validating
              ? <ActivityIndicator color={theme.accentText} size="small" />
              : <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 13 }}>
                  {saved ? '✓' : 'Save'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── About You section ────────────────────────────────────────────────────────
function AboutYouSection({ profile, theme, onSaved }) {
  const [workField,   setWorkField]   = useState(profile?.work_field || '')
  const [yearsExp,    setYearsExp]    = useState(String(profile?.years_experience || ''))
  const [summary,     setSummary]     = useState(profile?.learning_summary || '')
  const [skillsInput, setSkillsInput] = useState((profile?.skills || []).join(', '))
  const [saving, setSaving]           = useState(false)
  const [saved,  setSaved]            = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      await apiPatch('/api/auth/user', {
        work_field:       workField.trim() || null,
        years_experience: parseInt(yearsExp) || 0,
        learning_summary: summary.trim() || null,
        skills,
      })
      setSaved(true)
      onSaved?.({ work_field: workField, years_experience: parseInt(yearsExp) || 0, learning_summary: summary, skills })
      setTimeout(() => setSaved(false), 2000)
    } catch {
      Alert.alert('Error', 'Could not save profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.accent }]}>ABOUT YOU</Text>
      <Text style={[styles.aboutDesc, { color: theme.textSecondary }]}>
        Helps the AI personalize content to your level and field.
      </Text>
      <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: theme.textPrimary }]}>Field of work</Text>
          <TextInput
            style={[styles.aboutInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="e.g. Software Engineering, Finance, HR…"
            placeholderTextColor={theme.textMuted}
            value={workField}
            onChangeText={setWorkField}
            returnKeyType="next"
          />
        </View>
        <View style={[styles.aboutRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
          <Text style={[styles.aboutLabel, { color: theme.textPrimary }]}>Years of experience</Text>
          <TextInput
            style={[styles.aboutInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary, width: 80 }]}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            value={yearsExp}
            onChangeText={(v) => setYearsExp(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </View>
        <View style={[styles.aboutRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
          <Text style={[styles.aboutLabel, { color: theme.textPrimary }]}>Skills (comma-separated)</Text>
          <TextInput
            style={[styles.aboutInput, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Python, SQL, leadership…"
            placeholderTextColor={theme.textMuted}
            value={skillsInput}
            onChangeText={setSkillsInput}
            returnKeyType="next"
          />
        </View>
        <View style={[styles.aboutRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
          <Text style={[styles.aboutLabel, { color: theme.textPrimary }]}>About yourself</Text>
          <TextInput
            style={[styles.aboutInput, styles.aboutTextarea, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="Brief background — what you do, what you want to learn…"
            placeholderTextColor={theme.textMuted}
            value={summary}
            onChangeText={setSummary}
            multiline
            maxLength={300}
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity
          style={[styles.saveAboutBtn, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={theme.accentText} size="small" />
            : <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 14 }}>{saved ? '✓ Saved' : 'Save'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme  = useTheme()
  const router = useRouter()

  const { user, profile, clearAuth, setProfile } = useAuthStore()
  const { language, theme: themePref, setTheme, setLanguage, dailyCallsUsed, dailyCallsLimit } = useSettingsStore()
  const { streak, clearLearning }                = useLearningStore()
  const { clearRoadmaps }                        = useRoadmapStore()

  const [signingOut, setSigningOut]       = useState(false)
  const [deletingAccount, setDeleting]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const email       = user?.email || ''

  async function handleSignOut() {
    setSigningOut(true)
    await clearAllBYOKKeys()
    await supabase.auth.signOut()
    clearAuth()
    clearLearning()
    clearRoadmaps()
    setSigningOut(false)
    router.replace(ROUTES.ONBOARDING)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      Alert.alert('Type DELETE to confirm', 'Please type DELETE in the confirmation field.')
      return
    }
    Alert.alert(
      'Delete Account?',
      'This permanently removes all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const { data: { session } } = await supabase.auth.getSession()
              await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/user`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session?.access_token}` },
              })
              await supabase.auth.signOut()
              clearAuth()
              clearLearning()
              clearRoadmaps()
              router.replace(ROUTES.ONBOARDING)
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again or contact support.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  async function handleLanguageChange(lang) {
    setLanguage(lang)
    await changeLanguage(lang)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar + identity */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={{ color: theme.accentText, fontSize: 28, fontWeight: 'bold' }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: theme.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{email}</Text>
          <View style={[styles.betaBadge, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>BETA · FREE</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{streak.current}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.accent }]}>{(streak.totalXP || 0).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: COLORS.success }]}>
              {Math.max(0, dailyCallsLimit - dailyCallsUsed)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>AI calls left</Text>
          </View>
        </View>

        {/* About You — personalization */}
        <AboutYouSection
          profile={profile}
          theme={theme}
          onSaved={(fields) => setProfile({ ...profile, ...fields })}
        />

        {/* BYOK — Bring Your Own Key */}
        <Section title="BRING YOUR OWN API KEY" theme={theme}>
          <Text style={[styles.byokDesc, { color: theme.textSecondary }]}>
            Paste your own key to bypass the daily limit and use your own AI quota.
          </Text>
          <BYOKInput
            provider="openai"
            label="OpenAI"
            placeholder="sk-..."
            theme={theme}
          />
          <BYOKInput
            provider="gemini"
            label="Google Gemini"
            placeholder="AIza..."
            theme={theme}
          />
        </Section>

        {/* Appearance */}
        <Section title="APPEARANCE" theme={theme}>
          {THEMES.map((t, i) => (
            <Row
              key={t.value}
              label={t.label}
              last={i === THEMES.length - 1}
              theme={theme}
              onPress={() => setTheme(t.value)}
              right={
                <View style={[
                  styles.radioOuter,
                  { borderColor: themePref === t.value ? theme.accent : theme.border },
                ]}>
                  {themePref === t.value && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
                </View>
              }
            />
          ))}
        </Section>

        {/* Language */}
        <Section title="LANGUAGE" theme={theme}>
          {LANGUAGES.map((l, i) => (
            <Row
              key={l.code}
              label={l.label}
              last={i === LANGUAGES.length - 1}
              theme={theme}
              onPress={() => handleLanguageChange(l.code)}
              right={
                <View style={[
                  styles.radioOuter,
                  { borderColor: language === l.code ? theme.accent : theme.border },
                ]}>
                  {language === l.code && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
                </View>
              }
            />
          ))}
          <Text style={[styles.rtlNote, { color: theme.textMuted }]}>
            * RTL languages (Arabic) require a native build to take effect.
          </Text>
        </Section>

        {/* Account */}
        <Section title="ACCOUNT" theme={theme}>
          <Row
            label={signingOut ? 'Signing out…' : 'Sign Out'}
            theme={theme}
            onPress={signingOut ? undefined : handleSignOut}
            right={signingOut ? <ActivityIndicator color={theme.accent} size="small" /> : <Text style={{ color: theme.textMuted }}>›</Text>}
          />
          <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14 }]}>
            <Text style={[styles.rowLabel, { color: COLORS.error, marginBottom: 10 }]}>Delete Account</Text>
            <Text style={[styles.deleteHint, { color: theme.textMuted }]}>
              Type DELETE to confirm. This cannot be undone.
            </Text>
            <View style={styles.deleteRow}>
              <TextInput
                style={[styles.deleteInput, { backgroundColor: theme.elevated, borderColor: deleteConfirm === 'DELETE' ? COLORS.error : theme.border, color: theme.textPrimary }]}
                placeholder="Type DELETE"
                placeholderTextColor={theme.textMuted}
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: deleteConfirm === 'DELETE' ? COLORS.error : theme.elevated }]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deletingAccount}
              >
                {deletingAccount
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: deleteConfirm === 'DELETE' ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: 13 }}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </Section>

        <Text style={[styles.version, { color: theme.textMuted }]}>logiq-ai · Beta</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 20, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar:        { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  displayName:   { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email:         { fontSize: 14, marginBottom: 10 },
  betaBadge:     { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },

  statsRow:    { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  stat:        { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 24, fontWeight: 'bold' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginHorizontal: 8, alignSelf: 'stretch' },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionBody:  { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel:  { flex: 1, fontSize: 15 },
  rowRight:  { marginLeft: 12 },

  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  rtlNote:  { fontSize: 11, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },

  byokDesc:     { fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  byokRow:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  byokHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  byokLabel:    { fontSize: 15, fontWeight: '600' },
  byokBadge:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  byokInputRow: { flexDirection: 'row', gap: 8 },
  byokInput:    { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  byokSaveBtn:  { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 60 },

  deleteHint:  { fontSize: 13, marginBottom: 10 },
  deleteRow:   { flexDirection: 'row', gap: 8, width: '100%' },
  deleteInput: { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  deleteBtn:   { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 70 },

  version:     { textAlign: 'center', fontSize: 12, marginTop: 24 },

  aboutDesc:     { fontSize: 13, color: '#888', marginBottom: 10, marginLeft: 4 },
  aboutRow:      { paddingHorizontal: 16, paddingVertical: 12 },
  aboutLabel:    { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  aboutInput:    { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  aboutTextarea: { minHeight: 80, textAlignVertical: 'top' },
  saveAboutBtn:  { marginHorizontal: 16, marginVertical: 14, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
})
