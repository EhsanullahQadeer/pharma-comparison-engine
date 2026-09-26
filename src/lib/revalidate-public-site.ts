import { revalidatePath } from "next/cache";

// Every public /ed page (directory, comparison, prices, partner disclosure) under the (site)
// layout. The route group must be part of the path: revalidatePath("/ed", "layout") matches no
// layout file here, so it silently left statically cached pages stale until their 5-minute timer.
export function revalidatePublicSite() {
  revalidatePath("/(site)/ed", "layout");
}
