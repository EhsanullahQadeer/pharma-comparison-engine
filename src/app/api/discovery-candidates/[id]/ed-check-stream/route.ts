import { revalidatePath } from "next/cache";

import { runCandidateEdCheck } from "@/lib/discovery/run-candidate-ed-check";
import { requireStaffRole } from "@/lib/staff-auth";

// Server-Sent Events endpoint behind DiscoveryCandidateEdCheckActions' live progress panel — same
// pattern as app/api/product-variants/[id]/scrape-stream: a plain server action can only return
// once, so this streams runCandidateEdCheck's onProgress callback out as it happens instead. GET
// (not POST) so the client can use a native EventSource, which sends the staff session cookie
// automatically for this same-origin request; humanAssist rides along as a query param since
// EventSource can't send a request body.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const humanAssist = new URL(request.url).searchParams.get("assisted") === "true";

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
        const result = await runCandidateEdCheck(id, humanAssist, staffUser.id, (message) => send("progress", { message }));
        revalidatePath("/admin/reviews");
        send("done", result);
      } catch (error) {
        // Named "check-error", not "error" — EventSource treats any SSE event whose `event:` field
        // is literally "error" as equivalent to a connection failure (dispatched to the same
        // onerror/addEventListener("error") handlers as a real network drop), so a distinct name
        // keeps expected check failures from being confused with one.
        send("check-error", { message: error instanceof Error ? error.message : "Check failed." });
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
