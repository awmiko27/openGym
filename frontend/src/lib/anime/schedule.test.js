import { describe, it, expect } from 'vitest'
import { reconcileAnimeSchedule } from './schedule.js'

describe('safe fixed-week anime schedule switching', () => {
  it('clears only its unchanged previous appointments and captures newly assigned days', () => {
    const week = {1:['goku-new'],2:['goku-b'],3:['old-anime'],4:['goku-c'],5:['goku-d'],6:['user-sat']}
    const next = reconcileAnimeSchedule(week,{1:['old-a'],3:['old-anime'],5:['old-c']},[1,2,4,5])
    expect(week[3]).toEqual([])
    expect(week[6]).toEqual(['user-sat'])
    expect(next[1]).toEqual(['goku-new'])
    expect(next[2]).toEqual(['goku-b'])
  })
  it('preserves user edited days and legacy untracked assignments', () => {
    const week = {1:['new'],3:['user-custom'],5:['old-anime']}
    reconcileAnimeSchedule(week,{3:['old-anime'],5:['old-anime']},[1,2,4,5])
    expect(week[3]).toEqual(['user-custom'])
    expect(week[5]).toEqual(['old-anime'])
  })
})
