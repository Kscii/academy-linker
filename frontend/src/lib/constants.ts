// ============================================================
// Academy Linker — Client-side Constants
// Subject colors are injected client-side based on subject code;
// they are NOT returned by the API.
// ============================================================

function normalizeSubjectCode(code: string | null | undefined): string {
  const normalized = (code ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'mathematics':
    case 'math':
    case 'maths':
    case 'mth':
      return 'math';
    case 'eng':
    case 'ela':
    case 'language-arts':
      return 'english';
    case 'sci':
      return 'science';
    case 'his':
    case 'history':
    case 'geo':
    case 'geography':
    case 'civics':
      return 'hass';
    case 'physical-education':
    case 'sport':
      return 'pe';
    case 'art':
      return 'arts';
    default:
      return normalized;
  }
}

/**
 * Maps a subject code (normalized lowercase) to a CSS color string.
 * Falls back to a neutral color for unknown codes.
 */
export const SUBJECT_COLORS: Record<string, string> = {
  math:    '#E8614E',
  english: '#3DB6A8',
  science: '#4A90D9',
  hass:    '#F0A732',
  pe:      '#8B5CF6',
  arts:    '#E91E8C',
};

export const SUBJECT_BG: Record<string, string> = {
  math:    'rgba(232,97,78,0.12)',
  english: 'rgba(61,182,168,0.12)',
  science: 'rgba(74,144,217,0.12)',
  hass:    'rgba(240,167,50,0.12)',
  pe:      'rgba(139,92,246,0.12)',
  arts:    'rgba(233,30,140,0.12)',
};

/** Returns the color for a subject code, defaulting to a neutral grey. */
export function getSubjectColor(code: string | null | undefined): string {
  return SUBJECT_COLORS[normalizeSubjectCode(code)] ?? '#8A8A8A';
}

export function getSubjectBg(code: string | null | undefined): string {
  return SUBJECT_BG[normalizeSubjectCode(code)] ?? 'rgba(138,138,138,0.12)';
}

export function getSubjectIcon(code: string | null | undefined): string {
  switch (normalizeSubjectCode(code)) {
    case 'math':
      return '📐';
    case 'english':
      return '📖';
    case 'science':
      return '🔬';
    case 'hass':
      return '🌍';
    case 'pe':
      return '⚽';
    case 'arts':
      return '🎨';
    default:
      return '📚';
  }
}
