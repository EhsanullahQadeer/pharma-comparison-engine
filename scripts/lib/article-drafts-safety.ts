import { SOURCES } from "../../src/lib/article-sources";
import { sideEffectsArticles } from "../../src/lib/side-effects-articles";
import { reviewerNote } from "./article-draft-sources";
import type { ArticleDraft } from "./article-draft-sources";

// Drafts for the Side effects and Tools pages. DRAFT status only (see article-drafts-guides.ts). The
// side-effects articles are the source-checked content the public pages already show pending review.
export const safetyDrafts: ArticleDraft[] = [
  ...sideEffectsArticles,
  {
    slug: "tools/medicine-comparison",
    title: "Sildenafil and tadalafil compared",
    summary: "A general, side-by-side comparison of the two most common ED medicines. It's not a recommendation. Your prescriber decides what's suitable for you.",
    keyFacts: [
      "Both are PDE5 inhibitors and need sexual arousal to work.",
      "Tadalafil's effect can last up to 36 hours.",
      "Tadalafil can also be taken as a daily lower-dose tablet.",
      "Neither is usually prescribed with nitrates.",
    ],
    body: `> General information only, not a recommendation. Your prescriber chooses the medicine and strength.

| | Sildenafil | Tadalafil |
| --- | --- | --- |
| Brand example | Viagra | Cialis |
| How it's taken | About an hour before sex, when needed | Before sex when needed, or a daily tablet |
| How long it can last | Ask your prescriber (see leaflet) | Up to 36 hours |
| Maximum | Not more than 1 tablet a day | As prescribed |
| Common side effects | Headache, dizziness, stuffy nose, upset stomach, temporary vision changes | Indigestion, muscle aches, back pain, headache, stuffy nose |
| Grapefruit | Avoid | Avoid |
| Nitrates | Not usually prescribed together | Not usually prescribed together |

${reviewerNote("Fill the sildenafil duration cell and any onset figures from the SPC only; they were deliberately left out of this draft.")}

See [sildenafil explained](/ed/treatments/sildenafil) and [tadalafil explained](/ed/treatments/tadalafil).`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "tools/onset-and-duration",
    title: "Onset and duration reference",
    summary: "General information on when ED medicines are usually taken and how long their effect can last. Always follow your own prescriber's instructions.",
    keyFacts: [
      "Sildenafil is usually taken about an hour before sex.",
      "Tadalafil's effect can last up to 36 hours.",
      "How quickly a medicine works varies from person to person.",
    ],
    body: `> General reference only. Follow the instructions from your prescriber and the patient information leaflet.

| Medicine | Usually taken | Effect can last |
| --- | --- | --- |
| Sildenafil | About an hour before sex | See leaflet |
| Tadalafil | Before sex, or daily | Up to 36 hours |

${reviewerNote("Complete onset/duration for sildenafil (and add vardenafil/avanafil if wanted) from the SPCs. Add a note on the effect of heavy meals on sildenafil if the SPC supports it.")}

How quickly a medicine works can vary. If it doesn't seem to work, don't take more. Speak to your prescriber.`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "tools/strengths",
    title: "Medicine strengths reference",
    summary: "The strengths sildenafil and tadalafil tablets come in. This explains what's available, not what you should take. Your prescriber decides the strength.",
    keyFacts: [
      "Strength is measured in milligrams (mg).",
      "A higher strength isn't automatically better.",
      "Your prescriber chooses the strength for you.",
      "Never take more than prescribed.",
    ],
    body: `> This explains available strengths only. It isn't dosing advice.

| Medicine | Tablet strengths commonly available in the UK |
| --- | --- |
| Sildenafil | 25mg, 50mg, 100mg |
| Tadalafil | 2.5mg, 5mg (often daily use), 10mg, 20mg |

${reviewerNote("Confirm the strength list against current UK marketing authorisations/SPCs.")}

## Why strengths differ

Prescribers choose a strength based on your health, other medicines and how you respond. A higher strength can mean more side effects. Never change your dose without speaking to your prescriber.

Comparing prices? Our [pack-size comparison](/ed/prices/pack-sizes) compares the same strength across pack sizes.`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "tools/iief-5",
    title: "The IIEF-5 questionnaire explained",
    summary: "What the IIEF-5 is, why prescribers use it and what its score means. The questions themselves aren't reproduced here.",
    keyFacts: [
      "The IIEF-5 is a short, validated questionnaire about erectile function.",
      "It has 5 questions about the past 6 months.",
      "Clinicians use it alongside a full assessment, not on its own.",
      "It can't diagnose you or choose a treatment.",
    ],
    body: `## What it is

The IIEF-5 (International Index of Erectile Function, 5-item version) is a short questionnaire developed from a longer research questionnaire. It asks about erections and sexual satisfaction over the previous 6 months.

## How it's used

Some clinicians use it during an assessment, or to track how treatment is going over time. The total score gives a rough guide to how severe erection problems are, but it's only one part of an assessment. It can't diagnose the cause or decide on treatment.

${reviewerNote("Reproduction rights for the questionnaire items and scoring bands are unresolved (milestone 06). Do NOT add the questions or score bands until rights are confirmed.")}

## If you're asked to complete it

Answer honestly for the time period asked about. If your prescriber uses it, ask them to explain what your answers mean for you.`,
    sources: [SOURCES.iief5, SOURCES.cks],
  },
  {
    slug: "tools/heart-health-checklist",
    title: "Heart-health checklist for your consultation",
    summary: "Questions to think about before an ED consultation, so you can give your prescriber accurate information. This isn't a medical clearance.",
    keyFacts: [
      "This helps you prepare. It doesn't tell you whether treatment is safe.",
      "Your prescriber makes the decision.",
      "Take a full list of your medicines.",
    ],
    body: `> A preparation list, not a medical clearance. Only your prescriber can decide whether treatment is safe for you.

## Before your consultation, note down

- [ ] Any heart condition, heart attack or stroke, and when it happened
- [ ] Chest pain, especially during exercise or sex
- [ ] Your most recent blood pressure reading, if you know it
- [ ] Whether you get breathless or dizzy with mild exertion
- [ ] Diabetes, high cholesterol, or kidney or liver problems
- [ ] Every medicine you take, especially anything for chest pain (nitrates)
- [ ] Any eye condition affecting the optic nerve
- [ ] Any ED medicine you've tried before, and how it went

## Then

Give your prescriber accurate answers. If they have concerns, they may suggest a GP check first. See [heart health before treatment](/ed/side-effects/cardiovascular-safety).`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil, SOURCES.cks],
  },
];
