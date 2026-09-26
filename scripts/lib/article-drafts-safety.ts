import { SOURCES, reviewerNote } from "./article-draft-sources";
import type { ArticleDraft } from "./article-draft-sources";

// First drafts for the Side effects and Tools pages. DRAFT status only (see article-drafts-guides.ts).
export const safetyDrafts: ArticleDraft[] = [
  {
    slug: "side-effects/urgent-warning-signs",
    title: "Urgent warning signs with ED medicines",
    summary: "Rare but serious symptoms that need emergency help while taking ED medicines, and where to go.",
    keyFacts: [
      "An erection lasting more than 3 to 4 hours: call 999 or go to A&E.",
      "Chest pain that feels tight or squeezing: call 999.",
      "Swelling of the lips, mouth or throat, or trouble breathing: call 999.",
      "Sudden problems with your sight or hearing: get urgent medical help.",
    ],
    body: `> This page lists warning signs, not a full list of side effects. If you're unsure, call NHS 111. In an emergency, call 999.

## Call 999 or go to A&E

- **An erection that lasts more than 3 to 4 hours** (priapism). It can permanently damage the penis without quick treatment.
- **Chest pain** that feels tight or like squeezing, especially if it spreads to your arms, neck or jaw, or comes with shortness of breath or sweating.
- **A serious allergic reaction**, such as swelling of the lips, mouth, throat or tongue, or difficulty breathing.
- **A seizure.**

## Get urgent medical help

- **Sudden changes to your sight**, such as loss of vision in one or both eyes.
- **Sudden changes to your hearing.**
- **Heart palpitations.**

${reviewerNote("Confirm the vision/hearing urgency wording against the SPCs (NAION and sudden hearing loss sections) and the NHS pages before approval.")}

For side effects that aren't urgent, see [common side effects](/ed/side-effects/common) or [contact your prescriber](/ed/side-effects/contact-your-prescriber).`,
    sources: [SOURCES.nhsPriapism, SOURCES.nhsHeartAttack, SOURCES.nhsSildenafil, SOURCES.nhsTadalafil, SOURCES.nhs111],
  },
  {
    slug: "side-effects/common",
    title: "Common side effects of ED medicines",
    summary: "The side effects people most often notice with sildenafil and tadalafil. They're usually mild and short-lived.",
    keyFacts: [
      "Headache, flushing, a stuffy nose and indigestion are common.",
      "Tadalafil can also cause back pain and muscle aches.",
      "Sildenafil can cause temporary changes in vision, such as blurring.",
      "Tell your prescriber if side effects bother you or don't go away.",
    ],
    body: `## Sildenafil

Common side effects include:

- headaches
- dizziness
- a stuffy nose
- an upset stomach
- temporary changes in vision, such as blurred vision

## Tadalafil

Common side effects include:

- indigestion
- muscle aches and back pain
- headache
- a stuffy nose

${reviewerNote("Flushing is listed as common in the SPCs; confirm and add if appropriate.")}

## What to do

Side effects are usually mild. Tell your prescriber if they bother you or don't go away. Don't take an extra dose to try to improve how well a medicine works.

If you notice anything on our [urgent warning signs](/ed/side-effects/urgent-warning-signs) list, get help straight away.`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "side-effects/cardiovascular-safety",
    title: "Heart health before starting ED treatment",
    summary: "Why your prescriber asks about your heart, blood pressure and other medicines before recommending an ED medicine.",
    keyFacts: [
      "Sex is physical activity, which puts some strain on the heart.",
      "Tell your prescriber about any heart condition, stroke or blood pressure problems.",
      "ED medicines are not usually prescribed with nitrates.",
      "A GP health check can find problems ED may be pointing to.",
    ],
    body: `## Why it matters

Sexual activity is physical activity. ED medicines also affect blood vessels and can lower blood pressure. That's why a prescriber needs to know about your heart health before recommending one.

## What to tell your prescriber

- any heart condition, heart attack or stroke, and when it happened
- chest pain, especially during exercise or sex
- high or low blood pressure
- every medicine you take, especially nitrates for chest pain

${reviewerNote("Add the specific contraindication list only from the SPCs (e.g. recent MI/stroke, severe hepatic impairment, hypotension).")}

## Nitrates

ED medicines like sildenafil and tadalafil are not usually prescribed together with nitrates, which are often used for chest pain. See [medicine interactions](/ed/side-effects/interactions).

## A health check is worth it

Erection problems can share causes with heart disease. See [ED and heart health](/ed/guides/ed-and-heart-health).`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil, SOURCES.cks],
  },
  {
    slug: "side-effects/interactions",
    title: "Medicine and substance interactions",
    summary: "Medicines, drinks and substances that can interact with ED medicines. Always give your prescriber a full list of what you take.",
    keyFacts: [
      "ED medicines are not usually prescribed with nitrates.",
      "Sildenafil is not usually prescribed with riociguat.",
      "Avoid grapefruit and grapefruit juice.",
      "Alcohol can make dizziness and low blood pressure more likely.",
    ],
    body: `> This is general information, not an interaction checker. Your prescriber or pharmacist will check your own medicines.

## Nitrates

Nitrates, often used for chest pain, are not usually prescribed together with sildenafil or tadalafil.

${reviewerNote("Add alkyl nitrites ('poppers') and alpha-blockers here only with a reviewed source (SPC interaction sections).")}

## Riociguat

Riociguat, a medicine for a type of high blood pressure in the lungs, is not usually prescribed together with sildenafil.

## Grapefruit

Don't eat grapefruit or drink grapefruit juice while taking sildenafil or tadalafil, as it can make side effects more likely.

## Alcohol

With tadalafil, alcohol can make dizziness and low blood pressure more likely. With sildenafil, drinking too much alcohol can make it harder to get an erection.

## Other medicines

Tell your prescriber about every medicine you take, including ones bought without a prescription, herbal remedies and recreational drugs.`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "side-effects/vision-and-hearing",
    title: "Vision and hearing changes",
    summary: "Temporary vision changes are a known side effect of sildenafil. Sudden loss of sight or hearing is different and needs urgent help.",
    keyFacts: [
      "Temporary blurred vision is a common side effect of sildenafil.",
      "Sudden loss of vision or hearing needs urgent medical help.",
      "Tell your prescriber if you've had an eye condition affecting the optic nerve.",
    ],
    body: `## Temporary changes

Sildenafil can cause temporary changes in vision, such as blurred vision. These usually pass. Avoid driving if your vision is affected. ${reviewerNote("Confirm the driving advice and cyanopsia (blue tinge) wording against the SPC/PIL.")}

## Sudden changes need urgent help

Get urgent medical help if you have a sudden loss of vision in one or both eyes, or sudden problems with your hearing.

## Before you start

Tell your prescriber if you've ever had vision loss caused by reduced blood flow to the optic nerve, as this affects whether sildenafil is suitable.`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "side-effects/contact-your-prescriber",
    title: "Contacting your prescriber",
    summary: "When to contact the prescriber who supplied your ED medicine, and how to prepare so you get a useful answer.",
    keyFacts: [
      "Contact your prescriber about side effects that bother you or don't go away.",
      "Contact them before starting any new medicine.",
      "Have your medicine name, strength and other medicines ready.",
      "For urgent symptoms, don't wait. Call 999 or NHS 111.",
    ],
    body: `## When to get in touch

- side effects that bother you or don't go away
- a medicine that doesn't seem to work
- before starting any new medicine, including ones bought without a prescription
- changes to your health, such as a new heart or blood pressure problem

## What to have ready

- the medicine's name and strength
- when and how you've been taking it
- what you've noticed and when it started
- every other medicine you take

## Online pharmacies

If you bought treatment from an online pharmacy, it should give you a way to contact its prescriber or pharmacist. Check its website or order confirmation.

## Urgent symptoms

Don't wait for a reply if you have any [urgent warning signs](/ed/side-effects/urgent-warning-signs). Call 999, or NHS 111 for urgent advice.`,
    sources: [SOURCES.nhs111, SOURCES.nhsSildenafil],
  },
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
