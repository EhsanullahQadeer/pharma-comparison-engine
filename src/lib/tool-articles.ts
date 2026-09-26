import { cite } from "@/lib/article-citations";
import { SOURCES } from "@/lib/article-sources";
import type { ArticleContent } from "@/types/article";

// Tools reference pages. Every statement was checked on SOURCES_CHECKED_ON (sourced-articles.ts)
// against the source it cites; cite(n) points at the nth entry of that article's `sources`.
export const toolArticles: ArticleContent[] = [
  {
    slug: "tools/medicine-comparison",
    title: "Sildenafil and tadalafil compared",
    summary: "A side-by-side comparison of the two most common ED medicines, from their official product information. It's not a recommendation: your prescriber decides what's suitable for you.",
    keyFacts: [
      "Both are PDE5 inhibitors and need sexual arousal to work.",
      "Sildenafil is usually taken about 1 hour before sex; tadalafil at least 30 minutes before.",
      "Tadalafil's effect was seen for up to 36 hours; sildenafil's for up to 4 to 5 hours.",
      "Neither can be taken with nitrates or riociguat.",
    ],
    body: `> General information only, not a recommendation. Your prescriber chooses the medicine and strength.

| | Sildenafil | Tadalafil |
| --- | --- | --- |
| Brand examples | Viagra, Viagra Connect ${cite(1, 3)} | Cialis, Cialis Together ${cite(4)} |
| How it's taken | About 1 hour before sex, when needed ${cite(1)} | At least 30 minutes before sex, or a daily tablet ${cite(2)} |
| Usual strengths | 25, 50, 100 mg ${cite(1)} | 2.5, 5, 10, 20 mg ${cite(2)} |
| How long the effect was seen in studies | Up to 4 to 5 hours ${cite(1)} | Up to 36 hours ${cite(2)} |
| Maximum | Once a day ${cite(1)} | Once a day ${cite(2)} |
| Most common side effect | Headache (more than 1 in 10) ${cite(1)} | Headache, indigestion, back pain, muscle aches ${cite(2)} |
| Without a prescription? | Yes, from a pharmacy (e.g. Viagra Connect) ${cite(3, 5)} | Cialis Together, from a pharmacy ${cite(4)} |
| Grapefruit juice | Can raise blood levels ${cite(1)} | Avoid ${cite(4)} |
| Nitrates and riociguat | Must not be combined ${cite(1)} | Must not be combined ${cite(2)} |

See [sildenafil explained](/ed/treatments/sildenafil), [tadalafil explained](/ed/treatments/tadalafil) and [common side effects](/ed/side-effects/common).`,
    sources: [SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.viagraConnectSmpc, SOURCES.nhsTadalafil, SOURCES.nhsEd],
  },
  {
    slug: "tools/onset-and-duration",
    title: "Onset and duration reference",
    summary: "When ED medicines are usually taken and how long their effect lasted in clinical studies. Always follow your own prescriber's instructions.",
    keyFacts: [
      "Sildenafil is usually taken about 1 hour before sex.",
      "Tadalafil can be taken at least 30 minutes before sex.",
      "Tadalafil's effect was seen for up to 36 hours after a dose.",
      "A large meal can delay sildenafil.",
    ],
    body: `> General reference from the official product information. Follow the instructions from your prescriber and the leaflet in your pack.

| Medicine | Usually taken | Onset seen in studies | Effect seen in studies |
| --- | --- | --- | --- |
| Sildenafil | About 1 hour before sex ${cite(1)} | Median about 25 minutes, taken without food ${cite(1)} | Up to 4 to 5 hours ${cite(1)} |
| Tadalafil (when needed) | At least 30 minutes before sex ${cite(2)} | From as early as 16 minutes ${cite(2)} | Up to 36 hours ${cite(2)} |
| Tadalafil (daily) | Once a day, at about the same time ${cite(2, 4)} | Continuous with daily use | Continuous with daily use |

## Food

Taking sildenafil after a large meal may delay how quickly it works. ${cite(3)} In studies, food delayed peak levels of sildenafil by about an hour. ${cite(1)}

## If it doesn't seem to work

How quickly a medicine works varies from person to person. ${cite(3)} Don't take more than 1 dose a day. Speak to your prescriber instead. ${cite(1, 2)}`,
    sources: [SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.nhsSildenafilHowToTake, SOURCES.nhsTadalafil],
  },
  {
    slug: "tools/strengths",
    title: "Medicine strengths reference",
    summary: "The strengths sildenafil and tadalafil tablets come in. This explains what's available, not what you should take. Your prescriber decides the strength.",
    keyFacts: [
      "Strength is measured in milligrams (mg).",
      "Sildenafil's usual starting dose is 50 mg.",
      "Tadalafil's usual when-needed dose is 10 mg; the daily dose is usually 5 mg.",
      "A higher strength isn't automatically better. Never take more than prescribed.",
    ],
    body: `> This explains available strengths only. It isn't dosing advice.

| Medicine | Strengths | Usual dose in the product information |
| --- | --- | --- |
| Sildenafil (Viagra) | 25 mg, 50 mg, 100 mg | 50 mg when needed; may be changed to 25 mg or 100 mg ${cite(1)} |
| Sildenafil (Viagra Connect, from a pharmacy) | 50 mg | One 50 mg tablet when needed ${cite(3)} |
| Tadalafil (Cialis) | 2.5 mg, 5 mg, 10 mg, 20 mg | 10 mg when needed, may be increased to 20 mg; or 5 mg daily, may be reduced to 2.5 mg ${cite(2)} |

## Why strengths differ

Prescribers choose a strength based on how well it works and how well you tolerate it. ${cite(1)} Whatever the strength, the maximum is 1 dose a day. ${cite(1, 2)} Never change your dose without speaking to your prescriber.

Comparing prices? Our [pack-size comparison](/ed/prices/pack-sizes) compares the same strength across pack sizes.`,
    sources: [SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.viagraConnectSmpc],
  },
  {
    slug: "tools/iief-5",
    title: "The IIEF-5 questionnaire explained",
    summary: "What the IIEF-5 is, why clinicians use it and what it can't do. The questions themselves aren't reproduced here.",
    keyFacts: [
      "The IIEF-5 is a short, validated questionnaire about erectile function.",
      "It has 5 questions about the previous 6 months.",
      "It gives a rough guide to severity, alongside a full assessment.",
      "It can't diagnose the cause or choose a treatment.",
    ],
    body: `## What it is

The IIEF-5 (International Index of Erectile Function, 5-item version) is a short questionnaire developed from a longer research questionnaire. It asks about erections and sexual satisfaction over the previous 6 months. ${cite(1)}

## How it's used

Some clinicians use it during an assessment, or to track how treatment is going over time. The total score gives a rough guide to how severe erection problems are. ${cite(1)} It's only one part of an assessment. It can't find the cause, which may be a health condition that needs treating, and it can't decide on treatment. ${cite(2)}

## Why the questions aren't here

The questionnaire is a published, copyrighted research instrument. We explain what it is rather than reproduce it. If a prescriber asks you to complete it, they'll provide it.

## If you're asked to complete it

Answer honestly for the time period asked about, and ask your prescriber to explain what your answers mean for you.`,
    sources: [SOURCES.iief5, SOURCES.nhsEd],
  },
  {
    slug: "tools/heart-health-checklist",
    title: "Heart-health checklist for your consultation",
    summary: "What to note down before an ED consultation, based on the conditions that affect whether ED medicines are safe. It's a preparation list, not a medical clearance.",
    keyFacts: [
      "This helps you prepare. It doesn't tell you whether treatment is safe.",
      "Each item is something the official product information asks prescribers to consider.",
      "Take a full list of your medicines.",
    ],
    body: `> A preparation list, not a medical clearance. Only your prescriber can decide whether treatment is safe for you.

## Before your consultation, note down

- [ ] Any heart attack or stroke, and when it happened ${cite(1, 2)}
- [ ] Chest pain (angina), especially during sex ${cite(2)}
- [ ] Heart failure or an irregular heartbeat ${cite(2)}
- [ ] Your most recent blood pressure reading, if you know it, and whether it's low or not controlled ${cite(1, 2)}
- [ ] Liver or kidney problems ${cite(3)}
- [ ] Any sudden loss of vision in the past, or an inherited eye condition such as retinitis pigmentosa ${cite(1, 2)}
- [ ] Every medicine you take, especially nitrates (such as GTN spray), riociguat and alpha-blockers (such as doxazosin) ${cite(1, 2)}
- [ ] Any 'poppers' or recreational drugs you use ${cite(4)}
- [ ] Any ED medicine you've tried before, and how it went

## Then

Give your prescriber accurate answers. If they have concerns, they may suggest a GP check first. See [heart health before treatment](/ed/side-effects/cardiovascular-safety) and [medicine interactions](/ed/side-effects/interactions).`,
    sources: [SOURCES.viagraSmpc, SOURCES.cialisSmpc, SOURCES.nhsSildenafilWhoCan, SOURCES.nhsSildenafilInteractions],
  },
];
