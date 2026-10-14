import { describe, it, expect } from 'vitest'
import { CANON_PROGRAMS, cardioGuidance, characterSessionCount } from './canon-programs.js'

describe('character training from canonical story inspiration', () => {
  it('keeps three characters but gives them 5, 4, 5 distinct training days', () => {
    expect(Object.keys(CANON_PROGRAMS)).toEqual(['saitama','goku','jinwoo'])
    for(const [path,count] of [['saitama',5],['goku',4],['jinwoo',5]]) {
      expect(characterSessionCount(path)).toBe(count)
      expect(new Set(CANON_PROGRAMS[path].days.map(d=>d.slot)).size).toBe(count)
      expect(new Set(CANON_PROGRAMS[path].days.map(d=>d.day)).size).toBe(count)
      expect(CANON_PROGRAMS[path].benchmark.length).toBeGreaterThan(12)
    }
  })
  it('does not pretend unverified running or martial arts can award XP', () => {
    for (const path of Object.keys(CANON_PROGRAMS)) {
      expect(cardioGuidance(path,1).proofRequired).toBe(false)
      expect(cardioGuidance(path,10,'advanced').minutes).toBeGreaterThan(cardioGuidance(path,1).minutes)
    }
  })
})
