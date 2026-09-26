import { cite } from "@/lib/article-citations";
import { SOURCES } from "@/lib/article-sources";
import type { ArticleContent } from "@/types/article";

// Guides and Treatments pages. Every statement was checked on SOURCES_CHECKED_ON (sourced-articles.ts)
// against the source it cites; cite(n) points at the nth entry of that article's `sources`.
export const guideArticles: ArticleContent[] = [
  {
    slug: "guides/understanding-ed",
    title: "Understanding erectile dysfunction and its causes",
    summary: "Erectile dysfunction (ED) is common and often treatable. It can have physical causes, psychological causes, or both, and can be a sign of another health condition.",
    keyFacts: [
      "Occasional erection problems are common, often because of stress, tiredness or alcohol.",
      "If it keeps happening, see a GP or go to a sexual health clinic.",
      "Health conditions such as high blood pressure, high cholesterol, diabetes and depression can cause it.",
      "Treatment works best when any underlying cause is found and treated too.",
    ],
    body: `## What erectile dysfunction is

Erectile dysfunction (ED) means regularly finding it hard to get or keep an erection firm enough for sex. Most men have trouble with erections now and then, often because of stress, tiredness or drinking too much alcohol. ${cite(1)}

## Common causes

If it happens often, it can be caused by: ${cite(1)}

- high blood pressure or high cholesterol
- diabetes
- depression or anxiety
- hormone problems
- a side effect of some medicines

Because the arteries in the penis are narrow, erection problems can be one of the first warning signs of narrowed arteries elsewhere in the body (atherosclerosis). ${cite(2)}

## When to get help

See a GP or go to a sexual health clinic if erection problems keep happening. It might be a sign of a health condition that can be treated. ${cite(1)} Men who buy ED treatment from a pharmacy without a prescription are advised to see their doctor within 6 months for a check of possible underlying causes. ${cite(3)}

## Treatment

Treatment depends on the cause. It may include medicines, changes to other medicines, lifestyle changes, counselling or a vacuum pump. ${cite(1)} See our [treatment overview](/ed/treatments) and [options beyond medication](/ed/guides/beyond-medication).`,
    sources: [SOURCES.nhsEd, SOURCES.bhfEd, SOURCES.viagraConnectSmpc],
  },
  {
    slug: "guides/ed-and-heart-health",
    title: "Erectile dysfunction and heart health",
    summary: "Erection problems and heart disease can share a cause: narrowed arteries. ED can be an early warning sign worth raising with your GP.",
    keyFacts: [
      "Narrowed arteries can show up as erection problems before other symptoms.",
      "High blood pressure, high cholesterol and diabetes can cause both.",
      "ED medicines must never be taken with nitrates such as GTN spray.",
      "Chest pain that feels tight or like squeezing needs a 999 call.",
    ],
    body: `## Why the two are linked

An erection depends on the arteries to the penis widening to let more blood in. Atherosclerosis, a build-up of fatty material inside the arteries, reduces that blood flow. Because the penis's arteries are so narrow, erection problems can be one of the first warning signs. Atherosclerosis also increases the risk of heart attack and stroke. ${cite(1)}

## What to ask your GP about

The BHF advises booking an appointment with your doctor if you have erection problems, to find the cause. They may refer you for tests. ${cite(1)} Conditions linked to ED include high blood pressure, high cholesterol and diabetes. ${cite(2)} This is worth doing even if you get treatment from an online pharmacy.

## Heart conditions and ED treatment

- ED medicines such as sildenafil and tadalafil must not be taken with nitrates, such as GTN spray for angina. Together they can make blood pressure drop dangerously low. ${cite(1, 3)}
- After a heart attack, the BHF says PDE5 inhibitors such as Viagra can be prescribed from 6 months later, if your condition is stable. ${cite(1)}

See [heart health before treatment](/ed/side-effects/cardiovascular-safety) for the conditions that rule these medicines out.

## When to call 999

Call 999 if you have chest pain that feels tight or like squeezing, or chest pain spreading to your arms, neck or jaw. ${cite(4)}`,
    sources: [SOURCES.bhfEd, SOURCES.nhsEd, SOURCES.viagraSmpc, SOURCES.nhsHeartAttack],
  },
  {
    slug: "guides/beyond-medication",
    title: "ED treatment beyond medication",
    summary: "Tablets aren't the only option. Lifestyle changes, counselling, vacuum pumps and treating an underlying cause can all help with erection problems.",
    keyFacts: [
      "Treating an underlying cause, such as blood pressure or a medicine side effect, can help.",
      "Losing weight, stopping smoking, exercise and less alcohol are all recommended.",
      "Counselling can help when stress, anxiety or relationship problems play a part.",
      "Vacuum pumps are a non-medicine option.",
    ],
    body: `## Treating the cause

If ED is linked to a health condition, such as high blood pressure, high cholesterol or a hormone problem, treating that condition may help. A GP may also look at whether another medicine you take could be the cause. ${cite(1)} Don't stop or change a prescribed medicine yourself; talk to your GP or prescriber first.

## Lifestyle changes

The NHS recommends: ${cite(1)}

- losing weight if you're overweight
- stopping smoking
- eating a healthy diet
- exercising every day
- reducing stress and anxiety
- keeping alcohol under 14 units a week

## Counselling and therapy

When emotional or mental health problems play a part, counselling and therapy can help. ${cite(1)}

## Vacuum pumps

A vacuum pump encourages blood to flow into the penis to create an erection. ${cite(1)} It's a non-medicine option some people prefer.

## Where to start

A GP or sexual health clinic can talk through which options suit you. ${cite(1)} See also [understanding ED](/ed/guides/understanding-ed).`,
    sources: [SOURCES.nhsEd],
  },
  {
    slug: "guides/talking-about-ed",
    title: "Talking about erection problems",
    summary: "Erection problems are common, and talking about them, with a partner or a professional, is often the first step to sorting them out.",
    keyFacts: [
      "Most men have erection problems at some point.",
      "Stress and anxiety can cause erection problems.",
      "You can go to a sexual health clinic without seeing your GP first.",
      "Clinics keep your visit confidential and won't tell your GP without your permission.",
    ],
    body: `## You're not alone

Most men have trouble getting or keeping an erection from time to time, often because of stress, tiredness or alcohol. ${cite(1)} Feeling embarrassed is normal, but it shouldn't stop you getting help.

## Talking to a partner

Anxiety and stress can play a part in erection problems. ${cite(1)} Choosing a relaxed moment away from the bedroom, and being honest about how you feel, can take the pressure off for both of you. If relationship worries are involved, counselling can help. ${cite(1)}

## Talking to a professional

You can see a GP or go to a sexual health clinic. ${cite(1)} You can make an appointment at a sexual health clinic yourself, and some run drop-in sessions. You don't have to give your real name. If you do, it's kept confidential, and your GP won't be told about your visit without your permission. ${cite(2)}

It can help to note down beforehand:

- how long it's been happening
- whether you still get erections at other times, for example in the morning
- any medicines you take, including ones you buy yourself
- anything that's been stressing you`,
    sources: [SOURCES.nhsEd, SOURCES.nhsSexualHealthClinic],
  },
  {
    slug: "treatments",
    title: "ED treatment overview",
    summary: "The most common treatments for erection problems are PDE5 inhibitor tablets such as sildenafil and tadalafil. They need a prescriber's or pharmacist's assessment and only work with sexual arousal.",
    keyFacts: [
      "The main ED medicines are sildenafil, tadalafil, vardenafil and avanafil.",
      "They increase blood flow to the penis but need sexual arousal to work.",
      "Sildenafil is available on prescription, or from a pharmacy without one; the others need a prescription.",
      "They must never be taken with nitrates.",
    ],
    body: `## Medicines

The main medicines for erection problems (PDE5 inhibitors) are: ${cite(1)}

- [sildenafil](/ed/treatments/sildenafil) (Viagra)
- [tadalafil](/ed/treatments/tadalafil) (Cialis)
- vardenafil (Levitra)
- avanafil (Spedra)

They help blood flow into the penis. They don't cause an erection on their own; sexual stimulation is needed for them to work. ${cite(2)}

## How you can get them

You can get sildenafil on prescription or buy it from a pharmacy. You need a prescription for the other types. ${cite(1)} Viagra Connect, a 50 mg sildenafil tablet, is a pharmacy medicine sold after a pharmacist's check. ${cite(3)}

## Who can take them

They aren't suitable for everyone. They must not be taken with nitrates, and some heart conditions rule them out. ${cite(2)} See [heart health before treatment](/ed/side-effects/cardiovascular-safety).

## Other options

Not everyone wants or can take tablets. See [treatment beyond medication](/ed/guides/beyond-medication) and [your first consultation](/ed/guides/first-consultation).`,
    sources: [SOURCES.nhsEd, SOURCES.viagraSmpc, SOURCES.viagraConnectSmpc],
  },
  {
    slug: "treatments/sildenafil",
    title: "Sildenafil explained",
    summary: "Sildenafil is a medicine for erection problems, taken about an hour before sex when needed. Viagra is one brand. General information to discuss with a pharmacist or prescriber.",
    keyFacts: [
      "Usually taken about 1 hour before sex; it needs sexual arousal to work.",
      "No more than 1 tablet a day.",
      "Must never be taken with nitrates, 'poppers' or riociguat.",
      "A large meal can delay how quickly it works.",
    ],
    body: `## What it is

Sildenafil is a PDE5 inhibitor used to treat erection problems. Viagra is one brand; generic versions contain the same active ingredient. ${cite(1)} You can get it on prescription or buy it from a pharmacy. ${cite(4)}

## How it's taken

- Usually 1 tablet about 1 hour before sex, though how long it takes to work varies. ${cite(1)}
- No more than 1 tablet a day. ${cite(1, 2)}
- The usual starting dose is 50 mg. A prescriber may change it to 25 mg or 100 mg. ${cite(2)}
- Taking it after a large meal may delay how quickly it works. ${cite(1)}

In clinical studies, the median time to an erection was about 25 minutes, and the effect was seen for up to 4 to 5 hours after a dose. ${cite(2)}

## Common side effects

Headache, dizziness, a blocked or stuffy nose, stomach ache or feeling sick, and temporary changes in vision such as blurring. ${cite(3)} See [common side effects](/ed/side-effects/common).

## Things to avoid

- Nitrates (often for chest pain), amyl nitrite ('poppers') and riociguat must not be taken with it. ${cite(2)}
- Avoid grapefruit and grapefruit juice. ${cite(1)}
- If you take more than prescribed, call NHS 111. ${cite(1)}

## Get urgent help if

Call 999 or go to A&E for an erection lasting more than 3 to 4 hours, chest pain, or signs of a serious allergic reaction. ${cite(5, 3)} See [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.nhsSildenafilHowToTake, SOURCES.viagraSmpc, SOURCES.nhsSildenafilSideEffects, SOURCES.nhsEd, SOURCES.nhsPriapism],
  },
  {
    slug: "treatments/tadalafil",
    title: "Tadalafil explained",
    summary: "Tadalafil is a medicine for erection problems whose effect can last up to 36 hours. It can be taken before sex or as a lower daily dose. Cialis is one brand.",
    keyFacts: [
      "Its effect can last up to 36 hours.",
      "Taken before sex (usually 10 mg) or as a daily 5 mg tablet, as your prescriber decides.",
      "No more than 1 dose a day, and never with nitrates.",
      "Avoid grapefruit juice; alcohol makes dizziness more likely.",
    ],
    body: `## What it is

Tadalafil is a PDE5 inhibitor mainly used to treat erection problems. It's also used for problems peeing caused by an enlarged prostate, and for pulmonary arterial hypertension. Brands include Cialis and Cialis Together. ${cite(1)}

## How it's taken

There are two ways of taking tadalafil for erection problems:

- **When needed:** usually 10 mg at least 30 minutes before sex. A prescriber may increase it to 20 mg. ${cite(2)}
- **Every day:** 5 mg at about the same time each day, sometimes reduced to 2.5 mg, for people who expect to use it at least twice a week. ${cite(2)}

In studies, an effect was seen from as early as 16 minutes and up to 36 hours after a dose. ${cite(2)} Don't take more than 1 dose a day. ${cite(1, 2)}

## Common side effects

Indigestion, muscle aches, arm and leg pain, back pain, a blocked nose, a flushed face and headache. ${cite(1)}

## Things to avoid

- Nitrates (such as GTN for chest pain) and riociguat must not be taken with it. ${cite(1, 2)}
- Don't drink grapefruit juice. ${cite(1)}
- Alcohol increases the risk of low blood pressure and dizziness. ${cite(1)}
- If you take more than prescribed, contact NHS 111. ${cite(1)}

## Get urgent help if

Get urgent help for an erection lasting more than 3 to 4 hours, chest pain, noticeable heartbeats, sudden problems with your hearing or sight, or signs of a serious allergic reaction. ${cite(1, 3)} See [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.nhsTadalafil, SOURCES.cialisSmpc, SOURCES.nhsPriapism],
  },
  {
    slug: "guides/first-consultation",
    title: "Your first ED consultation",
    summary: "Whether with your GP, a sexual health clinic or an online pharmacy, an ED consultation asks about your health and medicines so a prescriber can decide if treatment is safe for you.",
    keyFacts: [
      "Expect questions about your heart, blood pressure, other conditions and medicines.",
      "Answer honestly. Your safety depends on it.",
      "You can get sildenafil on NHS prescription; other ED medicines need a prescription too.",
      "Check an online pharmacy is registered before you buy.",
    ],
    body: `## What you'll be asked

A prescriber needs enough information to decide whether an ED medicine is safe for you. Some heart conditions, very low or uncontrolled high blood pressure, and some medicines rule them out. ${cite(2, 3)} So you'll usually be asked about:

- how long you've had erection problems
- heart problems, blood pressure, stroke, and any chest pain
- other health conditions, including liver or kidney problems
- every medicine you take, including ones you buy and recreational drugs

## NHS or private

You can see a GP or go to a sexual health clinic. You can get sildenafil on prescription or buy it from a pharmacy; the other ED medicines need a prescription. ${cite(1)} Private online pharmacies charge for the medicine and sometimes for the consultation. Our [price comparison](/ed/compare) shows those costs together.

## Online consultations

Online services usually use a health questionnaire that a prescriber reviews. The NHS advises checking that an online pharmacy is registered with the General Pharmaceutical Council, and that an online doctor service is registered with the Care Quality Commission. ${cite(1)} Many websites sell fake medicines. ${cite(1, 4)}

See [choosing an ED pharmacy](/ed/guides/choosing-a-pharmacy) and the [heart-health checklist](/ed/tools/heart-health-checklist).`,
    sources: [SOURCES.nhsEd, SOURCES.nhsSildenafilWhoCan, SOURCES.cialisSmpc, SOURCES.fakeMeds],
  },
  {
    slug: "guides/choosing-a-pharmacy",
    title: "Choosing an online ED pharmacy",
    summary: "Buy ED medicines only from a registered pharmacy. Here's how to check, and what else to compare.",
    keyFacts: [
      "In Great Britain, check the pharmacy is on the GPhC register.",
      "In Northern Ireland, pharmacies are registered with the PSNI.",
      "Fake medicines bought online may not work, can make you ill and can be dangerous.",
      "Compare the total cost, including delivery and consultation fees.",
    ],
    body: `## Check it's registered

- **Great Britain:** pharmacies must be registered with the General Pharmaceutical Council (GPhC). Search the [GPhC register](https://www.pharmacyregulation.org/registers). ${cite(1, 3)}
- **Northern Ireland:** the Pharmaceutical Society of Northern Ireland (PSNI) regulates pharmacies. Search the [PSNI register](https://registers.psni.org.uk/). ${cite(2)}
- **Online doctor services** should be registered with the Care Quality Commission (CQC). ${cite(4)}

## Watch for fakes

The MHRA warns that fake medicines not only fail to work but can make you sick. In the most severe cases they may contain dangerous ingredients. Scam websites can also steal your card details and identity. ${cite(3)}

## Look for a real consultation

Prescription ED medicines should only be supplied after a prescriber has reviewed your health, because some conditions and medicines make them unsafe. ${cite(5)}

## Compare the whole cost

A low tablet price can hide delivery or consultation charges. Our [comparison](/ed/compare) adds known fees together and shows the price per tablet. See [how we verify pharmacies](/ed/pharmacies/verification).`,
    sources: [SOURCES.gphc, SOURCES.psni, SOURCES.fakeMeds, SOURCES.nhsEd, SOURCES.viagraSmpc],
  },
  {
    slug: "guides/travel-and-delivery",
    title: "Travel, delivery and storing ED medicines",
    summary: "How to travel with ED medicines, what to check about delivery, and how to store them.",
    keyFacts: [
      "Keep medicines in their original pharmacy packaging.",
      "Carry a copy of your prescription and a letter from your prescriber.",
      "Pack medicines in your hand luggage, with a backup in checked luggage.",
      "Store below 30°C in the original pack, away from moisture.",
    ],
    body: `## Travelling abroad

UK travel health guidance (NaTHNaC) recommends: ${cite(1)}

- taking medicines in their original pharmacy packaging
- carrying a copy of your prescription and a letter from your prescriber
- keeping medicines in your hand luggage, with extra supplies packed separately in checked luggage in case a bag is lost
- checking whether the medicine is legal where you're going, with that country's embassy or the Foreign, Commonwealth & Development Office travel advice

## Delivery

Online pharmacies deliver in different ways and at different speeds. Check the pharmacy's delivery page for timings, tracking and charges, as these change the total you pay. Our [comparison](/ed/compare) shows delivery fees where the pharmacy lists them.

## Storage

Both Viagra and Cialis should be stored below 30°C, in the original package to protect them from moisture. ${cite(2, 3)} Keep all medicines out of the sight and reach of children, and check the leaflet for your own medicine.`,
    sources: [SOURCES.travel, SOURCES.viagraSmpc, SOURCES.cialisSmpc],
  },
  {
    slug: "guides/managing-treatment",
    title: "Managing ED treatment",
    summary: "Repeat supplies, switching pharmacy and what to do if treatment isn't working. Always through your prescriber, never by changing the dose yourself.",
    keyFacts: [
      "ED medicines need sexual arousal to work.",
      "Never take more than 1 dose a day. If you've taken too much, call NHS 111.",
      "Give any new pharmacy your full medical history.",
      "Report suspected side effects to the MHRA Yellow Card scheme.",
    ],
    body: `## If it doesn't seem to work

ED medicines need sexual stimulation to work. ${cite(1)} How long sildenafil takes to work varies, and a large meal can delay it. ${cite(2)} Don't take extra tablets: no more than 1 dose a day, and if you've taken more than prescribed, call NHS 111. ${cite(2, 3)} Speak to your prescriber, who may review the medicine, strength or timing.

## Repeat supplies

Online pharmacies usually ask you to confirm your health information again before a repeat supply. Tell them about any new medicines or health changes, especially heart or blood pressure problems. ${cite(4)}

## Switching pharmacy

You can change pharmacy. A new pharmacy will carry out its own consultation, so give it your full, accurate history, including what you've taken before and how it went.

## Side effects

Tell your prescriber about side effects that bother you or don't go away. You can also report a suspected side effect to the MHRA's Yellow Card scheme. ${cite(5)} See [common side effects](/ed/side-effects/common) and [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.viagraSmpc, SOURCES.nhsSildenafilHowToTake, SOURCES.nhsTadalafil, SOURCES.nhsSildenafilWhoCan, SOURCES.yellowCard],
  },
  {
    slug: "guides/news",
    title: "ED medicine news and safety alerts",
    summary: "Dated guidance updates and safety warnings about ED medicines, each linked to its official source.",
    keyFacts: [
      "Fake ED medicines are sold online and can be dangerous.",
      "The official product information for Viagra, Viagra Connect and Cialis was updated in December 2025 and January 2026.",
      "NHS sildenafil and tadalafil pages were reviewed in 2026.",
    ],
    body: `Each item shows the date on the official source. We checked them all on 26 September 2026.

## Guidance updates

| Date | Update | Source |
| --- | --- | --- |
| 29 July 2026 | NHS reviewed its sildenafil pages, including side effects, who can take it and interactions. | ${cite(1)} |
| 13 May 2026 | NHS reviewed its tadalafil page. | ${cite(2)} |
| 27 January 2026 | Cialis product information (SmPC) revised. | ${cite(3)} |
| December 2025 | Viagra and Viagra Connect product information (SmPCs) revised. | ${cite(4, 5)} |
| 24 October 2025 | NaTHNaC updated its advice on travelling with medicines. | ${cite(6)} |

## Safety warning: fake medicines sold online

The MHRA's #FakeMeds campaign warns that fake medicines bought online can fail to work, make you sick and, in the most severe cases, contain dangerous ingredients. Scam websites can also steal card details and identities. ${cite(7)}

In Great Britain, check an online pharmacy on the GPhC register before buying. ${cite(8)} See [choosing an ED pharmacy](/ed/guides/choosing-a-pharmacy).`,
    sources: [SOURCES.nhsSildenafilSideEffects, SOURCES.nhsTadalafil, SOURCES.cialisSmpc, SOURCES.viagraSmpc, SOURCES.viagraConnectSmpc, SOURCES.travel, SOURCES.fakeMeds, SOURCES.gphc],
  },
];
