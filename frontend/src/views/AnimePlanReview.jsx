import { useState } from 'react'
import { CANON_PROGRAMS, cardioGuidance } from '../lib/anime/canon-programs.js'

/** Progressive disclosure: the week is scannable, exact prescriptions one tap away. */
export default function AnimePlanReview({ path, preview, profile, onBack, onLoad, loadingError, activeWorkout }) {
  const [openSlot, setOpenSlot] = useState('A')
  const design = CANON_PROGRAMS[path]
  const guidance = cardioGuidance(path, preview?.week || 1, profile.experience)
  return <section className="aa-redesign-review" aria-label="Review training plan">
    <div className="aa-redesign-heading">
      <button className="btn" type="button" onClick={onBack}>← Back</button>
      <span className="aa-redesign-eyebrow">REVIEW BEFORE LOADING</span>
      <h2>{design.title} · Week {preview?.week || 1}</h2>
      <p>Check the actual exercise selection before changing your openGym weekly plan.</p>
    </div>

    {!preview ? <div className="aa-redesign-empty" role="alert">
      <strong>Workout preview unavailable</strong>
      <p>No complete plan could be created from the current exercise catalog and openGym equipment settings. Your existing plan has not changed.</p>
    </div> : <>
      <div className="aa-redesign-metrics" aria-label="Training plan summary">
        <div><strong>{preview.workoutCount}</strong><span>Workout days</span></div>
        <div><strong>{preview.restDays.length}</strong><span>Recovery days</span></div>
        <div><strong>{preview.totalWorkingSets}</strong><span>Working sets / week</span></div>
      </div>
      {preview.backBalanceNote && <p className="aa-redesign-caution">{preview.backBalanceNote}</p>}
      <div className="aa-redesign-week-top">
        <h3>Your weekly workouts</h3>
        <span>{profile.experience} · {profile.goal}</span>
      </div>
      <div className="aa-redesign-days">
        {preview.days.map((day, i) => {
          const expanded = openSlot === day.slot
          return <article key={day.slot} className={'aa-redesign-day' + (expanded ? ' is-open' : '')}>
            <button type="button" className="aa-redesign-day-toggle" aria-expanded={expanded}
              aria-controls={expanded ? `aa-workout-exercises-${day.slot}` : undefined}
              onClick={() => setOpenSlot(expanded ? null : day.slot)}>
              <span className="aa-redesign-day-index">{day.slot}</span>
              <span className="aa-redesign-day-label"><strong>{day.weekday} · {day.focus}</strong>
                <small>{day.exercises.length} exercises · {day.workingSets} sets</small></span>
              <span className="aa-redesign-open-label">{expanded ? 'Hide' : 'View exercises'} <span aria-hidden="true">{expanded ? '−' : '+'}</span></span>
            </button>
            {expanded && <div className="aa-redesign-exercise-list" id={`aa-workout-exercises-${day.slot}`}>
              {day.exercises.map((exercise, n) => <div className="aa-redesign-exercise" key={`${day.slot}-${exercise.id}`}>
                <span className="aa-redesign-exercise-number">{n + 1}</span>
                <div className="aa-redesign-exercise-copy"><strong>{exercise.name}</strong>
                  {exercise.equipment && <small>{exercise.equipment}</small>}</div>
                <span className="aa-redesign-prescription">{exercise.sets} × {exercise.reps}<small>sets × reps</small></span>
              </div>)}
            </div>}
          </article>
        })}
      </div>
      <div className="aa-redesign-rest"><strong>Recovery</strong><span>{preview.restDays.join(' · ')}</span></div>
      <details className="aa-redesign-info">
        <summary>Story inspiration and optional conditioning</summary>
        <p><strong>Story benchmark:</strong> {design.benchmark}. This is a long-term inspiration, not the workout prescribed above.</p>
        <p>{design.adaptation}</p>
        {guidance && <p>Optional: {guidance.minutes} minutes of {guidance.label.toLowerCase()}. {guidance.instruction} Cardio/skill guidance is not yet verified for XP.</p>}
      </details>
    </>}

    <p className="aa-redesign-caution">Loading replaces the character's scheduled weekdays in Fixed Week mode. Previous workout history remains saved. Manually edited assignments are protected; review any older character-plan days in openGym Plan.</p>
    {activeWorkout && <p className="aa-redesign-caution" role="status">Finish or discard your active workout before loading a different training plan.</p>}
    {loadingError && <div role="alert" className="aa-errors">{loadingError}</div>}
    <div className="aa-redesign-review-actions">
      <button type="button" className="btn" onClick={onBack}>Edit profile or path</button>
      <button type="button" className="btn primary" disabled={!preview || Boolean(activeWorkout)} onClick={onLoad}>Load training plan</button>
    </div>
  </section>
}
