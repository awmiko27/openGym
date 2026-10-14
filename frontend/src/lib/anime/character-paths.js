// Anime Ascension Phase 4 — Dragon Ball and Solo Leveling inspired foundation plans.
// Exercises remain openGym catalogue references. These are practical beginner-friendly
// interpretations of the themes, not fictional feats or unsafe character workouts.
import { saitamaDifficulty } from './saitama.js'

const normalize = value => String(value || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
const risky = /\b(jump|explosive|plyometric|clap|handstand|weighted|pistol|burpee|decline|snatch|clean and jerk)\b/
const nonReps = /\b(stretch|isometric|hold|pose|yoga|warm ?up|plank)\b/
const body = ex => ['body weight', 'bodyweight', 'none'].includes(normalize(ex.eq))
const loaded = ex => ['dumbbell', 'barbell', 'cable', 'leverage machine', 'machine'].includes(normalize(ex.eq))

const CANDIDATES = {
  push: [/^push ?up$/, /\bknee(?:ling)? push ?up\b/, /\bincline push ?up\b/, /\bwall push ?up\b/],
  easyPush: [/\bwall push ?up\b/, /\bincline push ?up\b/, /\bknee(?:ling)? push ?up\b/, /^push ?up$/],
  squat: [/\bbodyweight squat\b/, /^squat$/, /\bair squat\b/, /\bsit to stand\b/],
  lunge: [/\breverse lunge\b/, /\bwalking lunge\b/, /^lunge$/],
  bridge: [/\bglute bridge\b/, /\bhip bridge\b/],
  core: [/\bdead bug\b/, /\bbird dog\b/],
  otherCore: [/\bbird dog\b/, /\bdead bug\b/],
  climber: [/^mountain climber$/, /\bmountain climber\b/],
  calf: [/\bstanding calf raise\b/, /^calf raise$/],
  row: [/\bone arm dumbbell row\b/, /\bsingle arm dumbbell row\b/, /\bbent over dumbbell row\b/, /\bdumbbell row\b/],
  press: [/\bdumbbell shoulder press\b/, /\bdumbbell overhead press\b/, /\bbarbell shoulder press\b/],
  curl: [/\bdumbbell biceps curl\b/, /\bdumbbell curl\b/],
}

// Never use permissive substitutions that bypass an equipment requirement.
function choose(catalogue, key, allowed, equipmentType = body, except = new Set()) {
  const candidates = catalogue.filter(ex => ex?.id && ex?.n && !except.has(ex.id) &&
    equipmentType(ex) && !risky.test(normalize(ex.n)) && !nonReps.test(normalize(ex.n)) && allowed(ex))
  for (const pattern of CANDIDATES[key]) {
    const match = candidates.filter(ex => pattern.test(normalize(ex.n)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0]
    if (match) return match
  }
  return null
}

const DAYS = [1, 3, 5]
const DESIGNS = Object.freeze({
  goku: {
    name: 'Goku · Saiyan Foundation',
    titles: ['Strength', 'Power', 'Conditioning'],
    // Power is controlled strength/push-pull work, not explosive jumps.
    sessions: [
      [['squat', 2, 8], ['push', 2, 7], ['row', 2, 8], ['bridge', 2, 10], ['core', 2, 8]],
      [['push', 2, 8], ['lunge', 2, 8], ['press', 2, 8], ['squat', 2, 8], ['otherCore', 2, 10]],
      [['squat', 2, 12], ['climber', 2, 10], ['push', 2, 9], ['bridge', 2, 12], ['calf', 2, 12], ['core', 2, 10]],
    ],
  },
  jinwoo: {
    name: 'Sung Jinwoo · Hunter Foundation',
    titles: ['Strength', 'Agility', 'Endurance'],
    sessions: [
      [['squat', 2, 8], ['row', 2, 8], ['push', 2, 6], ['bridge', 2, 10], ['core', 2, 8]],
      [['lunge', 2, 8], ['otherCore', 2, 10], ['push', 2, 7], ['calf', 2, 12], ['bridge', 2, 10]],
      [['squat', 2, 12], ['push', 2, 9], ['climber', 2, 10], ['bridge', 2, 12], ['core', 2, 10]],
    ],
  },
})

const prescribe = (sets, reps, profile, focus) => {
  const { tier, goal } = saitamaDifficulty(profile)
  let nSets = sets + (tier === 2 ? 1 : 0)
  let nReps = reps + 2 * tier
  if (goal === 'strength') { nReps -= 1; if (tier >= 1 && focus === 'Strength') nSets++ }
  if (goal === 'endurance') nReps += 3
  if (goal === 'conditioning' && ['Conditioning', 'Endurance'].includes(focus)) nReps += 2
  return { sets: Math.max(2, Math.min(4, nSets)), reps: Math.max(5, Math.min(18, nReps)) }
}

/** Build three openGym-native A/B/C sessions using openGym's own equipment policy.
 * An undefined/null equipment list means filtering is off, NOT bodyweight-only.
 */
export function buildCharacterFoundation(path, { catalogue, uid, equipment, isAvailable = () => true, profile = {} }) {
  const design = DESIGNS[path]
  if (!design || !Array.isArray(catalogue) || typeof uid !== 'function') return null
  const allowed = ex => equipment == null || isAvailable(equipment, ex)
  const tier = saitamaDifficulty(profile).tier
  const push = choose(catalogue, tier === 0 ? 'easyPush' : 'push', allowed)
  const squat = choose(catalogue, 'squat', allowed)
  const bridge = choose(catalogue, 'bridge', allowed)
  const core = choose(catalogue, 'core', allowed)
  // Fail before touching an existing plan if openGym's current catalog cannot fill basics.
  if (!push || !squat || !bridge || !core) return null
  const selections = {
    push, squat, bridge, core,
    otherCore: choose(catalogue, 'otherCore', allowed, body, new Set([core.id])) || core,
    row: choose(catalogue, 'row', allowed, loaded),
    press: choose(catalogue, 'press', allowed, loaded),
    lunge: choose(catalogue, 'lunge', allowed),
    climber: choose(catalogue, 'climber', allowed),
    calf: choose(catalogue, 'calf', allowed),
  }
  // The default four-movement fallback stays valid even with a minimal catalogue.
  const fallback = [['push', 2, 7], ['squat', 2, 9], ['bridge', 2, 10], ['core', 2, 8]]
  const routines = design.sessions.map((session, i) => {
    const seen = new Set()
    const ex = []
    for (const [slot, sets, reps] of [...session, ...fallback]) {
      const movement = selections[slot]
      if (!movement || seen.has(movement.id)) continue
      seen.add(movement.id)
      ex.push({ id: movement.id, ...prescribe(sets, reps, profile, design.titles[i]), weight: 0 })
    }
    return { id: uid(), name: `${design.name} ${'ABC'[i]} — ${design.titles[i]}`, emoji: 'figureStrength', ex }
  })
  return { routines, schedule: DAYS.map((day, i) => ({ day, routineId: routines[i].id })) }
}

export const buildGokuFoundation = args => buildCharacterFoundation('goku', args)
export const buildJinwooFoundation = args => buildCharacterFoundation('jinwoo', args)
