// Trustpilot scores are only shown once their terms for third-party display have been checked
// (client decision, ed-price-grid-brief). Until SHOW_TRUSTPILOT_SCORES=true the public site links
// to each pharmacy's Trustpilot page instead, and the score never leaves the server.
export function showTrustpilotScores() {
  return process.env.SHOW_TRUSTPILOT_SCORES === "true";
}

export function formatTrustpilotScore(tenths: number) {
  return (tenths / 10).toFixed(1);
}
