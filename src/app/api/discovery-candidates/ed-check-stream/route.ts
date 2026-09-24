import { revalidatePath } from "next/cache";

import { runBacklogEdCheck } from "@/lib/discovery/run-candidate-backlog-ed-check";
import { requireStaffRole } from "@/lib/staff-auth";

// Server-Sent Events endpoint behind DiscoveryCandidatesBacklogCheckActions' page-level "Filter for
// ED medicine"/"Human filter" buttons — same streaming pattern as the single-row
// app/api/discovery-candidates/[id]/ed-check-stream and app/api/product-variants/[id]/scrape-stream:
// a plain server action can only return once, so this streams runBacklogEdCheck's onProgress
// callback out as it happens instead, across the whole NEW backlog rather than one candidate.
export async function GET(request: Request) {
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
        const result = await runBacklogEdCheck(humanAssist, staffUser.id, (message) => send("progress", { message }));
        revalidatePath("/admin/reviews");
        send("done", result);
      } catch (error) {
        // Named "check-error", not "error" — EventSource treats any SSE event whose `event:` field
        // is literally "error" as equivalent to a connection failure.
        send("check-error", { message: error instanceof Error ? error.message : "Filter run failed." });
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
