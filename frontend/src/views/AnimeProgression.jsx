import { useStore } from '../store/useStore.js'
import { deriveTrainingArc, TRAINING_ARCS, startTrainingArc } from '../lib/anime/training.js'
import { beginChallenge, CHALLENGES, challengeProgresses } from '../lib/anime/challenges.js'

/** Both systems are opt-in and persist in the existing Anime Ascension profile.
 * Workout evidence is always read from openGym history, never manually checked. */
export default function AnimeProgression({ path, onLoadWeek }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const saved = S.animeAscension || {}
  const programs = saved.programs || {}
  const arc = deriveTrainingArc(S.workouts, path, programs[path])
  const history = saved.challenges?.[path] || []
  const challenges = challengeProgresses(S.workouts, history)
  const current = challenges.at(-1)
  const startedIds = new Set(challenges.map(c => c.id))
  const canStart = !current || current.finished
  const start = id => {
    if (!canStart || startedIds.has(id) || S.active) return
    update(st => {
      const savedProfile = st.animeAscension || {}
      const previous = savedProfile.challenges || {}
      const list = Array.isArray(previous[path]) ? previous[path] : []
      if (list.some(x => x.id === id)) return
      st.animeAscension = { ...savedProfile, challenges: {
        ...previous, [path]: [...list, beginChallenge(id)],
      } }
    })
  }
  return <section className="aa-section" aria-label="Training arcs and challenges">
    <h2>Training arc</h2>
    {!arc.started ? <>
      <p className="aa-note">Your {TRAINING_ARCS[path].weeks}-week program starts when you load the character's first training plan. Previous workouts and XP stay intact.</p>
      <button className="btn" type="button" onClick={onLoadWeek}>Review foundation plan</button>
    </> : <>
      <p><strong>{arc.phase}</strong> · Week {arc.week} / {arc.totalWeeks}</p>
      <progress max={arc.required} value={arc.done} className="aa-rpg-bar" aria-label="Current training week progress" />
      <p className="aa-note">{arc.done}/{arc.required} qualifying workouts this week. Complete A/B/C on separate days with a rest day between credited sessions.</p>
      {arc.completed ? <p><strong>Training arc completed!</strong> Your earlier workout records and XP are preserved.</p> :
        arc.needsLoad ? <button type="button" className="btn primary" disabled={Boolean(S.active)} onClick={onLoadWeek}>Review and load Week {arc.week} workouts</button> :
        <p className="aa-note">Week {arc.week} prescription loaded. New weeks unlock automatically from saved workout performance; loading an updated plan is a deliberate action.</p>}
    </>}
    <hr />
    <h2>Character challenges</h2>
    <p className="aa-note">Optional 7-, 14-, and 30-day targets. Missing a day extends your challenge instead of erasing progress. Final trials use a completed workout, not an unchecked checkbox.</p>
    {current && <div className="aa-rpg-record">
      <strong>{current.name}</strong>
      <p>{current.count}/{current.sessions} verified sessions · Day {current.elapsed} (target {current.days})</p>
      <progress max={current.sessions} value={current.count} className="aa-rpg-bar" aria-label="Challenge progress" />
      <p className="aa-note">{current.finished ? `Completed! +${current.bonusXp} challenge XP and badge earned.` :
        current.finalTrial ? 'Final trial: complete one more qualifying workout.' :
        current.extended ? 'Target window passed; progress is safely extended.' : 'Next objective: complete a qualifying character workout.'}</p>
    </div>}
    {Object.values(CHALLENGES).filter(c => c.path === path).map(c => <div className="aa-rpg-record" key={c.id}>
      <div className="aa-rpg-between"><strong>{c.name}</strong><span>{c.days} days · +{c.bonusXp} XP</span></div>
      <p className="aa-note">{c.sessions} credited sessions, with recovery and a final trial</p>
      <button type="button" className="btn" disabled={!canStart || startedIds.has(c.id) || Boolean(S.active)} onClick={() => start(c.id)}>
        {startedIds.has(c.id) ? challenges.find(x => x.id === c.id)?.finished ? 'Badge earned' : 'In progress' : 'Start challenge'}
      </button>
    </div>)}
    {challenges.filter(c => c.finished).length > 0 && <p className="aa-note">Badges earned: {challenges.filter(c => c.finished).map(c => c.name).join(' · ')}</p>}
  </section>
}
