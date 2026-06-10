import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { StreamingText } from './StreamingText'

export function MessageBubble({ message }) {
  const theme = useTheme()
  const isUser = message.role === 'user'

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontSize: 13, fontWeight: 'bold' }}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: theme.accent }]
            : [styles.bubbleAI,   { backgroundColor: theme.elevated, borderColor: theme.border }],
        ]}
      >
        {message.streaming ? (
          <StreamingText text={message.content} color={isUser ? theme.accentText : theme.textPrimary} />
        ) : (
          <Text style={[styles.text, { color: isUser ? theme.accentText : theme.textPrimary }]}>
            {message.content}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 16, alignItems: 'flex-end' },
  rowUser:   { flexDirection: 'row-reverse' },
  avatar:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  bubble:    { maxWidth: '78%', padding: 12, borderRadius: 16, borderWidth: 1 },
  bubbleUser:{ borderTopRightRadius: 4, borderWidth: 0 },
  bubbleAI:  { borderTopLeftRadius: 4 },
  text:      { fontSize: 15, lineHeight: 22 },
})
