import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { activeProfile, eqAvailable } from '../lib/equipment.js'
import { EXIDX } from '../lib/exercises.js'
import { uid } from '../lib/format.js'
import { scheduleModeOf } from '../lib/rotation.js'
import { CANON_PROGRAMS } from '../lib/anime/canon-programs.js'
import { challengeTierStates } from '../lib/anime/challenges.js'
import { challengePlan, activateChallenge, activeChallengeProgress, exitChallenge } from '../lib/anime/challenge-mode.js'
import { challengeWorkoutFeedback } from '../lib/anime/challenge-feedback.js'

const tiers = ['I', 'II', 'III']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const trialDay = (weekday, startedOn) => ((Number(weekday) - startedOn + 7) % 7) + 1

/** Major challenges replace the weekly calendar temporarily; they do not run
 * concurrently with the main arc. Ordinary daily/weekly XP quests remain.
 */
export default function AnimeChallenges({ path, onExit }) {
  const navigate = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [previewId, setPreviewId] = useState(null)
  const [message, setMessage] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const saved = S.animeAscension || {}
  const history = saved.challenges?.[path] || []
  const stages = challengeTierStates(S.workouts, path, history)
  const earned = stages.filter(t => t.status === 'completed').length
  const current = stages.find(t => t.status === 'in-progress')
  const design = CANON_PROGRAMS[path]
  const mode = saved.challengeMode
  const activeProgress = activeChallengeProgress(S)
  const latestFeedback = mode?.path === path ? challengeWorkoutFeedback(S) : null

  const makePlan = id => challengePlan(useStore.getState().S, id, {
    catalogue: Object.values(EXIDX), equipment: activeProfile(useStore.getState().S),
    isAvailable: eqAvailable, uid,
  })
  const start = id => {
    setMessage('')
    if (S.active) { setMessage('Finish or discard the current workout first.'); return }
    if (scheduleModeOf(S) === 'rotation') { setMessage('Switch openGym to Fixed Week mode before starting a challenge.'); return }
    try {
      const plan = makePlan(id)
      if (!plan) throw Error('No eligible challenge plan could be generated. Check openGym equipment settings.')
      update(st => activateChallenge(st, plan))
      setPreviewId(null)
      navigate('/plan')
    } catch (e) { setMessage(e.message); console.error('Anime Ascension challenge activation:', e) }
  }
  const cancelLegacy = id => {
    if (S.active) { setMessage('Finish or discard the active workout first.'); return }
    update(st => {
      const aa = st.animeAscension || {}
      if (aa.challengeMode) return
      const history = aa.challenges?.[path] || []
      const stage = challengeTierStates(st.workouts, path, history).find(x => x.id === id)
      if (stage?.status !== 'in-progress') return
      st.animeAscension = { ...aa, challenges: { ...aa.challenges,
        [path]: history.map(entry => entry.id === id && entry.v === 1
          ? { ...entry, cancelledAt: Date.now() } : entry) } }
    })
    setMessage('Old-style side quest cancelled. Your current calendar was not changed.')
  }
  const finish = cancel => {
    setMessage('')
    if (S.active) { setMessage('Finish or discard the current workout first.'); return }
    try {
      let outcome
      update(st => { outcome = exitChallenge(st, { cancel }) })
      setCancelConfirm(false)
      onExit?.(mode.previousPath)
      if (outcome?.preservedDays.length) setMessage(`Training arc resumed. Your manually changed calendar days (${outcome.preservedDays.map(d => weekdays[d]).join(', ')}) were preserved; review them in openGym Plan.`)
      else setMessage('Your training arc and original weekly plan have been restored.')
    } catch (e) { setMessage(e.message) }
  }

  return <section className="aa-section aa-challenge-view" aria-label="Character challenges">
    <p className="aa-redesign-eyebrow">SPECIAL TRAINING MODE</p>
    <h2>{design.title} · Challenges</h2>
    <p className="aa-note">A major challenge temporarily pauses your training arc and replaces the weekly plan with trial workouts. Complete or cancel it to resume. XP quests still use your saved openGym workouts.</p>
    {message && <p className="aa-redesign-caution" role="status">{message}</p>}
    {mode && <div className="aa-mode-banner">
      <strong>{mode.path === path ? 'Challenge mode active' : `Another character's challenge is active: ${CANON_PROGRAMS[mode.path]?.title || mode.path}`}</strong>
      <p className="aa-note">Your original calendar and training week are saved. You cannot load another program until you leave challenge mode.</p>
      {mode.path === path && Number.isInteger(mode.startDay) && <p className="aa-note">Day 1: {weekdays[mode.startDay]}. Trial workouts follow the challenge start day, not the usual weekly schedule.</p>}
      {mode.path === path && <>
        <p className="aa-note">{activeProgress?.count || 0} / {activeProgress?.sessions || 0} verified challenge workouts{mode.v === 2 ? ` · Training block ${mode.blockIndex + 1}` : ''}</p>
        {latestFeedback && <div role="status" className={'aa-feedback ' + (latestFeedback.kind === 'credited' ? 'aa-feedback-success' : 'aa-feedback-warning')}>
          <strong>{latestFeedback.title}</strong>
          <p>{latestFeedback.detail}</p>
        </div>}
        {activeProgress && !activeProgress.objective && <p className="aa-note">This challenge was started before benchmark assessments. It keeps its original completion rules; cancel and restart an eligible tier to use the new tests.</p>}
        {activeProgress?.objective && <div className="aa-mode-assessment" aria-label="Challenge assessment progress">
          <strong>{activeProgress.objective.focus}</strong>
          <p className="aa-note">Exercise: {activeProgress.objective.exerciseName}</p>
          <p className="aa-note">Baseline: {activeProgress.objective.baseline ?? 'Not recorded'} repetitions · Final trial target: {activeProgress.objective.finalTarget} total repetitions</p>
          {activeProgress.objective.checkpointAt && <p className="aa-note">Checkpoint (session {activeProgress.objective.checkpointAt}): {activeProgress.objective.checkpointScore === null ? 'Not yet passed' : `${activeProgress.objective.checkpointScore} repetitions · Passed`}</p>}
        </div>}
        {activeProgress?.finished ? <button className="btn primary" type="button" disabled={Boolean(S.active)} onClick={() => finish(false)}>Finish challenge & resume training arc</button> : <>
          {!cancelConfirm ? <button className="btn" type="button" disabled={Boolean(S.active)} onClick={() => setCancelConfirm(true)}>Cancel challenge</button> : <div className="aa-mode-cancel">
            <p className="aa-note">Cancel this challenge? Completed workouts stay in history, but the cancelled attempt earns no challenge badge or completion bonus.</p>
            <button className="btn danger" type="button" onClick={() => finish(true)}>Confirm cancellation</button>
            <button className="btn" type="button" onClick={() => setCancelConfirm(false)}>Keep training</button>
          </div>}
        </>}
        <button className="btn" type="button" onClick={() => navigate('/plan')}>View challenge schedule</button>
      </>}
    </div>}
    <div className="aa-challenge-overview">
      <div><strong>{earned} / 3</strong><span>Badges earned</span></div>
      <div><strong>{current ? `${current.progress.count} / ${current.sessions}` : '–'}</strong><span>{current ? 'Current trial sessions' : 'Current trial'}</span></div>
    </div>
    <div className="aa-challenge-ladder">
      {stages.map(stage => {
        const status = stage.status
        const p = stage.progress?.cancelled ? null : stage.progress
        const preview = previewId === stage.id && !mode ? makePlan(stage.id) : null
        return <article key={stage.id} className={'aa-challenge-tier ' + (status === 'locked' ? 'is-locked' : '') + (status === 'in-progress' ? ' is-active' : '')}>
          <div className="aa-challenge-tier-top">
            <span className="aa-challenge-tier-index">{status === 'completed' ? '✓' : status === 'locked' ? '🔒' : tiers[stage.tier - 1]}</span>
            <div className="aa-challenge-tier-heading"><small>Tier {stage.tier} · {stage.days} days</small><h3>{stage.name}</h3></div>
            <strong className="aa-challenge-tier-reward">+{stage.potentialXp || stage.bonusXp} XP</strong>
          </div>
          {status === 'locked' ? <p className="aa-note aa-challenge-lock-message">Complete <strong>{stage.prerequisite}</strong> to unlock this challenge.</p> : <>
            <p className="aa-note">{stage.description}</p>
            {p && <>
              <progress max={stage.sessions} value={p.count} className="aa-rpg-bar" aria-label={`${stage.name} challenge progress`} />
              <p className="aa-note">{p.count} of {stage.sessions} verified trial sessions · Day {p.elapsed}{p.extended ? ' · Deadline extended' : ''}</p>
              {!p.objective && status === 'in-progress' && <p className="aa-note">Legacy attempt: your original counting rules remain until you finish or cancel. New assessment rules apply only when starting a fresh challenge.</p>}
              {p.objective && <p className="aa-note">{p.objective.exerciseName}: starting benchmark {p.objective.baseline ?? 'pending'} reps; final target {p.objective.finalTarget} reps.{p.objective.checkpointAt ? ` Checkpoint at session ${p.objective.checkpointAt}.` : ''}</p>}
              {status === 'completed' ? <p className="aa-challenge-success">✓ Badge earned · {p.completedOn} · +{p.bonusXp} XP{p.objective?.finalScore != null ? ` · Final assessment: ${p.objective.finalScore} reps` : ''}</p> :
                <p className="aa-note">{p.finalTrial ? 'Final assessment ready: beat your starting benchmark to clear the trial.' : 'Complete each prescribed workout in order. Your opening session records the benchmark.'}</p>}
            </>}
            {status === 'available' && !mode && <>
              <button className="btn" type="button" onClick={() => setPreviewId(previewId === stage.id ? null : stage.id)}>{previewId === stage.id ? 'Hide workout preview' : 'Review challenge workouts'}</button>
              {preview && <div className="aa-mode-preview" aria-label="Challenge workout preview">
                <p className="aa-note"><strong>Challenge objective:</strong> {stage.focus} · {preview.objective.exerciseName}</p>
                <p className="aa-note">Opening baseline: {preview.objective.baselineTotal} planned reps · Final assessment: {preview.objective.finalTotal} planned reps (increase at least {preview.objective.minGain}).{preview.objective.checkpointAt ? ` Midway checkpoint at workout ${preview.objective.checkpointAt}.` : ''}</p>
                {Array.from({ length: stage.sessions }, (_, index) => {
                  const day = preview.schedule[index]
                  const r = preview.routines[index]
                  const dayNumber = trialDay(day.day, preview.startDay) + 7 * Math.floor(index / preview.cycleSize)
                  const label = index === 0 ? 'Baseline' : index + 1 === preview.objective.checkpointAt ? 'Checkpoint' : index === stage.sessions - 1 ? 'Final assessment' : 'Training'
                  return <details key={index}><summary>Session {index + 1} · Day {dayNumber} · {weekdays[day.day]} · {label} · {r?.name.split(' · Trial ')[0]}</summary>
                    <ul>{r?.ex.map(ex => <li key={ex.id}>{EXIDX[ex.id]?.n || 'Exercise'} · {ex.sets} × {ex.reps}</li>)}</ul>
                  </details>
                })}
                <p className="aa-note">Day 1 is the day you press Start. Each session has its own prescription. Only the current training block is placed in Fixed Week; after you complete that block, return here to load the next one. Other days allow recovery.</p>
              </div>}
              {previewId === stage.id && !preview && <p className="aa-note">Preview unavailable. Please check the exercise catalog and openGym equipment settings.</p>}
              <button className="btn primary" type="button" disabled={Boolean(S.active)} onClick={() => start(stage.id)}>Start {stage.days}-day challenge</button>
            </>}
            {status === 'in-progress' && <span className="aa-challenge-status">Challenge in progress</span>}
            {status === 'in-progress' && !mode && p && <button className="btn" type="button" disabled={Boolean(S.active)} onClick={() => cancelLegacy(stage.id)}>Cancel previous side quest</button>}
          </>}
        </article>
      })}
    </div>
    <p className="aa-note">Only challenge-specific, verified workouts count. Ending a challenge restores the original program and removes temporary trial routines from the routine list; saved workout history is kept. A cancelled attempt can be restarted later.</p>
  </section>
}
