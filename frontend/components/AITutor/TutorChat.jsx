import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAIStream } from '../../hooks/useAIStream'
import { useSettingsStore } from '../../store/settingsStore'
import { MessageBubble } from './MessageBubble'
import { RateLimitBanner } from '../Common/RateLimitBanner'

const INITIAL_MESSAGE = {
  id:      'welcome',
  role:    'assistant',
  content: "Hi! I'm your AI tutor. Ask me anything about this topic, or just say hi 👋",
}

export function TutorChat({ roadmapId, roadmapTitle, nodeId, nodeTitle, onClose }) {
  const theme = useTheme()
  const { sendMessage } = useAIStream()
  const { dailyCallsUsed, dailyCallsLimit } = useSettingsStore()
  const isRateLimited = dailyCallsUsed >= dailyCallsLimit

  const [messages, setMessages]     = useState([INITIAL_MESSAGE])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const listRef                     = useRef(null)
  const streamingIdRef              = useRef(null)

  function scrollToBottom() {
    listRef.current?.scrollToEnd({ animated: true })
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || isRateLimited) return

    const userMsg = { id: Date.now().toString(), role: 'user', content: text }
    const aiMsg   = { id: `ai-${Date.now()}`, role: 'assistant', content: '', streaming: true }
    streamingIdRef.current = aiMsg.id

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setSending(true)
    setTimeout(scrollToBottom, 50)

    const history = messages.map(({ role, content }) => ({ role, content }))
    history.push({ role: 'user', content: text })

    await sendMessage({
      messages: history,
      nodeId,
      roadmapContext: roadmapTitle,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: m.content + token }
              : m
          )
        )
        setTimeout(scrollToBottom, 10)
      },
      onDone: ({ rateLimited }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current ? { ...m, streaming: false } : m
          )
        )
        setSending(false)
        if (rateLimited) {
          // settingsStore already updated by useAIStream via X-RateLimit-Remaining header
        }
      },
      onError: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
              : m
          )
        )
        setSending(false)
      },
    })
  }, [input, sending, isRateLimited, messages, nodeId, roadmapTitle])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          AI Tutor{nodeTitle ? ` · ${nodeTitle}` : ''}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      </View>

      <RateLimitBanner />

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={scrollToBottom}
      />

      {/* Input row */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputRow, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.elevated }]}
            placeholder="Ask anything…"
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            editable={!isRateLimited}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: isRateLimited || !input.trim() ? theme.elevated : theme.accent },
            ]}
            onPress={handleSend}
            disabled={isRateLimited || !input.trim() || sending}
          >
            <Text style={{ color: theme.accentText, fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  inputRow:    { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input:       { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 120 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
})
