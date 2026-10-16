import { pplulReadiness } from '../lib/pplul-readiness.js'
import { pplulProgressRows } from '../lib/pplul-trends.js'

/** Appears only for a full, non-challenge Monday–Friday PPLUL fixed week. */
export default function PplulProgressSummary({ state }) {
  const review = pplulReadiness(state)
  const history = review && !review.upgrade ? pplulProgressRows(state) : []
  if (!review) return null
  return <details className="card" style={{ marginTop: 12, padding: 14 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>PPLUL · Training progression</summary>
    {review.upgrade ? <p className="small dim">
      Your saved PPLUL routines use the older fixed-rep format. Reload the PPLUL starter
      when no workout or challenge is active to enable double progression. Your old
      routines and completed workouts will remain saved.
    </p> : <>
      <p className="small dim">Read-only suggestions from OpenGym's progression engine. Your saved workout history is never changed.</p>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', margin: '10px 0' }}>
        <span><strong>{review.ready}</strong> load increases</span>
        <span><strong>{review.building}</strong> building reps</span>
        <span><strong>{review.deload}</strong> deload suggestions</span>
        <span><strong>{review.notStarted}</strong> not yet started</span>
      </div>
      {review.averageRir == null
        ? <p className="small dim">Log RIR or RPE during your sessions to see an effort trend (minimum five rated working sets in the latest three PPLUL sessions).</p>
        : <p className="small dim">Average logged effort: {review.averageRir} RIR across {review.ratedSets} rated working sets in your latest three PPLUL sessions. Check your exercise notes for target RIR.</p>}
      {review.deload > 0 && <p className="small dim">Review your recent performance and recovery before acting on a deload suggestion.</p>}
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Recent exercise progression</summary>
        {history.length ? <div style={{ marginTop: 9 }}>
          {history.slice(0, 8).map(row => <div key={row.key} style={{ padding: '9px 0', borderBottom: '1px solid var(--sep)' }}>
            <strong>{row.name}</strong> <span className="small dim">· {row.date}{row.borrowed ? ' · prior routine' : ''}</span>
            <p className="small dim" style={{ margin: '4px 0 0' }}>
              Last: {row.lastWeight} {row.unit} × {row.lastReps} min reps.
              {' '}Next: {row.nextKind === 'up' ? 'increase load' : row.nextKind === 'deload' ? 'consider deload' : 'build reps'}
              {Number.isFinite(row.nextWeight) ? ` at ${row.nextWeight} ${row.unit}` : ''}
              {row.nextReps ? ` · ${row.nextReps} reps` : ''}.
            </p>
          </div>)}
        </div> : <p className="small dim">Complete a PPLUL session to see exercise history here.</p>}
      </details>
    </>}
  </details>
}
