export type CandidateForClassification = {
  gphcNumber: string;
  tradingName: string;
  premisesType: string | null;
  distanceSellingSignal: string;
  address?: { postcode?: string | null };
};

export type ReviewedDecision = {
  gphcNumber: string;
  pharmacyName: string;
  status: "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW";
  officialWebsite: string | null;
  officialProductUrl: string | null;
  listedProductOrTreatment: string | null;
  phone: string | null;
  deliveryOptions: string | null;
  evidenceUrls: string[];
  reason: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  followUpGoogleQuery: string | null;
  classification?: {
    version?: 2;
    publicListing: "DIRECT_URL_REPORTED" | "SHOP_CLAIM_NO_DIRECT_URL" | "NO_DIRECT_URL";
    erectileDysfunction: "DIRECT_LISTING_REPORTED" | "MENTIONED_NO_DIRECT_URL" | "NOT_CONFIRMED";
    listingBreadth: "SINGLE_TREATMENT_EXAMPLE" | "MULTIPLE_TREATMENT_EXAMPLES" | "UNKNOWN";
    treatmentAreas: Array<keyof typeof treatmentPatterns>;
    listedExamples: string[];
    purchaseJourney?: "DIRECT_CHECKOUT" | "CONSULTATION_FIRST" | "PRESCRIPTION_REQUEST_ONLY" | "UNKNOWN";
    fulfilmentMethods?: Array<"HOME_DELIVERY" | "CLICK_AND_COLLECT" | "LOCAL_COURIER">;
    deliveryCoverage?: "UK_WIDE" | "REGIONAL" | "LOCAL" | "UNKNOWN";
    medicineSupply?: Array<"NHS_PRESCRIPTIONS" | "PRIVATE_PRESCRIPTIONS" | "OVER_THE_COUNTER">;
    orderChannels?: Array<"WEBSITE" | "APP" | "PHONE">;
    priceVisibility?: "PUBLIC_PRICE_SHOWN" | "NOT_CONFIRMED";
    evidenceUrlsByLabel: Record<string, string[]>;
  };
};

export type LatestReview = {
  sourceGoogleSequence: number;
  checkedAt: string;
  decision: ReviewedDecision;
};

