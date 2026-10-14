import { trainingPrescriptionDelta } from './training.js'
import { CANON_PROGRAMS } from './canon-programs.js'
// Anime Ascension / Saitama: three distinct, repeatable native openGym sessions.
// AGPL-3.0-or-later. Reuse the catalogue and the caller's openGym equipment policy.
// A = strength; B = muscular endurance; C = low-impact conditioning.
// Rep-based prescriptions intentionally preserve Phase 3's proof/XP requirements.

const normal = value => String(value || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
const bodyweight = ex => ['body weight', 'bodyweight', 'none'].includes(normal(ex.eq))
const dumbbell = ex => normal(ex.eq) === 'dumbbell'
const unsafeAdvanced = /\b(jump|explosive|plyometric|clap|handstand|weighted|pistol|burpee|decline)\b/
const notRepBased = /\b(stretch|isometric|hold|pose|yoga|warm ?up)\b/

const slots = {
  easyPush: [/\bwall push ?up\b/, /\bincline push ?up\b/, /\bknee(?:ling)? push ?up\b/, /^push ?up$/],
  standardPush: [/^push ?up$/, /\bknee(?:ling)? push ?up\b/, /\bincline push ?up\b/, /\bwall push ?up\b/],
  squat: [/\bbodyweight squat\b/, /^squat$/, /\bair squat\b/, /\bsit to stand\b/],
  bridge: [/\bglute bridge\b/, /\bhip bridge\b/],
  core: [/\bdead bug\b/, /\bbird dog\b/],
  alternateCore: [/\bbird dog\b/, /\bdead bug\b/],
  situp: [/^sit ?up$/, /\bsit ?up\b/, /\bcrunch\b/],
  row: [/\bone arm dumbbell row\b/, /\bsingle arm dumbbell row\b/, /\bbent over dumbbell row\b/],
  lunge: [/\breverse lunge\b/, /\bwalking lunge\b/, /^lunge$/],
  mountainClimber: [/^mountain climber$/, /\bmountain climber\b/],
  calfRaise: [/\bstanding calf raise\b/, /^calf raise$/],
}

function findExercise(catalogue, patterns, eligible, equipmentType = bodyweight, except = new Set()) {
  const valid = catalogue.filter(ex => ex?.id && ex?.n && !except.has(ex.id) &&
    equipmentType(ex) && ex.bp !== 'cardio' && !unsafeAdvanced.test(normal(ex.n)) &&
    !notRepBased.test(normal(ex.n)) && eligible(ex))
  for (const pattern of patterns) {
    const matched = valid.filter(ex => pattern.test(normal(ex.n)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0]
    if (matched) return matched
  }
  return null
}

export const SAITAMA_DAYS = CANON_PROGRAMS.saitama.days

/**
 * Experience drives volume, goal biases reps. Age is only a conservative volume
 * ceiling for older adults, never a medical fitness assessment. Height/weight do
 * not prescribe exercise loads. Every workout remains editable in openGym.
 */
export function saitamaDifficulty(profile = {}) {
  const tiers = { beginner: 0, intermediate: 1, advanced: 2 }
  const goal = ['strength', 'endurance', 'conditioning'].includes(profile?.goal) ? profile.goal : 'general'
  const age = Number(profile?.ageYears)
  let tier = tiers[profile?.experience] ?? 0
  if (Number.isFinite(age) && age >= 70) tier = Math.min(tier, 1)
  return { tier, goal }
}

function prescription(baseSets, baseReps, profile, focus) {
  const advance = trainingPrescriptionDelta('saitama', profile?.trainingWeek)
  const { tier, goal } = saitamaDifficulty(profile)
  let sets = baseSets + (tier === 2 ? 1 : 0)
  let reps = baseReps + tier * 2
  if (goal === 'strength') { reps -= 1; if (tier >= 1 && focus === 'strength') sets += 1 }
  if (goal === 'endurance') reps += 3
  if (goal === 'conditioning' && focus === 'conditioning') reps += 2
  return [Math.max(2, Math.min(4, sets + advance.sets)), Math.max(5, Math.min(20, reps + advance.reps))]
}

/**
 * Null/undefined equipment means openGym equipment filtering is OFF (everything
 * is eligible). An array means filtering is ON: validate every catalogue entry,
 * including bodyweight movements that need a bench/pull-up bar.
 *
 * @param {{catalogue: object[], uid: ()=>string, equipment?: string[],
 *   isAvailable?: (equipment: string[], ex: object)=>boolean,
 *   profile?: {ageYears?: number|string, experience?: string, goal?: string}}} args
 */
export function buildSaitamaFoundation({ catalogue, uid, equipment, isAvailable = () => true, profile = {} }) {
  if (!Array.isArray(catalogue) || typeof uid !== 'function') return null
  const available = ex => equipment == null || isAvailable(equipment, ex)
  const choose = (slot, kind = bodyweight, used = new Set()) =>
    findExercise(catalogue, slots[slot], available, kind, used)
  const push = choose(saitamaDifficulty(profile).tier === 0 ? 'easyPush' : 'standardPush')
  const squat = choose('squat')
  const bridge = choose('bridge')
  const core = choose('core')
  // Without four safe catalogue movements, do not create an unusable partial plan.
  if (!push || !squat || !bridge || !core) return null
  const row = choose('row', dumbbell)
  const situp = choose('situp') || core
  const alternateCore = choose('alternateCore', bodyweight, new Set([core.id])) || core
  const lunge = choose('lunge', bodyweight, new Set([squat.id]))
  const climber = choose('mountainClimber')
  const calf = choose('calfRaise')
  const routine = (key, title, focus, list) => {
    const seen = new Set()
    const week = Number(profile?.trainingWeek)
    const weekSuffix = Number.isInteger(week) && week > 1 && week <= 9 ? ` · Week ${week}` : ''
    return {
      id: uid(), name: `Saitama · Hero Foundation ${key.toUpperCase()} — ${title}${weekSuffix}`,
      emoji: 'figureStrength',
      ex: list.filter(([exercise]) => exercise && !seen.has(exercise.id) && seen.add(exercise.id))
        .map(([exercise, sets, reps]) => {
          const [s, r] = prescription(sets, reps, profile, focus)
          return { id: exercise.id, sets: s, reps: r, weight: 0 }
        }),
    }
  }
  // These are five distinct adaptations of the famous 100/100/100/10 km
  // benchmark, NOT that fictional daily prescription. Aerobic preparation is
  // shown in coaching guidance until native cardio proof is implemented.
  const blueprints = [
    [[push, 3, 6], [squat, 2, 8], [core, 2, 8], [bridge, 2, 8]],
    [[squat, 3, 10], [situp, 2, 8], [lunge, 2, 8], [bridge, 2, 10]],
    [[climber, 2, 10], [calf, 2, 12], [bridge, 2, 10], [alternateCore, 2, 8], [squat, 2, 8]],
    [[push, 2, 8], [squat, 2, 10], [situp, 2, 8], [climber, 2, 10]],
    [[squat, 2, 12], [push, 2, 9], [situp, 2, 10], [bridge, 2, 12], [row, 2, 8]],
  ]
  const routines = blueprints.map((list, i) => {
    const session = SAITAMA_DAYS[i]
    return routine(session.slot.toLowerCase(), session.focus, i === 0 ? 'strength' : 'endurance', list)
  })
  return { routines, schedule: SAITAMA_DAYS.map(({ day }, index) => ({ day, routineId: routines[index].id })) }
}
