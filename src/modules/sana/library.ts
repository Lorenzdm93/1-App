/**
 * The reference shelf — common compounds with sensible defaults and the
 * one-line note the prototype shows in italics. Informational only; the
 * "what it is" text describes usage people commonly report, not advice.
 */
import type { Form, Slot } from './model'

export interface LibraryEntry {
  name: string
  chem: string
  amount: string
  unit: string
  form: Form
  slot: Slot
  note: string
  info: string
  caution?: string
}

export const LIBRARY: readonly LibraryEntry[] = [
  { name: 'Vitamin D3', chem: 'Cholecalciferol', amount: '2000', unit: 'IU', form: 'softgel', slot: 'morning', note: 'With a meal that has fat', info: 'The sunshine vitamin — fat-soluble, so it absorbs best alongside dietary fat. Commonly taken through darker months at northern latitudes.', caution: 'Fat-soluble vitamins accumulate; more is not better.' },
  { name: 'Vitamin C', chem: 'Ascorbic acid', amount: '500', unit: 'mg', form: 'tablet', slot: 'morning', note: 'Water-soluble — excess is simply excreted', info: 'Classic antioxidant support. Plays a role in collagen synthesis and iron absorption from plant foods.' },
  { name: 'Omega-3', chem: 'EPA · DHA', amount: '2', unit: 'g', form: 'softgel', slot: 'evening', note: 'With food; keep the bottle cool and dark', info: 'Fish-oil fatty acids the body cannot make efficiently. Quality varies widely — third-party-tested brands avoid oxidised oil.' },
  { name: 'Magnesium Glycinate', chem: 'Mg bisglycinate', amount: '300', unit: 'mg', form: 'capsule', slot: 'night', note: 'The gentle form — well absorbed, easy on the gut', info: 'The glycinate salt is the evening favourite: better tolerated than oxide and citrate at equal elemental doses.' },
  { name: 'Creatine Monohydrate', chem: 'Creatine', amount: '5', unit: 'g', form: 'powder', slot: 'morning', note: "Timing doesn't matter — consistency does", info: 'The most-studied sports supplement there is. Saturation is what counts, so the daily habit beats any clever timing.', caution: 'Drink normally; the water-retention myth is mostly just that.' },
  { name: 'Zinc', chem: 'Zn picolinate', amount: '15', unit: 'mg', form: 'capsule', slot: 'evening', note: 'Not on an empty stomach — it can nauseate', info: 'Trace mineral involved in immune function and recovery. Long-term high doses interfere with copper.' },
  { name: 'Vitamin B12', chem: 'Methylcobalamin', amount: '1000', unit: 'µg', form: 'tablet', slot: 'morning', note: 'Especially relevant on plant-based diets', info: 'B12 comes almost entirely from animal foods; supplementation is standard practice for vegetarians and vegans.' },
  { name: 'Vitamin K2', chem: 'Menaquinone-7', amount: '100', unit: 'µg', form: 'softgel', slot: 'morning', note: 'Pairs naturally with D3 — same meal', info: 'Works alongside vitamin D in calcium handling. Often stacked with D3 in one softgel.' },
  { name: 'Melatonin', chem: 'N-acetyl-5-MT', amount: '0.5', unit: 'mg', form: 'tablet', slot: 'night', note: 'Less is more — 30–60 min before bed', info: 'A circadian signal, not a sedative. Low doses shift timing; high doses mostly add grogginess.', caution: 'Regulated as a medicine in parts of the EU — check your local rules.' },
  { name: 'Ashwagandha', chem: 'Withania somnifera', amount: '300', unit: 'mg', form: 'capsule', slot: 'evening', note: 'Root extract, KSM-66 style', info: 'Adaptogen with a growing evidence base around perceived stress. Effects build over weeks, not days.', caution: 'Cycling is commonly advised; not for pregnancy.' },
  { name: 'Iron', chem: 'Fe bisglycinate', amount: '18', unit: 'mg', form: 'capsule', slot: 'morning', note: 'Away from coffee and tea; vitamin C helps', info: 'Only worth taking against a demonstrated need — ferritin is the number to know.', caution: 'Do not supplement iron blind; excess is genuinely harmful. Test first.' },
  { name: 'Probiotic', chem: 'Multi-strain', amount: '1', unit: 'cap', form: 'capsule', slot: 'morning', note: 'Refrigerate if the label says so', info: 'Strain-specific by nature — benefits shown for one strain do not transfer to another.' },
]

export function libraryByName(name: string): LibraryEntry | undefined {
  const n = name.trim().toLowerCase()
  return LIBRARY.find((e) => e.name.toLowerCase() === n)
}
