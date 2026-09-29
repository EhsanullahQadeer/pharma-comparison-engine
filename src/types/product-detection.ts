// A same-site link found on a pharmacy page: its address and the text shown on it.
export type PageLink = { url: string; text: string };

// How a pharmacy's site was read: a plain request, or the Chrome window when that was blocked or
// found nothing.
export type ProductDetectionMethod = "http" | "browser";
