import { heroTrainingInsights } from '../lib/hero-training-insights.js'

/** Optional, read-only character-training analytics: never adjusts progress or XP. */
export default function HeroTrainingInsights({ state, path }) {
  const insight = heroTrainingInsights(state, path)
  if (!insight) return <section className="aa-insights" aria-label="Hero Path training insights">
    <span className="aa-redesign-eyebrow">TRAINING INSIGHTS</span>
    <h2>Your recent progress</h2>
    <p className="aa-insights-hint">Start your selected character's training arc to unlock verified workout trends, weekly adherence and effort context.</p>
  </section>

  return <section className="aa-insights" aria-label="Hero Path training insights">
    <div className="aa-insights-heading">
      <div><span className="aa-redesign-eyebrow">TRAINING INSIGHTS</span>
        <h2>Your recent progress</h2></div>
      <span className="aa-insights-caption">From verified character workouts</span>
    </div>
    <div className="aa-insights-metrics">
      <div><strong>{insight.thisWeek}/{insight.target}</strong><span>This calendar week</span></div>
      <div><strong>{insight.lastFourWeeks}</strong><span>Sessions in four weeks</span></div>
      <div><strong>{insight.currentWorkSets}</strong><span>Working sets this week</span></div>
    </div>
    <h3>Weekly adherence</h3>
    <p className="aa-insights-hint">Completed sessions by calendar week. This is not the character arc's unlock counter.</p>
    <div className="aa-insights-weeks">
      {insight.weeks.map(week => <div className="aa-insights-week" key={week.start}>
        <span>{week.label}{week.current ? ' · now' : ''}</span>
        <div className="aa-insights-track" role="meter" aria-label={`Week of ${week.start}: ${week.sessions} of ${week.target} scheduled sessions`} aria-valuemin={0} aria-valuemax={week.target} aria-valuenow={Math.min(week.sessions, week.target)}>
          <span style={{ width: `${Math.min(100, week.sessions / week.target * 100)}%` }} />
        </div>
        <strong>{week.sessions}/{week.target}</strong>
      </div>)}
    </div>
    <h3>Exercise performance</h3>
    {insight.lifts.length ? <div className="aa-insights-lifts">
      {insight.lifts.map(lift => <div key={lift.id} className="aa-insights-lift">
        <div><strong>{lift.name}</strong><small>{lift.previous} → {lift.current} {lift.unit} estimated 1RM · last two logged sessions</small></div>
        <span className={lift.changePct > 0 ? 'is-up' : lift.changePct < 0 ? 'is-down' : ''}>{lift.changePct > 0 ? '+' : ''}{lift.changePct}%</span>
      </div>)}
    </div> : <p className="aa-insights-hint">Log the same loaded exercise in two verified character workouts to see a performance comparison. Bodyweight-only work without an external load does not produce a 1RM estimate.</p>}
    <h3>Effort and recovery context</h3>
    <p className="aa-insights-hint">
      {insight.averageRir == null ? 'Insufficient rated sets.' : `Average logged effort: ${insight.averageRir} RIR from ${insight.ratedSets} rated working sets.`}
      {' '}{insight.recoveryNote}
    </p>
  </section>
}
