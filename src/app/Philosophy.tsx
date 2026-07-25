/**
 * The 1% philosophy — the general idea, shown before module selection and in
 * the engine deep-dive. The exact arithmetic deliberately lives elsewhere
 * (the engine page), so this stays an introduction, not a spec.
 */
export default function Philosophy() {
  return (
    <div className="phil">
      <p>
        <b>One percent better, every week.</b> Not heroic days — small, repeatable weekly
        improvements that stack. Win a week and it's banked forever; a year of 1% weeks doesn't
        add up to 52%, it compounds to about <b>+68%</b>. The whole app exists to make that one
        weekly win visible, honest and repeatable.
      </p>
      <p>
        <b>Many instruments, one practice.</b> Training and strength, deep-work focus,
        breathwork, daily habits, supplements, fasting — each module is an instrument on the
        same panel. Enable only what fits your life; everything you turn on feeds a single
        weekly score, so you're never juggling seven apps. You're playing one.
      </p>
      <p>
        <b>The bar is yours.</b> Each week's target grows out of your own recent pace — hard
        weeks never punish you, and "enough" can be a deliberate win. The exact arithmetic
        lives in the engine page, one tap away, and it's simple enough to recompute in your
        head.
      </p>
    </div>
  )
}