const treatmentPatterns = {
  ERECTILE_DYSFUNCTION: /\berectile dysfunction\b|\b(?:sildenafil|tadalafil|vardenafil|avanafil|viagra|cialis)\b/i,
  WEIGHT_MANAGEMENT: /\bweight (?:loss|management)\b|\b(?:wegovy|mounjaro|orlistat)\b/i,
  HAIR_LOSS: /\bhair loss\b|\b(?:finasteride|minoxidil)\b/i,
  MIGRAINE: /\bmigraine\b/i,
  TRAVEL_HEALTH: /\bmalaria\b|\btravel(?:er'?s)? (?:health|diarrh[oe]a|sickness)\b|\bjet lag\b/i,
  ALLERGY: /\bhay fever\b|\ballerg(?:y|ies)\b/i,
  WOMENS_HEALTH: /\bthrush\b|\bcystitis\b|\bcontraception\b/i,
  COLD_SORES: /\bcold sores?\b/i,
} as const;

export function classifyDistanceSellingCandidate(candidate: CandidateForClassification, review?: LatestReview) {
  const decision = review?.decision;
  const explicit = decision?.classification;
  const usableExplicit = decision?.status === "NEEDS_REVIEW" ? undefined : explicit;
  const directListing = decision?.status === "ACCEPTED" && Boolean(decision.officialProductUrl);
  const examples = directListing
    ? (decision?.listedProductOrTreatment ?? "").split(";").map(item => item.trim()).filter(Boolean)
    : [];
  const treatmentAreas = directListing
    ? Object.entries(treatmentPatterns).filter(([, pattern]) => pattern.test(examples.join("; "))).map(([label]) => label)
    : [];
  const shopClaimWithoutUrl = Boolean(decision && !directListing &&
    (/\b(?:advertises?|offers?|provides?|has|features)\b[^.]{0,70}\bonline shop(?:ping)?\b|\bonline shopping with\b|\bshop online\b/i.test(decision.reason) ||
      /\b\d[\d,]*\+?\s+items\b/i.test(decision.reason)));
  const listingStatusKey = Object.entries({
    unresearched: !decision,
    direct: directListing,
    shopClaim: shopClaimWithoutUrl,
    noDirectUrl: true,
  }).find(([, matches]) => matches)?.[0] ?? "noDirectUrl";
  const listingStatus = {
    unresearched: "UNRESEARCHED",
    direct: "DIRECT_URL_REPORTED",
    shopClaim: "SHOP_CLAIM_NO_DIRECT_URL",
    noDirectUrl: "NO_DIRECT_URL",
  }[listingStatusKey as "unresearched" | "direct" | "shopClaim" | "noDirectUrl"];
  const listingBreadth = {
    0: "UNKNOWN",
    1: "SINGLE_TREATMENT_EXAMPLE",
    2: "MULTIPLE_TREATMENT_EXAMPLES",
  }[Math.min(examples.length, 2) as 0 | 1 | 2];
  const distanceEvidenceKey = Object.entries({
    internet: candidate.premisesType?.toLowerCase() === "internet",
    logo: candidate.distanceSellingSignal === "SUPPORTING",
    other: true,
  }).find(([, matches]) => matches)?.[0] ?? "other";
  const distanceSellingEvidence = {
    internet: "GPHC_INTERNET_PREMISES",
    logo: "GPHC_INTERNET_LOGO",
    other: "OTHER_SIGNAL",
  }[distanceEvidenceKey as "internet" | "logo" | "other"];
  const classificationSourceKey = Object.entries({
    unresolved: decision?.status === "NEEDS_REVIEW",
    structured: Boolean(explicit),
    legacy: Boolean(decision),
    unresearched: true,
  }).find(([, matches]) => matches)?.[0] ?? "unresearched";
  const classificationSource = {
    unresolved: "CHATGPT_UNRESOLVED",
    structured: "CHATGPT_STRUCTURED",
    legacy: "LEGACY_INFERRED",
    unresearched: "UNRESEARCHED",
  }[classificationSourceKey as "unresolved" | "structured" | "legacy" | "unresearched"];
  const classifiedEd = usableExplicit?.erectileDysfunction ??
    (treatmentAreas.includes("ERECTILE_DYSFUNCTION") ? "LISTED_IN_REVIEWED_EXAMPLES" : "NOT_CONFIRMED");

  return {
    gphcNumber: candidate.gphcNumber,
    pharmacyName: candidate.tradingName,
    postcode: candidate.address?.postcode ?? null,
    premisesType: candidate.premisesType,
    distanceSellingSignal: candidate.distanceSellingSignal,
    researchStatus: decision?.status ?? "UNRESEARCHED",
    categories: {
      distanceSellingEvidence,
      publicListing: decision?.status === "NEEDS_REVIEW" ? "NO_DIRECT_URL" : usableExplicit?.publicListing ?? listingStatus,
      erectileDysfunction: decision?.status === "NEEDS_REVIEW" ? "NOT_CONFIRMED" : classifiedEd,
      listingBreadth: decision?.status === "NEEDS_REVIEW" ? "UNKNOWN" : usableExplicit?.listingBreadth ?? listingBreadth,
      treatmentAreas: decision?.status === "NEEDS_REVIEW" ? [] : usableExplicit?.treatmentAreas ?? treatmentAreas,
      listedExampleCount: decision?.status === "NEEDS_REVIEW" ? 0 : usableExplicit?.listedExamples.length ?? examples.length,
      needsManualReview: explicit ? explicit.publicListing === "SHOP_CLAIM_NO_DIRECT_URL" || decision?.status === "NEEDS_REVIEW" : shopClaimWithoutUrl || decision?.status === "NEEDS_REVIEW",
      purchaseJourney: usableExplicit?.purchaseJourney ?? "UNKNOWN",
      fulfilmentMethods: usableExplicit?.fulfilmentMethods ?? [],
      deliveryCoverage: usableExplicit?.deliveryCoverage ?? "UNKNOWN",
      medicineSupply: usableExplicit?.medicineSupply ?? [],
      orderChannels: usableExplicit?.orderChannels ?? [],
      priceVisibility: usableExplicit?.priceVisibility ?? "NOT_CONFIRMED",
      evidenceUrlsByLabel: usableExplicit?.evidenceUrlsByLabel ?? {},
      classificationSource,
      classificationSchemaVersion: explicit?.version ?? (explicit ? 1 : null),
    },
    sourceGoogleSequence: review?.sourceGoogleSequence ?? null,
    checkedAt: review?.checkedAt ?? null,
    decision: decision ?? null,
  };
}
