/**
 * Canon-inspired *original* practical program outlines. Fictional benchmarks
 * are narrative targets, NOT automatic prescriptions or verified achievements.
 * No OtakuAthlete authored sessions/descriptions are bundled here.
 * openGym is the sole source of exercise IDs, equipment and logged activity.
 */
export const CANON_PROGRAMS = Object.freeze({
  saitama: {
    title: 'Saitama', source: 'One-Punch Man',
    benchmark: '100 push-ups, 100 sit-ups, 100 squats, and a 10 km run',
    adaptation: 'Build sustainable push-up, squat, core, and aerobic capacity with recovery days.',
    days: [
      { slot: 'A', day: 1, focus: 'Push-up Progression' },
      { slot: 'B', day: 2, focus: 'Squats & Core' },
      { slot: 'C', day: 4, focus: 'Run Preparation' },
      { slot: 'D', day: 5, focus: 'Hero Circuit' },
      { slot: 'E', day: 6, focus: 'Endurance Check' },
    ],
    phaseLabels: ['Foundation', 'Consistency', 'Hero Mastery'],
    cardioLabel: 'Easy walk/run preparation',
  },
  goku: {
    title: 'Goku', source: 'Dragon Ball',
    benchmark: 'Master Roshi conditioning, resistance training, and martial-arts skill practice',
    adaptation: 'Progress strength and movement control before increasing resistance or conditioning intensity.',
    days: [
      { slot: 'A', day: 1, focus: 'Turtle School Conditioning' },
      { slot: 'B', day: 2, focus: 'Upper-Body Strength' },
      { slot: 'C', day: 4, focus: 'Legs & Power Foundation' },
      { slot: 'D', day: 5, focus: 'Martial Arts Conditioning' },
    ],
    phaseLabels: ['Earth Training', 'Saiyan Strength'],
    cardioLabel: 'Brisk walking or shadowboxing technique practice',
  },
  jinwoo: {
    title: 'Sung Jinwoo', source: 'Solo Leveling',
    benchmark: 'System daily quest: 100 push-ups, 100 sit-ups, 100 squats, and a 10 km run',
    adaptation: 'Train toward the System quest through scaled movements, recovery, and hunter-style agility.',
    days: [
      { slot: 'A', day: 1, focus: 'Quest: Push-ups' },
      { slot: 'B', day: 2, focus: 'Quest: Squats & Core' },
      { slot: 'C', day: 4, focus: 'Hunter Agility' },
      { slot: 'D', day: 5, focus: 'Dungeon Strength' },
      { slot: 'E', day: 6, focus: 'System Endurance' },
    ],
    phaseLabels: ['E-Rank Foundation', 'Dungeon Conditioning', 'Shadow Ascension'],
    cardioLabel: 'Easy walk/run preparation for the long-distance quest',
  },
})

export function characterSessionCount(path) {
  return CANON_PROGRAMS[path]?.days.length || 0
}

export function canonicalSession(path, slot) {
  return CANON_PROGRAMS[path]?.days.find(d => d.slot === slot) || null
}

// Coaching guidance only: not a tracked exercise, XP requirement or fictional feat.
export function cardioGuidance(path, week = 1, experience = 'beginner') {
  const plan = CANON_PROGRAMS[path]
  if (!plan) return null
  const index = Math.max(1, Math.min(10, Math.floor(Number(week) || 1)))
  const base = experience === 'advanced' ? 20 : experience === 'intermediate' ? 15 : 10
  const instruction = path === 'goku'
    ? 'Stay at conversational effort with easy footwork or technique-only shadowboxing; avoid hard sparring.'
    : experience === 'beginner'
      ? 'Start with comfortable walking. If ready, alternate 1 minute of easy jogging with 2 minutes walking; walking alone is fine.'
      : 'Alternate easy jogging and walking as needed. Keep the pace conversational and increase duration only if recovery is good.'
  return {
    instruction,
    label: plan.cardioLabel,
    minutes: Math.min(35, base + Math.floor((index - 1) / 2) * 3),
    proofRequired: false,
    note: 'Optional low-intensity guidance. Not included in openGym sets, completion proof, challenges, or XP. Record actual cardio separately in openGym.',
  }
}
