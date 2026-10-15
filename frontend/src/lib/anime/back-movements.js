/** Equipment-aware upper-back choices for the three character programs.
 * A prone W/Y is useful accessory work, NOT a substitute for a resistance row.
 * Do not select bar/table/chair-based inverted rows: the catalogue's "body weight"
 * tag does not reliably prove the required anchor is available or stable.
 */
const norm = value => String(value || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
const repReady = ex => ex?.id && ex?.n && ex.bp !== 'cardio' &&
  !/\b(stretch|isometric|hold|pose|yoga|warm ?up|plank|jump|explosive)\b/.test(norm(ex.n))

const ROWS = [
  { eq: ['dumbbell'], pattern: /\b(?:one arm|single arm) dumbbell row\b/ },
  { eq: ['dumbbell'], pattern: /\b(?:dumbbell bent over row|bent over dumbbell row)\b/ },
  { eq: ['band', 'resistance band'], pattern: /\bband (?:standing|bent over|seated) row\b/ },
  { eq: ['cable'], pattern: /\bcable (?:seated|low seated) row\b/ },
]
const SUPPORT = [
  /\blying prone w to t\b/,
  /\blying prone w\b/,
  /\bbodyweight lying prone ys\b/,
  /\bprone y raise\b/,
  /\bsuperman row\b/,
]

export function chooseBackMovements(catalogue, eligible = () => true) {
  const pool = (Array.isArray(catalogue) ? catalogue : []).filter(ex => repReady(ex) && eligible(ex))
  const first = predicate => pool.filter(predicate)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] || null
  const row = ROWS.map(rule => first(ex => rule.eq.includes(norm(ex.eq)) && rule.pattern.test(norm(ex.n))))
    .find(Boolean) || null
  const support = SUPPORT.map(pattern => first(ex => ['body weight', 'bodyweight', 'none'].includes(norm(ex.eq)) && pattern.test(norm(ex.n))))
    .find(Boolean) || null
  return { row, support, primary: row || support }
}
