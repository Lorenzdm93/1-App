/**
 * Programs — nine of them: three goals × three weekly frequencies.
 *
 * The prescriptions follow the current evidence rather than gym lore, and the
 * two findings that actually shape the structure are:
 *
 *  1. For hypertrophy, weekly set volume per muscle is the driver (roughly
 *     10–20 hard sets); how you slice those sets across the week has close to
 *     no independent effect. So at two days we pack more sets per session
 *     rather than apologising for the frequency.
 *  2. For strength, frequency does carry its own effect on top of volume. So
 *     the strength programs put the main lifts in front of you as often as the
 *     schedule allows, at lower reps and longer rest, and keep accessories few.
 *
 * Intensity is prescribed as RIR (reps in reserve) rather than %1RM: it needs
 * no max test, it self-corrects on a bad day, and it is where the field has
 * moved. RIR 2 means you stop with two good reps left.
 *
 * Splits by frequency are not a style choice:
 *  - 2 days → full body. The only structure that trains each muscle twice.
 *  - 3 days → full body. A push/pull/legs at three days hits each muscle once
 *    a week, which is the worse trade at this frequency.
 *  - 4 days → upper/lower ×2. Still twice per muscle, but with room for the
 *    accessory volume that full body cannot fit into one session.
 */
import type { Template, TemplateItem } from './model'

export type Goal = 'strength' | 'hypertrophy' | 'mixed'
export type Days = 2 | 3 | 4

/** [exerciseId, sets, reps, restSeconds, RIR] */
type Row = [string, number, string, number, number]

export interface ProgramDay {
  name: string
  note: string
  rows: Row[]
}

export interface Program {
  split: string
  /** Why this shape, in the user's words. Rendered as the program's rationale. */
  why: string
  days: ProgramDay[]
}

export const GOALS: { id: Goal; label: string; blurb: string; detail: string }[] = [
  {
    id: 'strength',
    label: 'Strength',
    blurb: 'Lift heavier',
    detail:
      'Few exercises, heavy loads, 3–5 reps, three minutes of rest. The main lifts come back often because strength — unlike size — keeps improving with frequency even when total volume is held constant. Expect to leave the gym less tired and more capable.',
  },
  {
    id: 'hypertrophy',
    label: 'Hypertrophy',
    blurb: 'Build size',
    detail:
      'More exercises, moderate loads, 6–15 reps, shorter rest. Size is driven by weekly hard sets per muscle — roughly 10–20 — so these programs chase volume and take sets close to failure (1–2 reps left). How the week is split matters far less than the total.',
  },
  {
    id: 'mixed',
    label: 'Mixed',
    blurb: 'Both, honestly',
    detail:
      'Heavy compound first while you are fresh — 4–6 reps — then accessories in the 8–15 range. You progress on both fronts slightly slower than a specialist would on either, which is the correct trade if you are not competing.',
  },
]

export const FREQUENCIES: { days: Days; label: string; detail: string }[] = [
  {
    days: 2,
    label: '2 days',
    detail:
      'Full body, twice. Everything gets trained twice a week, which is the whole reason not to split at this frequency. Sessions run long — six exercises — because there is nowhere else to put the volume.',
  },
  {
    days: 3,
    label: '3 days',
    detail:
      'Full body, three variants. Tempting to run push/pull/legs here, but that leaves each muscle trained once a week. Rotating three full-body days keeps frequency at two-plus for everything that matters.',
  },
  {
    days: 4,
    label: '4 days',
    detail:
      'Upper / lower, twice each. Still two sessions per muscle, but with a whole session to fill rather than a corner of one — this is where isolation work and the second half of your weekly sets finally fit.',
  },
]

