import { useStore } from '../store/useStore.js'
import { CANON_PROGRAMS } from '../lib/anime/canon-programs.js'
import { challengeTierStates, enrollChallenge } from '../lib/anime/challenges.js'

const tiers = ['I', 'II', 'III']

/** Optional character trials, distinct from the multiweek training arc. */
export default function AnimeChallenges({ path }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const saved = S.animeAscension || {}
  const history = saved.challenges?.[path] || []
  const stages = challengeTierStates(S.workouts, path, history)
  const earned = stages.filter(t => t.status === 'completed').length
  const current = stages.find(t => t.status === 'in-progress')
  const design = CANON_PROGRAMS[path]

  const start = id => {
    // A real workout remains protected. No schedule changes are made here.
    if (useStore.getState().S.active) return
    update(st => {
      if (st.active) return
      const profile = st.animeAscension || {}
      const all = profile.challenges || {}
      const previous = Array.isArray(all[path]) ? all[path] : []
      const next = enrollChallenge(st.workouts, path, previous, id)
      if (next === previous) return
      st.animeAscension = { ...profile, challenges: { ...all, [path]: next } }
    })
  }

  return <section className="aa-section aa-challenge-view" aria-label="Character challenges">
    <p className="aa-redesign-eyebrow">OPTIONAL QUESTS</p>
    <h2>{design.title} · Challenges</h2>
    <p className="aa-note">Three challenge tiers with their own badges and bonus XP. Finish the 7-day challenge to unlock 14 days; finish that to unlock 30 days. Your training arc progresses separately.</p>
    <div className="aa-challenge-overview">
      <div><strong>{earned} / 3</strong><span>Badges earned</span></div>
      <div><strong>{current ? `${current.progress.count} / ${current.sessions}` : '–'}</strong><span>{current ? 'Current trial sessions' : 'Current trial'}</span></div>
    </div>
    <div className="aa-challenge-ladder">
      {stages.map(stage => {
        const status = stage.status
        const p = stage.progress
        return <article key={stage.id} className={'aa-challenge-tier ' + (status === 'locked' ? 'is-locked' : '') + (status === 'in-progress' ? ' is-active' : '')}>
          <div className="aa-challenge-tier-top">
            <span className="aa-challenge-tier-index">{status === 'completed' ? '✓' : status === 'locked' ? '🔒' : tiers[stage.tier - 1]}</span>
            <div className="aa-challenge-tier-heading">
              <small>Tier {stage.tier} · {stage.days} days</small>
              <h3>{stage.name}</h3>
            </div>
            <strong className="aa-challenge-tier-reward">+{stage.potentialXp || stage.bonusXp} XP</strong>
          </div>
          {status === 'locked' ? <p className="aa-note aa-challenge-lock-message">Complete <strong>{stage.prerequisite}</strong> to unlock this challenge.</p> : <>
            <p className="aa-note">{stage.description}</p>
            {p && <>
              <progress max={stage.sessions} value={p.count} className="aa-rpg-bar" aria-label={`${stage.name} challenge progress`} />
              <p className="aa-note">{p.count} of {stage.sessions} qualifying sessions · Day {p.elapsed}
                {p.extended ? ' · Deadline extended' : ''}</p>
              {status === 'completed' ? <p className="aa-challenge-success">Badge earned · {p.completedOn} · +{p.bonusXp} XP</p> :
                <p className="aa-note">{p.finalTrial ? 'Final trial: complete one more qualifying workout.' : 'Continue completing eligible workouts on separate dates.'}</p>}
            </>}
            {status === 'available' && <button className="btn primary" type="button" disabled={!stage.canStart || Boolean(S.active)} onClick={() => start(stage.id)}>
              {stage.canStart ? `Start ${stage.days}-day challenge` : S.active ? 'Finish current workout first' : 'Complete current challenge first'}
            </button>}
            {status === 'in-progress' && <span className="aa-challenge-status">Challenge in progress</span>}
          </>}
        </article>
      })}
    </div>
    <p className="aa-note">Only verified, character-specific workouts recorded after starting a challenge count. Missed days extend progress instead of resetting it. Challenges never replace your openGym training schedule.</p>
  </section>
}
