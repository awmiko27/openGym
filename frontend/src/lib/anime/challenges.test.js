import { describe, expect, it } from 'vitest'
import { beginChallenge, CHALLENGES, deriveChallenge, challengeBonuses, challengeProgresses, xpLevel } from './challenges.js'

const start = Date.UTC(2026, 9, 1)
function w(i, path = 'jinwoo') {
  const id = `routine-${i}`
  return { id: `w${i}`, d: new Date(Date.UTC(2026, 9, 2 + 2*i, 12)).toISOString().slice(0, 10),
    end: Date.UTC(2026, 9, 2 + 2*i, 18), routineIds: [id],
    animeAscension: { v: 1, path, routineId: id, requirements: [{ id: 'ex', reps: [8] }] },
    entries: [{ id: 'ex', sets: [{ done: true, r: 8 }] }] }
}

describe('Phase 5 character challenges', () => {
  it('provides 7, 14, 30 days for each character', () => {
    expect(Object.keys(CHALLENGES)).toHaveLength(9)
    for (const path of ['saitama', 'goku', 'jinwoo'])
      expect([7,14,30].map(n => CHALLENGES[`${path}-${n}`].days)).toEqual([7,14,30])
  })
  it('awards the final-trial badge once from actual saved workout evidence', () => {
    const active = beginChallenge('jinwoo-7', start)
    const trial = deriveChallenge([w(0),w(1)], active, '2026-10-07')
    expect(trial.finalTrial).toBe(true)
    expect(trial.bonusXp).toBe(0)
    const finished = deriveChallenge([w(0),w(1),w(2),w(2)], active, '2026-10-08')
    expect(finished.finished).toBe(true)
    expect(finished.bonusXp).toBe(60)
    expect(challengeBonuses([w(0),w(1),w(2),w(2)], { jinwoo: [active, active] }).jinwoo).toBe(60)
  })
  it('does not reward other-character sessions or early finished workouts', () => {
    const fail = w(1); fail.entries[0].sets[0].done = false
    const active = beginChallenge('jinwoo-7', start)
    expect(deriveChallenge([w(0), w(1, 'goku'), fail, w(2)], active).count).toBe(2)
  })
  it('extends the window without wiping progress', () => {
    const progress = deriveChallenge([w(0)], beginChallenge('jinwoo-7', start), '2026-11-15')
    expect(progress.extended).toBe(true)
    expect(progress.count).toBe(1)
  })
  it('ignores repeated challenge IDs and gives consistent level calculations', () => {
    const active = beginChallenge('jinwoo-7', start)
    expect(challengeProgresses([w(0),w(1),w(2)], [active, active])).toHaveLength(1)
    expect(xpLevel(180).level).toBe(2)
  })
})

describe('Phase 5 challenge tier unlocks', () => {
  it('starts with the seven-day tier available and later tiers locked', async () => {
    const { challengeTierStates } = await import('./challenges.js')
    for (const path of ['saitama', 'goku', 'jinwoo']) {
      const stages = challengeTierStates([], path, [])
      expect(stages.map(s => s.status)).toEqual(['available', 'locked', 'locked'])
      expect(stages.map(s => s.canStart)).toEqual([true, false, false])
    }
  })
  it('only permits enrolling after previous tier has been completed', async () => {
    const { challengeTierStates, enrollChallenge } = await import('./challenges.js')
    const initial = []
    expect(enrollChallenge([], 'jinwoo', initial, 'jinwoo-14', start)).toBe(initial)
    const seven = enrollChallenge([], 'jinwoo', initial, 'jinwoo-7', start)
    expect(seven).toHaveLength(1)
    expect(enrollChallenge([], 'jinwoo', seven, 'jinwoo-14', start)).toBe(seven)
    const completed7 = [w(0), w(1), w(2)]
    expect(challengeTierStates(completed7, 'jinwoo', seven).map(x => x.status))
      .toEqual(['completed', 'available', 'locked'])
    const fourteen = enrollChallenge(completed7, 'jinwoo', seven, 'jinwoo-14', Date.UTC(2026, 9, 9))
    expect(fourteen).toHaveLength(2)
    expect(enrollChallenge(completed7, 'jinwoo', fourteen, 'jinwoo-30', Date.UTC(2026, 9, 9))).toBe(fourteen)
    // New workouts must occur AFTER the 14-day challenge starts.
    const later = Array.from({ length: 6 }, (_, i) => ({ ...w(i + 4), d: `2026-10-${String(11 + i).padStart(2, '0')}`, end: Date.UTC(2026, 9, 11 + i, 18) }))
    const finished14 = [...completed7, ...later]
    expect(challengeTierStates(finished14, 'jinwoo', fourteen).map(x => x.status))
      .toEqual(['completed', 'completed', 'available'])
    expect(enrollChallenge(finished14, 'jinwoo', fourteen, 'jinwoo-30', Date.UTC(2026, 9, 18))).toHaveLength(3)
  })
  it('does not unlock a tier from other characters, expired days or incomplete workouts', async () => {
    const { challengeTierStates, enrollChallenge } = await import('./challenges.js')
    const seven = [beginChallenge('saitama-7', start)]
    const bad = w(0, 'saitama'); bad.entries[0].sets[0].done = false
    const result = challengeTierStates([bad, w(1, 'goku'), w(2, 'saitama')], 'saitama', seven)
    expect(result.map(x => x.status)).toEqual(['in-progress', 'locked', 'locked'])
    expect(enrollChallenge([], 'goku', [], 'saitama-7', start)).toHaveLength(0)
  })
  it('preserves previously started out-of-order challenges without deleting progress or XP', async () => {
    const { challengeTierStates, enrollChallenge } = await import('./challenges.js')
    const legacy = [beginChallenge('goku-14', start)]
    const stages = challengeTierStates([], 'goku', legacy)
    expect(stages.map(s => s.status)).toEqual(['available', 'in-progress', 'locked'])
    expect(enrollChallenge([], 'goku', legacy, 'goku-7', start)).toBe(legacy)
  })
})
