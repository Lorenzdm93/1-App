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
  {
    name: 'Rhodiola', chem: 'Rhodiola rosea (3% rosavins)', amount: '300', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Morning, empty stomach — can be stimulating',
    info: 'Adaptogen used for fatigue and stress resilience; 200–400 mg/day. Often cycled 6–8 weeks on, 2 off.',
    caution: 'Can disturb sleep if taken late; caution with bipolar disorder or stimulant medication.',
  },
  {
    name: 'L-Theanine', chem: 'L-theanine', amount: '200', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Pairs with caffeine for calm focus',
    info: '100–200 mg smooths caffeine\'s edge; 200–400 mg in the evening is used for relaxation. No cycling needed.',
  },
  {
    name: 'Caffeine', chem: 'Caffeine anhydrous', amount: '100', unit: 'mg', form: 'tablet', slot: 'morning',
    note: 'None after ~14:00 protects sleep',
    info: '3–6 mg/kg pre-training is the performance dose; half-life ~5–6 h, so timing matters more than amount.',
    caution: 'Tolerance builds — periodic 1–2 week resets restore sensitivity. Caution with anxiety, hypertension, pregnancy.',
  },
  {
    name: 'B-Complex', chem: 'B1–B12 complex', amount: '1', unit: 'capsule', form: 'capsule', slot: 'morning',
    note: 'Morning — B vitamins can be mildly energising',
    info: 'Covers the water-soluble Bs; most useful with low intake, veganism, or high stress. Bright-yellow urine is riboflavin, harmless.',
  },
  {
    name: 'Selenium', chem: 'Selenomethionine', amount: '100', unit: 'µg', form: 'capsule', slot: 'morning',
    note: 'A little is essential; a lot is toxic',
    info: '55–100 µg/day supports thyroid and antioxidant enzymes. One Brazil nut ≈ a full dose.',
    caution: 'Stay under 400 µg/day from all sources.',
  },
  {
    name: 'Iodine', chem: 'Potassium iodide', amount: '150', unit: 'µg', form: 'tablet', slot: 'morning',
    note: 'Check your salt first — it may be iodised',
    info: '150 µg/day is the adult reference intake; thyroid hormones are built from it.',
    caution: 'Both deficiency and excess disturb the thyroid; be careful with Hashimoto\'s.',
  },
  {
    name: 'Collagen', chem: 'Hydrolysed collagen peptides', amount: '10', unit: 'g', form: 'powder', slot: 'morning',
    note: 'With vitamin C, ~1 h before training for joints',
    info: '10–15 g/day is the studied range for skin and connective tissue; effects take 8–12 weeks.',
  },
  {
    name: 'Glycine', chem: 'Glycine', amount: '3', unit: 'g', form: 'powder', slot: 'night',
    note: 'Sweet taste — stir into evening tea',
    info: '3 g before bed modestly improves sleep quality; also the limiting amino acid for collagen synthesis.',
  },
  {
    name: 'Taurine', chem: 'Taurine', amount: '2', unit: 'g', form: 'powder', slot: 'morning',
    note: 'Cheap, safe, underrated',
    info: '1–3 g/day; studied for exercise capacity, blood pressure and glucose handling.',
  },
  {
    name: 'Beta-Alanine', chem: 'β-alanine', amount: '3.2', unit: 'g', form: 'powder', slot: 'morning',
    note: 'The tingle is harmless — split doses to avoid it',
    info: '3.2–6.4 g/day, timing irrelevant — it loads like creatine over ~4 weeks. Helps 1–4 min efforts.',
  },
  {
    name: 'Citrulline Malate', chem: 'L-citrulline DL-malate 2:1', amount: '8', unit: 'g', form: 'powder', slot: 'morning',
    note: '30–40 min pre-training',
    info: '6–8 g pre-workout for pumps and endurance; outperforms arginine at raising arginine.',
  },
  {
    name: 'Whey Protein', chem: 'Whey concentrate/isolate', amount: '30', unit: 'g', form: 'powder', slot: 'morning',
    note: 'A food, not a drug — count it as protein',
    info: '20–40 g per serving toward 1.6–2.2 g/kg/day total protein; isolate if lactose bothers you.',
  },
  {
    name: 'NAC', chem: 'N-acetyl-L-cysteine', amount: '600', unit: 'mg', form: 'capsule', slot: 'evening',
    note: 'Smells like sulphur — that\'s normal',
    info: '600–1200 mg/day; glutathione precursor studied for respiratory health and compulsive habits.',
    caution: 'Avoid right around intense training (blunts some adaptation signals); caution with blood thinners.',
  },
  {
    name: 'CoQ10', chem: 'Ubiquinone / ubiquinol', amount: '100', unit: 'mg', form: 'softgel', slot: 'morning',
    note: 'With a fatty meal — fat-soluble',
    info: '100–200 mg/day; particularly relevant on statins, which lower CoQ10.',
  },
  {
    name: 'Curcumin', chem: 'Curcuma longa + piperine', amount: '500', unit: 'mg', form: 'capsule', slot: 'evening',
    note: 'Needs piperine or a lipid form to absorb',
    info: '500–1000 mg/day of an enhanced-absorption form for joints and general inflammation.',
    caution: 'Piperine alters drug metabolism; caution with anticoagulants and gallstones.',
  },
  {
    name: 'Berberine', chem: 'Berberine HCl', amount: '500', unit: 'mg', form: 'capsule', slot: 'evening',
    note: 'With meals, 2–3× daily — cycle 8–12 weeks',
    info: '900–1500 mg/day split with meals; studied for blood glucose and lipids.',
    caution: 'Real drug interactions (metformin-like); talk to a doctor if on diabetes medication. Not in pregnancy.',
  },
  {
    name: 'Electrolytes', chem: 'Na · K · Mg blend', amount: '1', unit: 'serving', form: 'powder', slot: 'morning',
    note: 'Essential on fasts and heavy sweat days',
    info: 'Sodium 500–1000 mg per litre of sweat replaced; potassium and magnesium round it out.',
  },
  {
    name: 'Probiotics', chem: 'Multi-strain', amount: '10', unit: 'B CFU', form: 'capsule', slot: 'morning',
    note: 'Strain matters more than count',
    info: 'Evidence is strain-specific (e.g. LGG, BB-12). Take consistently for 4+ weeks to judge.',
  },
  {
    name: 'Psyllium', chem: 'Psyllium husk', amount: '5', unit: 'g', form: 'powder', slot: 'evening',
    note: 'With a FULL glass of water, away from meds',
    info: '5–10 g/day of soluble fibre for regularity and LDL; increase slowly.',
    caution: 'Never dry — it swells. Separate from medication by 2 h.',
  },
  {
    name: 'Resveratrol', chem: 'trans-Resveratrol', amount: '250', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'With fat \u2014 absorbs poorly alone',
    info: 'Polyphenol from grape skin studied for longevity pathways.',
  },
  {
    name: 'Lion\u2019s Mane', chem: 'Hericium erinaceus', amount: '1000', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Consistency over weeks matters',
    info: 'Culinary mushroom commonly taken for focus and nerve-growth-factor interest.',
  },
  {
    name: 'Bacopa', chem: 'Bacopa monnieri, 50% bacosides', amount: '300', unit: 'mg', form: 'capsule', slot: 'evening',
    note: 'With food \u2014 can unsettle an empty stomach',
    info: 'Ayurvedic herb with the slowest onset in the nootropic aisle; studied over 8\u201312 weeks.',
  },
  {
    name: 'Alpha-GPC', chem: 'L-Alpha glycerylphosphorylcholine', amount: '300', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Often paired with caffeine pre-training',
    info: 'Choline donor popular before workouts and focus blocks.',
  },
  {
    name: 'Ginkgo', chem: 'Ginkgo biloba, 24% flavone glycosides', amount: '120', unit: 'mg', form: 'tablet', slot: 'morning',
    note: 'Morning \u2014 mildly stimulating for some',
    info: 'One of the oldest studied botanicals for circulation and memory.',
    caution: 'Interacts with blood thinners.',
  },
  {
    name: 'Vitamin E', chem: 'd-Alpha tocopherol', amount: '134', unit: 'mg', form: 'softgel', slot: 'morning',
    note: 'With a meal that has fat',
    info: 'Fat-soluble antioxidant; the natural d- form absorbs better than dl-.',
    caution: 'High doses interact with blood thinners.',
  },
  {
    name: 'Vitamin A', chem: 'Retinyl palmitate', amount: '750', unit: 'mcg RAE', form: 'softgel', slot: 'morning',
    note: 'With a meal that has fat',
    info: 'Preformed vitamin A \u2014 the active form, no beta-carotene conversion step.',
    caution: 'Accumulates; avoid doubling with multivitamins.',
  },
  {
    name: 'Calcium', chem: 'Calcium citrate', amount: '500', unit: 'mg', form: 'tablet', slot: 'evening',
    note: 'Away from iron and zinc doses',
    info: 'Citrate form absorbs without stomach acid \u2014 friendlier than carbonate.',
    caution: 'Competes with iron and zinc for absorption.',
  },
  {
    name: 'Potassium', chem: 'Potassium citrate', amount: '99', unit: 'mg', form: 'capsule', slot: 'midday',
    note: 'With food and water',
    info: 'The electrolyte most diets under-deliver; capsules are capped low by design.',
  },
  {
    name: 'L-Glutamine', chem: 'L-Glutamine', amount: '5', unit: 'g', form: 'powder', slot: 'night',
    note: 'Timing flexible',
    info: 'Conditionally essential amino acid popular in heavy training blocks.',
  },
  {
    name: 'L-Carnitine', chem: 'Acetyl-L-carnitine', amount: '1000', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Empty stomach or pre-training',
    info: 'Shuttle molecule for fatty-acid oxidation; the acetyl form crosses into the brain.',
  },
  {
    name: 'Boron', chem: 'Boron glycinate', amount: '3', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'With food',
    info: 'Trace mineral with interest around hormone binding and joints.',
  },
  {
    name: '5-HTP', chem: '5-Hydroxytryptophan', amount: '100', unit: 'mg', form: 'capsule', slot: 'night',
    note: 'Evening only \u2014 precursor to serotonin',
    info: 'Direct serotonin precursor from Griffonia seed.',
    caution: 'Never combine with SSRIs or MAOIs.',
  },
  {
    name: 'Alpha-Lipoic Acid', chem: 'R-ALA', amount: '300', unit: 'mg', form: 'capsule', slot: 'morning',
    note: 'Empty stomach, away from minerals',
    info: 'Both fat- and water-soluble antioxidant; chelates metals, so separate from mineral doses.',
  },
]

export function libraryByName(name: string): LibraryEntry | undefined {
  const n = name.trim().toLowerCase()
  return LIBRARY.find((e) => e.name.toLowerCase() === n)
}
