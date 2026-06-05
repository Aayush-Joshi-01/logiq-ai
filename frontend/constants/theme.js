export const COLORS = {
  inkBlack:         '#0D1321',
  deepSpaceBlue:    '#1D2D44',
  blueSlate:        '#3E5C76',
  dustyDenim:       '#748CAB',
  eggshell:         '#F0EBD8',
  accentHoverDark:  '#8FA5BF',
  accentHoverLight: '#5A7A9A',
  midNavy:          '#2A3A5C',
  warmWhite:        '#F7F4EE',
  success:          '#22c55e',
  warning:          '#eab308',
  error:            '#ef4444',
}

export const DARK_THEME = {
  background:    '#0D1321',
  surface:       '#1D2D44',
  elevated:      '#2A3A5C',
  border:        'rgba(62, 92, 118, 0.5)',
  borderStrong:  '#3E5C76',
  accent:        '#748CAB',
  accentHover:   '#8FA5BF',
  accentText:    '#0D1321',   // text ON accent — NEVER white
  textPrimary:   '#F0EBD8',   // eggshell on dark
  textSecondary: 'rgba(240,235,216,0.6)',
  textMuted:     'rgba(240,235,216,0.35)',
  overlay:       'rgba(13,19,33,0.85)',
}

export const LIGHT_THEME = {
  background:    '#F0EBD8',
  surface:       '#FFFFFF',
  elevated:      '#F7F4EE',
  border:        'rgba(62, 92, 118, 0.18)',
  borderStrong:  'rgba(62, 92, 118, 0.35)',
  accent:        '#748CAB',
  accentHover:   '#5A7A9A',
  accentText:    '#0D1321',
  textPrimary:   '#0D1321',
  textSecondary: '#3E5C76',
  textMuted:     'rgba(13,19,33,0.4)',
  overlay:       'rgba(13,19,33,0.6)',
}

// #748CAB usage rules:
//   ✓ borders, icons, progress fills, chips, large headings (≥18px), bold labels (≥14px bold)
//   ✗ body text or labels under 14px bold — use textPrimary or textSecondary instead
//   ✓ filled buttons: bg #748CAB + text #0D1321 font-bold
//   ✓ outlined buttons: border #748CAB + text #748CAB (≥14px bold only)

export const NODE_STATUS_COLORS = {
  completed:   { bg: 'rgba(34,197,94,0.12)',   border: '#22c55e', text: '#22c55e' },
  available:   { bg: 'rgba(116,140,171,0.15)', border: '#748CAB', text: '#748CAB' },
  in_progress: { bg: 'rgba(234,179,8,0.12)',   border: '#eab308', text: '#eab308' },
  locked:      { bg: 'rgba(62,92,118,0.2)',    border: '#3E5C76', text: '#3E5C76' },
}
