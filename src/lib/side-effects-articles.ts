import { SOURCES } from "@/lib/article-sources";
import type { ArticleContent } from "@/types/article";

// Side-effects library content. Every statement below was checked on SIDE_EFFECTS_CHECKED_ON against
// the source it cites (NHS medicine pages and the Viagra/Cialis SmPCs on emc); cite(n) points at the
// nth entry of that article's `sources`. The public page shows this until a clinically reviewed
// Article for the same slug is PUBLISHED, which then takes over. Also seeded as DRAFT articles
// (scripts/seed-article-drafts.ts) so staff can edit and send them for review.
export const SIDE_EFFECTS_CHECKED_ON = new Date("2026-09-26");

const cite = (...numbers: number[]) => numbers.map((n) => `[[${n}]](#source-${n})`).join("");

export const sideEffectsArticles: ArticleContent[] = [
  {
    slug: "side-effects/urgent-warning-signs",
    title: "Urgent warning signs with ED medicines",
    summary: "Rare but serious symptoms that need emergency help while taking sildenafil or tadalafil, and where to go.",
    keyFacts: [
      "An erection lasting more than 3 to 4 hours: call 999 or go to A&E.",
      "Chest pain that feels tight or like squeezing: call 999.",
      "A swollen throat or tongue, or difficulty breathing: call 999.",
      "Sudden loss of sight or hearing: stop the medicine and get medical help straight away.",
    ],
    body: `> This page lists warning signs, not every possible side effect. If you're unsure, call NHS 111. In an emergency, call 999.

## Call 999 or go to A&E

- **An erection that lasts more than 3 to 4 hours** (priapism). ${cite(1)} The Viagra product information also says to get immediate medical help for an erection lasting longer than 4 hours. ${cite(4)}
- **Chest pain** that feels tight or like squeezing, or that spreads to your arms, neck or jaw. It may come with shortness of breath or sweating. These can be signs of a heart attack. ${cite(6)} The NHS lists chest pain and heart attack among the serious side effects of both medicines. ${cite(2, 3)}
- **A serious allergic reaction (anaphylaxis)**, such as a swollen throat or tongue, a raised itchy rash, or difficulty breathing. ${cite(2, 3)}
- **A seizure (fit).** ${cite(2, 3)}

## Get medical help straight away

- **Sudden changes to your eyesight**, such as losing vision in one or both eyes. Stop taking the medicine. ${cite(3, 4, 5)}
- **A sudden drop in, or loss of, hearing.** Stop taking the medicine. ${cite(3, 5)}
- **Noticeable or irregular heartbeats** (palpitations). ${cite(2, 3)}
- **Fainting**, or difficulty breathing or shortness of breath. ${cite(2, 3)}

## Not sure if it's urgent?

Use NHS 111 online or call 111. ${cite(7)} For side effects that aren't urgent, see [common side effects](/ed/side-effects/common) or [contacting your prescriber](/ed/side-effects/contact-your-prescriber).`,
    sources: [SOURCES.nhsPriapism, SOURCES.nhsSildenafilSideEffects, SOURCES.nhsTadalafil, SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.nhsHeartAttack, SOURCES.nhs111],
  },
  {
    slug: "side-effects/common",
    title: "Common side effects of ED medicines",
    summary: "The side effects people most often notice with sildenafil and tadalafil, how common they are, and what to do.",
    keyFacts: [
      "Headache is the most common side effect of sildenafil (more than 1 in 10 people).",
      "Flushing, a stuffy nose, indigestion and dizziness are common with both medicines.",
      "Tadalafil can also cause back pain, muscle aches and pain in the arms or legs.",
      "Don't drive or use machinery if you feel dizzy or your vision is blurred.",
    ],
    body: `## Sildenafil (Viagra)

The NHS lists these common side effects: ${cite(1)}

- headache
- dizziness
- a blocked or stuffy nose
- stomach ache, diarrhoea or feeling sick (nausea)
- anxiety
- temporary changes in vision, such as blurred vision

## Tadalafil (Cialis)

The NHS lists these common side effects: ${cite(2)}

- indigestion
- muscle aches, and arm and leg pain
- back pain
- a blocked or stuffy nose
- a flushed face
- headache

## How common are they?

The official product information (SmPC) for each medicine groups side effects by how often they were reported:

| Side effect | Sildenafil ${cite(3)} | Tadalafil ${cite(4)} |
| --- | --- | --- |
| Headache | Very common (more than 1 in 10) | Very common or common |
| Flushing | Common (up to 1 in 10) | Very common or common |
| Stuffy nose | Common | Very common or common |
| Indigestion | Common | Very common or common |
| Dizziness | Common | Very common or common |
| Feeling sick | Common | Not listed as common |
| Blurred or colour-tinged vision | Common | Not listed as common |
| Back pain, muscle aches, pain in arms or legs | Not listed as common | Very common or common |

## What to do

- If you feel dizzy or your vision is blurred, don't drive, ride a bike or use machinery until it passes. ${cite(1)}
- Tell your prescriber or pharmacist if side effects bother you or don't go away. Don't take extra doses to try to make the medicine work better.
- You can report a suspected side effect to the MHRA's Yellow Card scheme. ${cite(5)}

If you notice anything on our [urgent warning signs](/ed/side-effects/urgent-warning-signs) list, get help straight away.`,
    sources: [SOURCES.nhsSildenafilSideEffects, SOURCES.nhsTadalafil, SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.yellowCard],
  },
  {
    slug: "side-effects/cardiovascular-safety",
    title: "Heart health before starting ED treatment",
    summary: "Why your prescriber asks about your heart, blood pressure and other medicines before recommending an ED medicine, and which conditions rule it out.",
    keyFacts: [
      "ED medicines must not be taken with nitrates, including 'poppers'.",
      "A recent heart attack or stroke can rule them out.",
      "Very low (below 90/50 mmHg) or uncontrolled high blood pressure can rule them out.",
      "Erection problems can be a sign of another health condition, so a GP check is worthwhile.",
    ],
    body: `## Why it matters

ED medicines widen blood vessels and can lower blood pressure. Taken with nitrates, they can cause a dangerous drop in blood pressure. ${cite(2, 3)} The product information also says they must not be used by men with heart disease for whom sex is inadvisable. ${cite(3)}

## When they may not be suitable

The NHS says sildenafil may not be suitable if you: ${cite(1)}

- have recently had a heart attack or stroke
- have low blood pressure, or high blood pressure that isn't controlled
- have liver or kidney problems

The official product information lists situations where each medicine **must not** be used:

| Situation | Sildenafil ${cite(2)} | Tadalafil ${cite(3)} |
| --- | --- | --- |
| Taking nitrates (e.g. for angina) or amyl nitrite ('poppers') | Must not use | Must not use |
| Taking riociguat | Must not use | Must not use |
| Recent heart attack | Must not use | Within the last 90 days |
| Recent stroke | Must not use | Within the last 6 months |
| Blood pressure below 90/50 mmHg | Must not use | Must not use |
| Uncontrolled high blood pressure | — | Must not use |
| Uncontrolled irregular heartbeat | — | Must not use |
| Angina during sex | — | Must not use |
| Heart failure (NYHA class 2 or above) in the last 6 months | — | Must not use |
| Severe liver problems | Must not use | — |

A dash means the condition isn't in that medicine's list of absolute exclusions. It may still need care, so tell your prescriber about it.

## What to tell your prescriber

- any heart condition, heart attack or stroke, and when it happened
- chest pain, especially during exercise or sex
- your blood pressure, if you know it
- every medicine you take, including anything for chest pain and anything bought without a prescription

## A health check is worth it

The NHS advises seeing a GP if erection problems keep happening, because they can be a sign of a treatable health condition such as high blood pressure, high cholesterol or diabetes. ${cite(4)} See also [medicine interactions](/ed/side-effects/interactions).`,
    sources: [SOURCES.nhsSildenafilWhoCan, SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.nhsEd],
  },
  {
    slug: "side-effects/interactions",
    title: "Medicine and substance interactions",
    summary: "Medicines, drinks and substances that can interact with sildenafil and tadalafil. Always give your prescriber a full list of what you take.",
    keyFacts: [
      "Never combine ED medicines with nitrates or 'poppers' (amyl nitrite).",
      "Riociguat must not be taken with them.",
      "Some prostate and blood pressure medicines (alpha-blockers) can cause low blood pressure with them.",
      "Avoid grapefruit juice. With tadalafil, alcohol makes dizziness more likely.",
    ],
    body: `> General information, not an interaction checker. Your prescriber or pharmacist will check your own medicines. These lists aren't complete.

## Must not be combined

- **Nitrates**, often used for chest pain (angina), and **amyl nitrite ('poppers')**. Together they can cause a dangerous drop in blood pressure. ${cite(3, 4)} The NHS lists poppers among the things that don't mix with these medicines. ${cite(1, 2)}
- **Riociguat**, a medicine for high blood pressure in the lungs. ${cite(3, 4)}

## Needs care: alpha-blockers

Alpha-blockers, such as doxazosin, are used for an enlarged prostate or high blood pressure. With sildenafil, they may cause symptomatic low blood pressure in some people. ${cite(3)} The tadalafil product information says tadalafil with doxazosin is not recommended. ${cite(4)}

## Other medicines to mention

The NHS lists these as medicines that may not mix well with sildenafil or tadalafil: ${cite(1, 2)}

- epilepsy medicines
- medicines for high blood pressure or pulmonary hypertension
- some antibiotics, including rifampicin, erythromycin and clarithromycin
- medicines for HIV
- antifungal medicines
- other medicines for erection problems or an enlarged prostate
- St John's wort (herbal supplement)

## Recreational drugs

The NHS warns against combining them with illegal drugs such as amphetamines, ecstasy and cocaine. ${cite(1, 2)}

## Grapefruit

Don't drink grapefruit juice while taking tadalafil. ${cite(2)} Grapefruit juice can also modestly raise the level of sildenafil in the blood. ${cite(3)}

## Alcohol

With tadalafil, alcohol increases the risk of low blood pressure, which can make you feel dizzy or light-headed. ${cite(2)} The NHS sildenafil page also lists alcohol as something to check before taking it. ${cite(1)}`,
    sources: [SOURCES.nhsSildenafilInteractions, SOURCES.nhsTadalafil, SOURCES.viagraSmpc, SOURCES.cialisSmpc],
  },
  {
    slug: "side-effects/vision-and-hearing",
    title: "Vision and hearing changes",
    summary: "Temporary vision changes are a known side effect of sildenafil. Sudden loss of sight or hearing is different and needs urgent help.",
    keyFacts: [
      "Blurred vision and a coloured (often blue) tinge are common with sildenafil.",
      "Sudden loss of vision or hearing: stop the medicine and get help straight away.",
      "Neither medicine is suitable after vision loss from reduced blood flow to the optic nerve (NAION).",
    ],
    body: `## Temporary changes

Sildenafil can cause temporary changes in vision, such as blurred vision. ${cite(1)} Its product information lists blurred vision and colour-tinged vision (for example a blue tinge) as common side effects. ${cite(3)}

If your vision is blurred or you feel dizzy, don't drive, ride a bike or use machinery until it passes. ${cite(1)} Tadalafil's product information says it has a negligible effect on driving, but check how it affects you first. ${cite(4)}

## Sudden changes need urgent help

- **Sudden problems with your eyesight**, such as losing vision in one or both eyes: stop taking the medicine and get medical help straight away. ${cite(2, 3, 4)}
- **A sudden drop in, or loss of, hearing**: stop taking the medicine and get medical help promptly. ${cite(2, 4)} Deafness is also listed as a rare side effect of sildenafil. ${cite(3)}

## Before you start

Tell your prescriber if you have ever had:

- vision loss caused by reduced blood flow to the optic nerve (non-arteritic anterior ischaemic optic neuropathy, NAION). Neither medicine should be used if this caused loss of vision in one eye. ${cite(3, 4, 5)}
- an inherited eye condition such as retinitis pigmentosa. Sildenafil must not be used. ${cite(3)}`,
    sources: [SOURCES.nhsSildenafilSideEffects, SOURCES.nhsTadalafil, SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.nhsSildenafilWhoCan],
  },
  {
    slug: "side-effects/contact-your-prescriber",
    title: "Contacting your prescriber",
    summary: "When to contact the prescriber or pharmacist who supplied your ED medicine, and how to prepare so you get a useful answer.",
    keyFacts: [
      "Get in touch about side effects that bother you or don't go away.",
      "Check with them before starting any new medicine or supplement.",
      "Have the medicine name, strength and your other medicines ready.",
      "For urgent symptoms, don't wait. Call 999, or NHS 111 for urgent advice.",
    ],
    body: `## When to get in touch

- side effects that bother you or don't go away ${cite(1, 2)}
- before starting any new medicine, herbal remedy, vitamin or supplement, including ones bought without a prescription ${cite(3)}
- a new heart or blood pressure problem, or a heart attack or stroke since you started ${cite(4)}
- a medicine that doesn't seem to work. Don't take extra doses.

## What to have ready

- the medicine's name and strength
- when and how you've been taking it
- what you've noticed and when it started
- every other medicine you take

## Online pharmacies

If you bought treatment online, the pharmacy's website or order confirmation should tell you how to contact its pharmacist or prescriber.

## Reporting a side effect

You or your prescriber can report a suspected side effect to the MHRA's Yellow Card scheme. ${cite(5)}

## Urgent symptoms

Don't wait for a reply if you have any [urgent warning signs](/ed/side-effects/urgent-warning-signs). Call 999, or use NHS 111 for urgent advice. ${cite(6)}`,
    sources: [SOURCES.nhsSildenafilSideEffects, SOURCES.nhsTadalafil, SOURCES.nhsSildenafilInteractions, SOURCES.nhsSildenafilWhoCan, SOURCES.yellowCard, SOURCES.nhs111],
  },
];

export function getSideEffectsArticle(slug: string) {
  return sideEffectsArticles.find((article) => article.slug === slug) ?? null;
}
