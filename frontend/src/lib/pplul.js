/**
 * PPLUL — a separate, intermediate strength/hypertrophy starter plan.
 * Uses only openGym catalogue IDs, ordinary routines, and Fixed Week weekdays.
 * It intentionally does not create Anime Ascension XP/challenge metadata.
 *
 * Uses openGym's native double progression (repsMin..reps), and each lift's
 * native rest timer. RIR targets remain guidance, not automatic XP proof.
 */

// [catalogue ID priorities, working sets, lower reps, upper reps, RIR, rest]
// Priorities are conservative variants of the same movement, not general
// body-part substitutions that could turn e.g. a squat into a leg extension.
const DAYS = [
  { day: 1, key: 'Push', emoji: 'barbell', exercises: [
    [['0025', '0289'], 3, 4, 6, '2', '3 min'],                 // Bench
    [['0314'], 3, 6, 10, '1–2', '2 min'],                     // Incline DB press
    [['0405'], 2, 8, 12, '2', '2 min'],                       // Seated DB shoulder press
    [['0334'], 3, 12, 20, '1–2', '60–90 sec'],               // Lateral raise
    [['0241', '0201', '0200'], 3, 10, 15, '1–2', '60–90 sec'], // Cable pushdown
  ] },
  { day: 2, key: 'Pull', emoji: 'pullup', exercises: [
    [['7583', '2330', '0652'], 3, 6, 10, '1–2', '2–3 min'], // Pull-up / pulldown
    [['9698', '5661'], 3, 6, 10, '2', '2 min'],             // Supported DB row
    [['2393', '0293'], 2, 10, 12, '1–2', '90 sec'],         // One-arm DB row
    [['0383', '2487'], 2, 12, 20, '1–2', '60–90 sec'],      // Reverse fly
    [['0447', '0294'], 3, 8, 12, '1–2', '90 sec'],          // EZ curl / DB curl
    [['0313'], 2, 10, 15, '1–2', '60–90 sec'],             // Hammer curl
  ] },
  { day: 3, key: 'Legs A', emoji: 'legs', exercises: [
    [['0043', '3593'], 3, 4, 6, '2', '3 min'],              // Back squat
    [['0085'], 3, 6, 10, '2', '2–3 min'],                   // Romanian deadlift
    [['0381', '0676'], 2, 8, 12, '2', '90 sec'],            // Reverse lunge (each leg)
    [['0586', '0599'], 3, 8, 12, '1–2', '90 sec'],          // Leg curl
    [['0605', '0417'], 3, 10, 15, '1–2', '60–90 sec'],      // Calves
  ] },
  { day: 4, key: 'Upper', emoji: 'barbell', exercises: [
    [['0289'], 3, 6, 10, '1–2', '2 min'],                    // Flat DB bench
    [['9698', '5661'], 3, 8, 12, '1–2', '2 min'],            // Supported DB row
    [['7583', '2330', '0652'], 2, 8, 12, '1–2', '2 min'],    // Neutral pulldown
    [['0227', '0662'], 2, 10, 15, '1–2', '90 sec'],         // Cable fly / push-up
    [['0334'], 2, 12, 20, '1–2', '60–90 sec'],             // Lateral raise
    [['2188', '6148'], 2, 10, 15, '1–2', '60–90 sec'],      // Overhead DB extension
    [['0318'], 2, 10, 15, '1–2', '60–90 sec'],             // Incline DB curl
  ] },
  { day: 5, key: 'Lower B', emoji: 'legs', exercises: [
    [['2224', '0739'], 3, 8, 12, '2', '2–3 min'],            // 45-degree leg press
    [['2290'], 2, 8, 12, '2', '2 min'],                   // Bulgarian split squat (per leg)
    [['0585', '1873'], 2, 10, 15, '1–2', '90 sec'],         // Leg extension
    [['0599', '0586'], 3, 10, 15, '1–2', '90 sec'],         // Leg curl
    [['0605', '0417'], 3, 12, 20, '1–2', '60–90 sec'],      // Calves
    [['0175', '5741', '11270'], 2, 10, 15, '1–2', '60–90 sec'], // Kneeling cable crunch
  ] },
]

// Choose a specific duration within each programmed rest window.
// The full intended range remains in the exercise's note.
const REST_SECONDS = Object.freeze({
  '3 min': 180, '2–3 min': 150, '2 min': 120,
  '90 sec': 90, '60–90 sec': 75,
})

export const PPLUL_DAYS = Object.freeze(DAYS.map(({ day, key }) => Object.freeze({ day, key })))

/**
 * Fail closed rather than silently dropping required lifts or overriding the
 * equipment profile. A profile missing a listed movement can switch to an
 * equivalent explicitly listed alternative; otherwise no plan is loaded.
 */
export function buildPplulPlan({ catalogue, uid, equipment, isAvailable = () => true }) {
  if (!Array.isArray(catalogue) || typeof uid !== 'function') return null
  const exercises = new Map(catalogue.filter(x => x?.id).map(x => [String(x.id), x]))
  const available = ex => equipment == null || isAvailable(equipment, ex)
  const routines = []
  let swapped = 0
  for (const design of DAYS) {
    const used = new Set()
    const rows = []
    for (const [ids, sets, minimum, maximum, rir, rest] of design.exercises) {
      const matched = ids.map(id => exercises.get(id)).find(ex =>
        ex && ex.bp !== 'cardio' && !used.has(String(ex.id)) && available(ex))
      if (!matched) return null
      used.add(String(matched.id))
      if (String(matched.id) !== ids[0]) swapped++
      const perLeg = (design.key === 'Legs A' && rows.length === 2) ||
        (design.key === 'Lower B' && rows.length === 1)
      rows.push({
        id: matched.id, sets, reps: maximum, repsMin: minimum,
        weight: 0, prog: 'double', restSec: REST_SECONDS[rest],
        note: `${minimum}–${maximum} reps${perLeg ? ' per leg' : ''} · ${rir} RIR · ${rest} rest`,
      })
    }
    routines.push({ id: uid(), name: `PPLUL · ${design.key}`, emoji: design.emoji, ex: rows })
  }
  return {
    routines,
    schedule: DAYS.map((d, index) => ({ day: d.day, routineId: routines[index].id })),
    ...(equipment != null ? { fit: { swapped, dropped: 0 } } : {}),
  }
}