const P: Record<string, Program> = {
  /* ------------------------------- STRENGTH ------------------------------- */
  'strength-2': {
    split: 'Full body A / B',
    why: 'Two sessions is tight for strength, so nothing is wasted: squat and bench on one day, deadlift and press on the other, five sets each at 3–5 reps. The accessories exist only to keep the back and midsection able to hold those positions.',
    days: [
      {
        name: 'Full Body A — Squat & Bench',
        note: 'The two lifts that carry the week. Rest a full three minutes; the set quality is the point, not the sweat.',
        rows: [
          ['squat', 5, '3-5', 180, 1],
          ['bench-press', 5, '3-5', 180, 1],
          ['barbell-row', 4, '6-8', 120, 2],
          ['rdl', 3, '6-8', 120, 2],
          ['plank', 3, '40-60s', 60, 2],
        ],
      },
      {
        name: 'Full Body B — Deadlift & Press',
        note: 'Deadlift sets are capped at four: it takes the most out of you and gives the least back past that point.',
        rows: [
          ['deadlift', 4, '3-5', 180, 1],
          ['ohp', 5, '3-5', 180, 1],
          ['front-squat', 3, '5-6', 150, 2],
          ['chin-up', 4, '6-8', 120, 2],
          ['hanging-leg-raise', 3, '8-12', 90, 1],
        ],
      },
    ],
  },
  'strength-3': {
    split: 'Full body A / B / C',
    why: 'Each session leads with a different main lift but the other two still appear, so squat, bench and deadlift are each practised two to three times a week. That repetition is the mechanism — strength is a skill before it is a tissue.',
    days: [
      {
        name: 'Full Body A — Squat lead',
        note: 'Squat heavy, bench at a slightly lower intensity so it stays fresh for its own day.',
        rows: [
          ['squat', 5, '3-5', 180, 1],
          ['bench-press', 4, '4-6', 150, 2],
          ['barbell-row', 4, '6-8', 120, 2],
          ['plank', 3, '40-60s', 60, 2],
        ],
      },
      {
        name: 'Full Body B — Deadlift lead',
        note: 'Pulling day. Overhead press takes the heavy upper-body slot here.',
        rows: [
          ['deadlift', 4, '3-5', 180, 1],
          ['ohp', 4, '4-6', 150, 1],
          ['lat-pulldown', 3, '8-10', 90, 2],
          ['hanging-leg-raise', 3, '8-12', 90, 1],
        ],
      },
      {
        name: 'Full Body C — Bench lead',
        note: 'Bench gets its heaviest exposure; the front squat keeps the legs working without competing with day A.',
        rows: [
          ['bench-press', 5, '3-5', 180, 1],
          ['front-squat', 4, '4-6', 150, 2],
          ['chin-up', 4, '6-8', 120, 2],
          ['rdl', 3, '6-8', 120, 2],
        ],
      },
    ],
  },
  'strength-4': {
    split: 'Upper / Lower ×2',
    why: 'Each half of the body gets a heavy day and a slightly lighter, higher-rep day. The second exposure is what drives the frequency benefit; running both at maximum intensity is how people stall, so the B days pull back deliberately.',
    days: [
      {
        name: 'Upper A — Heavy',
        note: 'Bench and row at their heaviest. Face pulls at the end are insurance, not training.',
        rows: [
          ['bench-press', 5, '3-5', 180, 1],
          ['barbell-row', 4, '5-6', 150, 2],
          ['ohp', 3, '5-6', 150, 2],
          ['chin-up', 3, '6-8', 120, 2],
          ['face-pull', 3, '12-15', 60, 1],
        ],
      },
      {
        name: 'Lower A — Heavy',
        note: 'Squat is the session. Everything after it is there to keep the hamstrings and calves from becoming the limit.',
        rows: [
          ['squat', 5, '3-5', 180, 1],
          ['rdl', 4, '5-6', 150, 2],
          ['leg-press', 3, '8-10', 120, 2],
          ['calf-raise', 3, '10-12', 60, 1],
        ],
      },
      {
        name: 'Upper B — Volume',
        note: 'Same movements, one notch lighter and a couple of reps longer. This is the day that makes the heavy day possible.',
        rows: [
          ['ohp', 4, '5-6', 150, 2],
          ['close-grip-bench', 4, '6-8', 120, 2],
          ['t-bar-row', 4, '6-8', 120, 2],
          ['lat-pulldown', 3, '8-10', 90, 2],
          ['barbell-curl', 3, '8-10', 60, 1],
        ],
      },
      {
        name: 'Lower B — Volume',
        note: 'Deadlift leads here rather than on the heavy day, so it never lands 48 hours after a heavy squat.',
        rows: [
          ['deadlift', 4, '3-5', 180, 1],
          ['front-squat', 3, '5-6', 150, 2],
          ['leg-curl', 3, '8-10', 90, 1],
          ['bulgarian-split', 3, '8-10', 90, 2],
          ['hanging-leg-raise', 3, '10-15', 60, 1],
        ],
      },
    ],
  },

  /* ----------------------------- HYPERTROPHY ------------------------------ */
  'hypertrophy-2': {
    split: 'Full body A / B',
    why: 'Two sessions have to carry the whole weekly set count, so these are long — six exercises, five sets on the main press and pull. That puts chest and back at ten weekly sets, the bottom of the useful range rather than the middle of it. Two days a week works; it is simply the least room to work with.',
    days: [
      {
        name: 'Full Body A',
        note: 'Quads, chest, lats, side delts, biceps, hamstrings — one hard slot each.',
        rows: [
          ['squat', 4, '6-10', 150, 2],
          ['incline-db-press', 5, '8-12', 120, 1],
          ['lat-pulldown', 5, '8-12', 120, 1],
          ['lateral-raise', 3, '12-15', 60, 1],
          ['bicep-curl', 3, '10-15', 60, 1],
          ['leg-curl', 3, '10-15', 90, 1],
        ],
      },
      {
        name: 'Full Body B',
        note: 'Same map, different angles: hip hinge instead of knee, flat press instead of incline, row instead of pulldown.',
        rows: [
          ['rdl', 4, '8-10', 150, 2],
          ['db-bench', 5, '8-12', 120, 1],
          ['seated-row', 5, '8-12', 120, 1],
          ['db-shoulder-press', 3, '10-12', 90, 1],
          ['triceps-pushdown', 3, '10-15', 60, 1],
          ['leg-extension', 3, '12-15', 60, 0],
        ],
      },
    ],
  },
  'hypertrophy-3': {
    split: 'Full body A / B / C',
    why: 'Three full-body days put every muscle group on the table three times a week — more exposures than a push/pull/legs would give at the same frequency, with the same weekly set total. Compounds first, isolation last, sets taken close to failure.',
    days: [
      {
        name: 'Full Body A',
        note: 'Squat pattern, horizontal press, vertical pull, then side delts and abs.',
        rows: [
          ['squat', 4, '6-10', 150, 2],
          ['db-bench', 4, '8-12', 120, 1],
          ['lat-pulldown', 4, '8-12', 120, 1],
          ['lateral-raise', 3, '12-20', 60, 1],
          ['cable-crunch', 3, '12-15', 60, 1],
        ],
      },
      {
        name: 'Full Body B',
        note: 'Hinge, vertical press, horizontal pull. The chest fly adds a stretched-position set the press cannot.',
        rows: [
          ['rdl', 4, '8-10', 150, 2],
          ['ohp', 4, '8-12', 120, 1],
          ['chest-supported-row', 4, '8-12', 120, 1],
          ['chest-fly', 3, '12-15', 60, 1],
          ['hammer-curl', 3, '10-15', 60, 1],
        ],
      },
      {
        name: 'Full Body C',
        note: 'Machine-led quad work so the third leg session does not tax your lower back a third time.',
        rows: [
          ['leg-press', 4, '10-15', 120, 1],
          ['incline-db-press', 4, '8-12', 120, 1],
          ['chin-up', 3, '8-12', 120, 1],
          ['leg-curl', 3, '10-15', 90, 1],
          ['triceps-pushdown', 3, '10-15', 60, 1],
        ],
      },
    ],
  },
  'hypertrophy-4': {
    split: 'Upper / Lower ×2',
    why: 'The highest-volume option: each muscle group gets two sessions a week with a full session to spread across, which lands most groups in the 12–18 weekly set range without any single workout running past an hour. This is the structure to pick if size is the only goal.',
    days: [
      {
        name: 'Upper A',
        note: 'Incline-led. Six exercises, three of them isolation — upper body tolerates the volume that legs do not.',
        rows: [
          ['incline-db-press', 4, '8-12', 120, 1],
          ['chest-supported-row', 4, '8-12', 120, 1],
          ['db-shoulder-press', 3, '10-12', 90, 1],
          ['lat-pulldown', 3, '10-12', 90, 1],
          ['lateral-raise', 3, '12-20', 60, 0],
          ['barbell-curl', 3, '10-12', 60, 1],
        ],
      },
      {
        name: 'Lower A',
        note: 'Quad-biased. Leg curls come second, while you can still give them real effort.',
        rows: [
          ['squat', 4, '6-10', 150, 2],
          ['leg-curl', 4, '10-15', 90, 1],
          ['leg-press', 3, '10-15', 120, 1],
          ['calf-raise', 4, '10-15', 60, 0],
          ['cable-crunch', 3, '12-15', 60, 1],
        ],
      },
      {
        name: 'Upper B',
        note: 'Flat-press led, with the rear delts and side delts getting their own slots — the two areas almost everyone under-trains.',
        rows: [
          ['bench-press', 4, '6-10', 150, 2],
          ['seated-row', 4, '8-12', 120, 1],
          ['pec-deck', 3, '12-15', 60, 1],
          ['face-pull', 3, '15-20', 60, 0],
          ['cable-lateral-raise', 3, '12-20', 60, 0],
          ['triceps-pushdown', 3, '10-15', 60, 1],
        ],
      },
      {
        name: 'Lower B',
        note: 'Hamstring-biased to balance Lower A, and hip thrusts for the glutes that squats alone under-load.',
        rows: [
          ['rdl', 4, '8-12', 150, 2],
          ['hack-squat', 4, '10-12', 120, 1],
          ['leg-extension', 3, '12-15', 60, 0],
          ['hip-thrust', 3, '8-12', 90, 1],
          ['seated-calf-raise', 4, '12-15', 60, 0],
        ],
      },
    ],
  },

  /* -------------------------------- MIXED --------------------------------- */
  'mixed-2': {
    split: 'Full body A / B',
    why: 'One heavy compound at 4–6 reps opens each session while you are fresh, then everything after it runs in the 8–15 range. You get the strength practice and the volume, at the cost of specialising in neither.',
    days: [
      {
        name: 'Full Body A',
        note: 'Squat heavy, then press and pull for size.',
        rows: [
          ['squat', 4, '4-6', 180, 2],
          ['incline-db-press', 3, '8-12', 90, 1],
          ['barbell-row', 4, '6-8', 120, 2],
          ['lateral-raise', 3, '12-15', 60, 1],
          ['leg-curl', 3, '10-15', 90, 1],
        ],
      },
      {
        name: 'Full Body B',
        note: 'Deadlift heavy but capped at three sets, then bench as the second strength slot.',
        rows: [
          ['deadlift', 3, '4-6', 180, 2],
          ['bench-press', 4, '5-6', 150, 2],
          ['lat-pulldown', 3, '8-12', 90, 1],
          ['db-shoulder-press', 3, '8-12', 90, 1],
          ['bicep-curl', 3, '10-15', 60, 1],
        ],
      },
    ],
  },
  'mixed-3': {
    split: 'Full body A / B / C',
    why: 'Three heavy slots a week — squat, deadlift, and a press — each followed by two or three hypertrophy exercises. Enough heavy exposure to keep the main lifts moving, enough volume that you are not just getting stronger at nothing visible.',
    days: [
      {
        name: 'Full Body A',
        note: 'Squat and bench both heavy — the one day a week that looks like a strength session.',
        rows: [
          ['squat', 4, '4-6', 180, 2],
          ['bench-press', 4, '5-6', 150, 2],
          ['seated-row', 3, '8-12', 90, 1],
          ['lateral-raise', 3, '12-15', 60, 1],
        ],
      },
      {
        name: 'Full Body B',
        note: 'Deadlift and overhead press. Short session by design; the pulls are heavy enough to justify it.',
        rows: [
          ['deadlift', 3, '4-6', 180, 2],
          ['ohp', 4, '5-6', 150, 2],
          ['lat-pulldown', 3, '8-12', 90, 1],
          ['triceps-pushdown', 3, '10-15', 60, 1],
        ],
      },
      {
        name: 'Full Body C',
        note: 'Front squat as the heavy slot — different enough from day A to recover between the two.',
        rows: [
          ['front-squat', 4, '5-6', 150, 2],
          ['incline-db-press', 4, '8-10', 120, 1],
          ['chin-up', 3, '8-10', 90, 1],
          ['leg-curl', 3, '10-15', 90, 1],
          ['hammer-curl', 3, '10-15', 60, 1],
        ],
      },
    ],
  },
  'mixed-4': {
    split: 'Upper / Lower ×2',
    why: 'The most complete option at this frequency: a heavy compound opens all four sessions, and the extra day buys enough room for real accessory volume. If you can train four times a week and cannot choose a goal, take this.',
    days: [
      {
        name: 'Upper A',
        note: 'Bench and row heavy, then three accessory slots.',
        rows: [
          ['bench-press', 4, '4-6', 180, 2],
          ['barbell-row', 4, '5-6', 150, 2],
          ['db-shoulder-press', 3, '8-12', 90, 1],
          ['lat-pulldown', 3, '8-12', 90, 1],
          ['triceps-pushdown', 3, '10-15', 60, 1],
        ],
      },
      {
        name: 'Lower A',
        note: 'Squat heavy, hinge moderate, then machine work while the systemic fatigue is already spent.',
        rows: [
          ['squat', 4, '4-6', 180, 2],
          ['rdl', 3, '6-8', 120, 2],
          ['leg-press', 3, '10-12', 120, 1],
          ['calf-raise', 3, '10-15', 60, 0],
        ],
      },
      {
        name: 'Upper B',
        note: 'Overhead press takes the heavy slot this time, chin-ups the heavy pull.',
        rows: [
          ['ohp', 4, '4-6', 180, 2],
          ['chin-up', 4, '6-8', 120, 2],
          ['incline-db-press', 3, '8-12', 90, 1],
          ['chest-supported-row', 3, '8-12', 90, 1],
          ['barbell-curl', 3, '10-12', 60, 1],
        ],
      },
      {
        name: 'Lower B',
        note: 'Deadlift at three sets only, then unilateral and isolation work that does not add to the spinal load.',
        rows: [
          ['deadlift', 3, '3-5', 180, 2],
          ['bulgarian-split', 3, '8-10', 90, 2],
          ['leg-curl', 3, '10-15', 90, 1],
          ['leg-extension', 3, '12-15', 60, 0],
          ['hanging-leg-raise', 3, '10-15', 60, 1],
        ],
      },
    ],
  },
}

export function getProgram(goal: Goal, days: Days): Program {
  return P[`${goal}-${days}`]
}

/** Program-built templates carry this id prefix so re-applying replaces them
    and never touches anything the person wrote themselves. */
export const PROGRAM_PREFIX = 'tpl-prog-'

export function programTemplates(goal: Goal, days: Days): Template[] {
  const prog = getProgram(goal, days)
  return prog.days.map((d, i) => ({
    id: `${PROGRAM_PREFIX}${goal}-${days}-${i}`,
    name: d.name,
    note: d.note,
    items: d.rows.map(
      ([exerciseId, sets, reps, rest, rir]): TemplateItem => ({ exerciseId, sets, reps, rest, rir }),
    ),
  }))
}

/** Weekly hard sets per muscle group — shown so the volume claim is checkable. */
export function weeklySets(goal: Goal, days: Days, muscleOf: (id: string) => string): [string, number][] {
  const acc = new Map<string, number>()
  for (const d of getProgram(goal, days).days) {
    for (const [id, sets] of d.rows) {
      const m = muscleOf(id)
      if (m) acc.set(m, (acc.get(m) ?? 0) + sets)
    }
  }
  return [...acc.entries()].sort((a, b) => b[1] - a[1])
}
