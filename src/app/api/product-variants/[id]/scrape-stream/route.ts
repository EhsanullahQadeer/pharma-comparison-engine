import { revalidatePath } from "next/cache";

import { runVariantScrape } from "@/lib/price-collection/run-variant-scrape";
import { requireStaffRole } from "@/lib/staff-auth";

// Server-Sent Events endpoint behind ProductVariantPriceActions' live progress panel — a plain
// server action can only return once, so this Route Handler streams runVariantScrape's onProgress
// callback out as it happens instead. GET (not POST) so the client can use a native EventSource,
// which sends the staff session cookie automatically for this same-origin request.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      function send(event: string, data: unknown) {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }
      try {
        const result = await runVariantScrape(id, staffUser.id, (message) => send("progress", { message }));
        revalidatePath("/admin/catalogue/product-variants");
        revalidatePath(`/admin/catalogue/product-variants/${id}/prices`);
        send("done", result);
      } catch (error) {
        // Named "scrape-error", not "error" — EventSource treats any SSE event whose `event:`
        // field is literally "error" as equivalent to a connection failure (dispatched to the same
        // onerror/addEventListener("error") handlers as a real network drop), so a distinct name
        // keeps expected scrape failures (e.g. "no price found") from being confused with one.
        send("scrape-error", { message: error instanceof Error ? error.message : "Scrape failed." });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
