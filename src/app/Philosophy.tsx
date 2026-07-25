/**
 * The 1% philosophy — one source of truth, shown in onboarding before the
 * module picker and again inside the engine deep-dive.
 */
export default function Philosophy() {
  return (
    <div className="phil">
      <p>
        <b>One percent better, compounded.</b> You don't chase heroic days here. You chase
        winnable weeks: each week's target is your own trailing four-week pace plus your chosen
        rate. Beat it and the week is <b>won</b> — it freezes into the ledger and compounds.
        Fifty-two won weeks at 1% aren't +52%; they're <b>+68%</b>.
      </p>
      <p>
        <b>The bar follows you, not a fantasy.</b> Because the target is your own recent pace,
        one heroic week never sets a trap and one bad week never lowers the bar to nothing.
        Miss a week and nothing is taken from you — the ledger only ever adds.
      </p>
      <p>
        <b>Ceilings make holding a win.</b> Growth can't ratchet forever — at some point 40
        focused hours is the healthy maximum, not a failure to reach 41. Set a ceiling and the
        target stops there: <b>holding the ceiling is a 100% week</b>, by design.
      </p>
      <p>
        <b>Consistency is the growth.</b> The week score is the plain average of every module
        that took part — no weighting, no cleverness, recomputable in your head. Showing up
        again is the whole game; the compounding is just its honest arithmetic.
      </p>
    </div>
  )
}
