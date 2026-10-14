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
