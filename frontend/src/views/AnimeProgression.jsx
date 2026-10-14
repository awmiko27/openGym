import { useStore } from '../store/useStore.js'
import { deriveTrainingArc, TRAINING_ARCS } from '../lib/anime/training.js'
import { CANON_PROGRAMS, cardioGuidance } from '../lib/anime/canon-programs.js'

/** Training progression is independent of optional character challenges. */
export default function AnimeProgression({ path, onLoadWeek }) {
  const S = useStore(s => s.S)
  const saved = S.animeAscension || {}
  const design = CANON_PROGRAMS[path]
  const phases = TRAINING_ARCS[path]
  const arc = deriveTrainingArc(S.workouts, path, saved.programs?.[path])
  const upcoming = phases.split.reduce((result, length, i) => {
    const from = result.length ? result.at(-1).through + 1 : 1
    return [...result, { label: phases.phases[i], from, through: from + length - 1 }]
  }, [])
  const guidance = cardioGuidance(path, arc.week, saved.experience)

  return <section className="aa-section aa-arc-view" aria-label="Training arc">
    <p className="aa-redesign-eyebrow">CHARACTER PROGRESSION</p>
    <h2>{design.title} · Training Arc</h2>
    <p className="aa-note">A {arc.totalWeeks}-week program organized into {upcoming.length} training phases. Complete your prescribed workouts to unlock the next week. Challenges are optional and do not affect these unlocks.</p>

    <div className="aa-arc-current">
      <div className="aa-rpg-between">
        <strong>{arc.started ? arc.phase : 'Ready to begin'}</strong>
        <span>{arc.started ? `Week ${arc.week} of ${arc.totalWeeks}` : `${arc.totalWeeks} weeks`}</span>
      </div>
      {arc.started ? <>
        <progress max={arc.required} value={arc.done} aria-label="Current training week progress" className="aa-rpg-bar" />
        <p className="aa-note">{arc.completed ? 'All training weeks completed.' : `${arc.done} of ${arc.required} distinct workouts verified this week.`}</p>
        {arc.completed ? <p><strong>Training arc complete!</strong> Your workout history is preserved.</p> :
          arc.needsLoad ? <button type="button" className="btn primary" disabled={Boolean(S.active)} onClick={onLoadWeek}>Review Week {arc.week} workouts →</button> :
          <p className="aa-note">Week {arc.week} is loaded. Your next week unlocks after the required sessions are verified.</p>}
      </> : <button className="btn primary" type="button" onClick={onLoadWeek}>Review foundation plan →</button>}
    </div>

    <h3>Training phases</h3>
    <div className="aa-arc-phases">
      {upcoming.map((phase, i) => {
        const done = arc.completedWeeks >= phase.through
        const active = arc.started && !arc.completed && arc.week >= phase.from && arc.week <= phase.through
        return <div key={phase.label} className={'aa-arc-phase' + (active ? ' is-current' : '')}>
          <span className="aa-arc-phase-index" aria-hidden="true">{done ? '✓' : i + 1}</span>
          <div><strong>{phase.label}</strong><small>Weeks {phase.from}–{phase.through}</small></div>
          <span className="aa-arc-phase-status">{done ? 'Complete' : active ? 'Current phase' : 'Upcoming'}</span>
        </div>
      })}
    </div>

    <h3>Weekly workout structure</h3>
    <div className="aa-arc-sessions">
      {design.days.map(d => <div key={d.slot} className="aa-arc-session">
        <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day]}</span>
        <strong>{d.focus}</strong>
        <small>Workout {d.slot}</small>
      </div>)}
    </div>
    <details className="aa-redesign-info">
      <summary>Story inspiration & optional conditioning</summary>
      <p>{design.benchmark} is a fictional benchmark, not a required daily prescription.</p>
      <p>{design.adaptation}</p>
      {guidance && <p>Optional: {guidance.minutes} minutes of {design.cardioLabel.toLowerCase()}. This is guidance only, not automatically credited toward workout XP.</p>}
    </details>
  </section>
}
