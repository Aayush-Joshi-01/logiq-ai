import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'
import { useTheme } from '../../hooks/useTheme'
import { changeLanguage } from '../../lib/i18n'

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

export function LanguageSelector() {
  const { language, setLanguage } = useSettingsStore()
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find((l) => l.code === language)

  async function handleSelect(lang) {
    setOpen(false)
    setLanguage(lang.code)
    await changeLanguage(lang.code)
    // RTL change triggers app reload automatically via changeLanguage
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          borderRadius: 10,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ fontSize: 20 }}>{current?.flag}</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '500', flex: 1 }}>
          {current?.native}
        </Text>
        <Text style={{ color: theme.textMuted }}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: 'bold', textAlign: 'center' }}>
                Select Language
              </Text>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    gap: 12,
                    backgroundColor: language === item.code ? `${theme.accent}22` : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600' }}>{item.native}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>{item.name}</Text>
                  </View>
                  {language === item.code && (
                    <Text style={{ color: theme.accent, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}
