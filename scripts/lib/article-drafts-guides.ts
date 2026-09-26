import { SOURCES, reviewerNote } from "./article-draft-sources";
import type { ArticleDraft } from "./article-draft-sources";

// First drafts for the Guides and Treatments pages. DRAFT status only: none of this is public until
// a named clinical reviewer (not the author) approves it in /admin/articles.
export const guideDrafts: ArticleDraft[] = [
  {
    slug: "guides/understanding-ed",
    title: "Understanding erectile dysfunction and its causes",
    summary: "Erectile dysfunction (ED) is common and often treatable. It can have physical causes, psychological causes, or both, and can sometimes be a sign of another health condition.",
    keyFacts: [
      "Occasional erection problems are common and usually nothing to worry about.",
      "If it keeps happening, see a GP or a sexual health clinic.",
      "Causes include stress, tiredness, alcohol, some medicines, high blood pressure, high cholesterol, diabetes, depression and hormone problems.",
      "Treatment works best when any underlying cause is found and treated too.",
    ],
    body: `## What erectile dysfunction is

Erectile dysfunction (ED) means regularly finding it hard to get or keep an erection firm enough for sex. Most men have trouble with erections now and then, often because of stress, tiredness or drinking too much alcohol. It's when it keeps happening that it's worth getting advice.

## Common causes

ED is usually linked to something physical, something psychological, or a mix of both.

- **Physical causes** include high blood pressure, high cholesterol, diabetes, hormone problems and the side effects of some medicines.
- **Psychological causes** include stress, anxiety, depression and relationship difficulties.
- **Lifestyle factors** such as drinking a lot of alcohol, smoking and being very tired can all play a part.

${reviewerNote("Consider adding prevalence-by-age figures from NICE CKS, and the general distinction between sudden onset (more often psychological/situational) and gradual onset (more often physical). Keep it general, not diagnostic.")}

## When to get help

See a GP or go to a sexual health clinic if erection problems keep happening. It might be a sign of a health condition that can be treated, and a GP can check things like your blood pressure, cholesterol and blood sugar.

## Treatment

Treatment depends on the cause. It may include medicines, changes to other medicines you take, talking therapies or devices. See our [treatment overview](/ed/treatments) and [options beyond medication](/ed/guides/beyond-medication).`,
    sources: [SOURCES.nhsEd, SOURCES.cks],
  },
  {
    slug: "guides/ed-and-heart-health",
    title: "Erectile dysfunction and heart health",
    summary: "Erection problems and heart disease can share the same causes, such as narrowed blood vessels. ED can be an early sign worth mentioning to your GP.",
    keyFacts: [
      "ED and heart disease share risk factors such as high blood pressure, high cholesterol, diabetes and smoking.",
      "A GP can check your blood pressure, cholesterol and blood sugar.",
      "ED medicines are not usually prescribed with nitrates, which are used for chest pain.",
      "Chest pain that feels tight or squeezing needs a 999 call.",
    ],
    body: `## Why the two are linked

Getting an erection depends on healthy blood flow. The same things that can narrow or damage blood vessels around the heart, like high blood pressure, high cholesterol, diabetes and smoking, can also affect blood flow to the penis.

That's why erection problems can sometimes be an early sign of heart and circulation problems. ${reviewerNote("NICE CKS covers ED as a marker of cardiovascular risk. Please confirm wording against CKS before approval.")}

## What to ask your GP about

If you have erection problems, it's worth asking your GP to check:

- your blood pressure
- your cholesterol
- your blood sugar (for diabetes)

This is worth doing even if you get ED treatment from an online pharmacy.

## Heart conditions and ED treatment

If you have a heart condition, your prescriber will need to know before recommending an ED medicine. ED medicines such as sildenafil and tadalafil are not usually prescribed together with nitrates, which are used for chest pain. Read more about [heart health before treatment](/ed/side-effects/cardiovascular-safety).

## When to call 999

Call 999 if you have chest pain that feels tight or like squeezing, especially if it spreads to your arms, neck or jaw, or if you're short of breath and sweating.`,
    sources: [SOURCES.nhsEd, SOURCES.cks, SOURCES.nhsSildenafil, SOURCES.nhsHeartAttack],
  },
  {
    slug: "guides/beyond-medication",
    title: "ED treatment beyond medication",
    summary: "Tablets aren't the only option. Lifestyle changes, talking therapies, vacuum pumps and treating an underlying cause can all help with erection problems.",
    keyFacts: [
      "Treating an underlying cause, such as changing a medicine, can improve erections.",
      "Talking therapies can help when stress, anxiety or relationship issues are involved.",
      "Vacuum pumps are a non-medicine option.",
      "A GP can explain which options suit you.",
    ],
    body: `## Treating the cause

If ED is linked to something like a medicine side effect or a health condition, treating that may help. Don't stop or change a prescribed medicine yourself; talk to your GP or prescriber first.

## Lifestyle changes

Healthier habits support blood flow and general health. These include being more active, cutting down on alcohol, stopping smoking and managing stress. ${reviewerNote("Consider citing specific NHS lifestyle guidance pages here if you want concrete recommendations.")}

## Talking therapies

When stress, anxiety, depression or relationship problems play a part, counselling or sex therapy can help, alone or with a partner.

## Vacuum pumps

A vacuum pump is a device that draws blood into the penis to create an erection. It's a non-medicine option some people prefer.

## Other treatments

Where tablets aren't suitable or don't work, a doctor or specialist may discuss other treatments. ${reviewerNote("Add specialist options (e.g. alprostadil) only with a reviewed source.")}`,
    sources: [SOURCES.nhsEd, SOURCES.cks],
  },
  {
    slug: "guides/talking-about-ed",
    title: "Talking about erection problems",
    summary: "Erection problems are common, and talking about them, with a partner or a professional, is often the first step to sorting them out.",
    keyFacts: [
      "Most men have erection problems at some point.",
      "Stress and worry about performance can make erection problems worse.",
      "GPs and sexual health clinics deal with ED often.",
      "You can see a sexual health clinic without a GP referral.",
    ],
    body: `## You're not alone

Erection problems are common, and most men have them at some point. Feeling embarrassed is normal, but it shouldn't stop you getting help.

## Talking to a partner

Worrying about sex can make erection problems worse, and silence can leave a partner guessing. Choosing a relaxed moment, away from the bedroom, and being honest about how you feel can take the pressure off for both of you.

## Talking to a professional

GPs and sexual health clinics talk about erection problems every day. It can help to write down beforehand:

- how long it's been happening
- whether you still get erections at other times, for example in the morning
- any medicines you take, including ones you buy yourself
- anything that's been stressing you

${reviewerNote("Confirm the sexual health clinic self-referral statement against NHS guidance before approval.")}`,
    sources: [SOURCES.nhsEd],
  },
  {
    slug: "treatments",
    title: "ED treatment overview",
    summary: "The most common treatments for erection problems are PDE5 inhibitor tablets, such as sildenafil and tadalafil. They need a prescriber's assessment and work alongside sexual arousal.",
    keyFacts: [
      "PDE5 inhibitors include sildenafil, tadalafil, vardenafil and avanafil.",
      "They increase blood flow to the penis but need sexual arousal to work.",
      "They are not suitable for everyone, particularly people who take nitrates.",
      "A pharmacist or prescriber decides which, if any, is right for you.",
    ],
    body: `## Medicines

The main medicines for erection problems are called PDE5 inhibitors. They include:

- [sildenafil](/ed/treatments/sildenafil) (the brand Viagra is one version)
- [tadalafil](/ed/treatments/tadalafil) (the brand Cialis is one version)
- vardenafil
- avanafil

They work by increasing blood flow to the penis. They don't cause an erection on their own. You still need to be sexually aroused.

## Who can take them

These medicines aren't suitable for everyone. They're not usually prescribed with nitrates, and your prescriber will ask about your heart, blood pressure, other conditions and other medicines before recommending one.

## Other options

Not everyone wants or can take tablets. See [treatment beyond medication](/ed/guides/beyond-medication).

## Getting treatment

You can get ED treatment through your GP, a sexual health clinic, or a registered pharmacy, including online pharmacies that run a proper consultation. See [your first consultation](/ed/guides/first-consultation).`,
    sources: [SOURCES.nhsEd, SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "treatments/sildenafil",
    title: "Sildenafil explained",
    summary: "Sildenafil is a medicine for erection problems, taken before sex when needed. Viagra is one brand. Here's general information to discuss with a pharmacist or prescriber.",
    keyFacts: [
      "Usually taken about an hour before sex, and needs sexual arousal to work.",
      "Do not take more than 1 tablet a day.",
      "Not usually prescribed with nitrates or riociguat.",
      "Avoid grapefruit and grapefruit juice while taking it.",
    ],
    body: `## What it is

Sildenafil is a PDE5 inhibitor used to treat erection problems. Viagra is one brand. Generic versions contain the same active ingredient.

${reviewerNote("Add a sourced line on Viagra Connect (50mg, pharmacy-medicine status after pharmacist consultation) if wanted; the MHRA page checked on 2026-09-26 returned 404, so no source is attached yet.")}

## How it's taken

It's usually taken about an hour before sexual activity. How long it takes to work varies from person to person. Don't take more than 1 tablet a day. Your prescriber will tell you which strength to take.

${reviewerNote("Confirm onset and duration wording against the SPC/NHS page. The automated summary of the NHS page quoted 'up to 36 hours', which looks like the tadalafil figure. Please verify before adding any duration.")}

## Common side effects

Common side effects include headaches, dizziness, a stuffy nose, an upset stomach and temporary changes in vision, such as blurred vision. Tell your prescriber if they bother you or don't go away.

## Things to avoid

- It's not usually prescribed together with nitrates (often used for chest pain) or riociguat.
- Don't eat grapefruit or drink grapefruit juice, as it can make side effects more likely.
- Drinking too much alcohol can make it harder to get an erection.

## Get urgent help if

Call 999 or go to A&E if you have an erection lasting more than 3 to 4 hours, chest pain, or signs of a serious allergic reaction. See [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsPriapism],
  },
  {
    slug: "treatments/tadalafil",
    title: "Tadalafil explained",
    summary: "Tadalafil is a medicine for erection problems whose effect can last up to 36 hours. It can be taken when needed or as a lower daily dose. Cialis is one brand.",
    keyFacts: [
      "Its effects can last up to 36 hours.",
      "It can be taken before sex or as a daily tablet, as your prescriber decides.",
      "Not usually prescribed with nitrates.",
      "Avoid grapefruit juice, and be careful with alcohol.",
    ],
    body: `## What it is

Tadalafil is a PDE5 inhibitor mainly used to treat erection problems. It's also used for an enlarged prostate and a lung condition called pulmonary hypertension. Cialis is one brand.

## How it's taken

There are two ways of taking tadalafil for erection problems:

- **When needed**, as a single tablet before sex
- **Every day**, as a lower-strength tablet

Its effects can last up to 36 hours. Your prescriber decides which approach and strength suit you.

## Common side effects

Common side effects include indigestion, muscle aches, back pain, headache and a stuffy nose.

## Things to avoid

- It's not usually prescribed together with nitrates.
- Avoid grapefruit juice.
- Alcohol can make dizziness and low blood pressure more likely.
- Taking an extra dose can be dangerous. If you take more than prescribed, contact NHS 111.

## Get urgent help if

Get urgent help for an erection lasting more than 3 to 4 hours, chest pain, heart palpitations, sudden problems with your hearing or sight, or signs of a serious allergic reaction. See [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.nhsTadalafil, SOURCES.nhsPriapism],
  },
  {
    slug: "guides/first-consultation",
    title: "Your first ED consultation",
    summary: "Whether with your GP or an online pharmacy, an ED consultation asks about your health and medicines so a prescriber can decide if treatment is safe for you.",
    keyFacts: [
      "Expect questions about your heart, blood pressure, other conditions and medicines.",
      "Answer honestly. Your safety depends on it.",
      "Online pharmacies may check your ID and may ask to inform your GP.",
      "Your GP may be able to prescribe some ED medicines on the NHS.",
    ],
    body: `## What you'll be asked

A prescriber needs enough information to decide whether an ED medicine is safe for you. You'll usually be asked about:

- how long you've had erection problems
- heart problems, blood pressure, stroke, and any chest pain
- other health conditions
- every medicine you take, including ones you buy and recreational drugs

## Online consultations

Online pharmacies usually use a detailed questionnaire, which a prescriber reviews. They may check your identity and may ask for your consent to tell your GP. A genuine service will turn down or question requests where treatment may not be safe.

## NHS or private

You can see your GP or a sexual health clinic on the NHS. ${reviewerNote("Confirm current NHS prescribing position for generic sildenafil/tadalafil before approval.")} Private online pharmacies charge for the medicine and sometimes for the consultation. Our [price comparison](/ed/compare) shows those costs together.

## Checking the pharmacy

Make sure an online pharmacy is registered. See [choosing an ED pharmacy](/ed/guides/choosing-a-pharmacy).`,
    sources: [SOURCES.nhsEd, SOURCES.fakeMeds],
  },
  {
    slug: "guides/choosing-a-pharmacy",
    title: "Choosing an online ED pharmacy",
    summary: "Buy ED medicines only from a registered pharmacy that runs a proper consultation. Here's how to check, and what else to compare.",
    keyFacts: [
      "Check a pharmacy in Great Britain is on the GPhC register before you buy.",
      "Prescription ED medicines should only be supplied after a consultation.",
      "Fake medicines bought online can harm your health.",
      "Compare the total cost, including delivery and consultation fees.",
    ],
    body: `## Check it's registered

In Great Britain, pharmacies must be registered with the General Pharmaceutical Council (GPhC). You can search the [GPhC register](https://www.pharmacyregulation.org/registers) using the registration number, which is usually in the website's footer. In Northern Ireland, pharmacies are regulated by the PSNI.

## Look for a real consultation

Prescription medicines should only be supplied after a prescriber has reviewed your health information. Be wary of any website that sells prescription ED medicines without asking about your health.

## Watch for fakes

The MHRA warns that fake medicines bought online can fail to work, make you ill or contain dangerous ingredients. Websites that seem too cheap, or that don't ask questions, are a warning sign.

## Compare the whole cost

A low tablet price can hide delivery or consultation charges. Our [comparison](/ed/compare) adds known fees together and shows the price per tablet. Every pharmacy in our directory has had its registration checked. See [how we verify pharmacies](/ed/pharmacies/verification).`,
    sources: [SOURCES.gphc, SOURCES.fakeMeds],
  },
  {
    slug: "guides/travel-and-delivery",
    title: "Travel, delivery and storing ED medicines",
    summary: "How to travel with prescription ED medicines, what to expect from delivery, and how to store them.",
    keyFacts: [
      "Keep medicines in their original, labelled pharmacy packaging.",
      "Carry a copy of your prescription or a letter from your prescriber.",
      "Pack medicines in your hand luggage.",
      "Check the rules of the country you're visiting before you go.",
    ],
    body: `## Travelling abroad

UK travel health guidance recommends:

- keeping medicines correctly labelled in their original pharmacy packaging
- carrying a copy of your prescription, or a letter from your prescriber listing the medicines by their generic names
- packing medicines in your hand luggage, with a backup supply in checked luggage in case a bag is lost
- checking the medicine is allowed in the countries you're visiting, as the rules can differ from the UK's

## Delivery

Online pharmacies deliver in different ways and at different speeds. Many say they use plain packaging. Check the pharmacy's delivery page for timings, tracking and any charges, as these can change the total you pay.

## Storage

Store medicines as the patient information leaflet describes, out of the sight and reach of children. ${reviewerNote("Add specific storage conditions only from the SPC/PIL.")}`,
    sources: [SOURCES.travel],
  },
  {
    slug: "guides/managing-treatment",
    title: "Managing ED treatment",
    summary: "Repeat prescriptions, switching pharmacy, and what to do if treatment isn't working. Always through your prescriber, never by changing the dose yourself.",
    keyFacts: [
      "Don't take more than prescribed if a medicine doesn't seem to work. Speak to your prescriber.",
      "Tell any new pharmacy about your full medical history.",
      "Never share prescription medicines with someone else.",
      "Report side effects to your prescriber.",
    ],
    body: `## If it doesn't seem to work

ED medicines need sexual arousal to work, and it can take a few attempts to find what works for you. If treatment isn't working, don't take extra tablets. Taking more than prescribed can be dangerous. Speak to your prescriber, who may review the medicine, strength or timing.

## Repeat prescriptions

Online pharmacies usually ask you to review your health information again before a repeat supply. Tell them about any new medicines or health changes.

## Switching pharmacy

You can change pharmacy. A new pharmacy will carry out its own consultation, so give it your full, accurate history, including what you've taken before and how it went.

## Side effects

Tell your prescriber about side effects that bother you or don't go away. See [common side effects](/ed/side-effects/common) and [urgent warning signs](/ed/side-effects/urgent-warning-signs).`,
    sources: [SOURCES.nhsSildenafil, SOURCES.nhsTadalafil],
  },
  {
    slug: "guides/news",
    title: "ED medicine news and safety alerts",
    summary: "Safety alerts and news about ED medicines, including warnings about fake medicines sold online.",
    keyFacts: [
      "Fake ED medicines are sold online and can be dangerous.",
      "Buy only from registered pharmacies.",
      "Check a pharmacy in Great Britain on the GPhC register.",
    ],
    body: `## Fake medicines sold online

The MHRA's #FakeMeds campaign warns that fake medical products bought online can seriously harm your health. They may not work, may make you ill, or may contain dangerous ingredients. Fake websites can also put your money and identity at risk.

To stay safe, buy only from verified sources. In Great Britain, check that an online pharmacy is on the GPhC register before buying.

${reviewerNote("This page is intended to carry dated news items (MHRA alerts, guidance updates, supply news). Add each item with its date and source link.")}`,
    sources: [SOURCES.fakeMeds, SOURCES.gphc],
  },
];
