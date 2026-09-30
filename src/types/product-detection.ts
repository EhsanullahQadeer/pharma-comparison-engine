import type { Ingredient } from "@/generated/prisma/client";

// A same-site link found on a pharmacy page: its address and the text shown on it.
export type PageLink = { url: string; text: string };

// How a pharmacy's site was read: a plain request, or the Chrome window when that was blocked or
// found nothing.
export type ProductDetectionMethod = "http" | "browser";

// One strength/pack option a product page offers with an exact price (detection's per-page read),
// described the way a catalogue variant is: product, branded or generic, strength, pack and form.
export type OfferedOption = {
  ingredient: Ingredient;
  brandName: string;
  generic: boolean;
  strengthMg: number;
  packQuantity: number;
  orodispersible: boolean;
  itemPricePence: number;
};
