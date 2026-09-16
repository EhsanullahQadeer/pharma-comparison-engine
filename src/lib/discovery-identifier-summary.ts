type IdentifierFields = {
  companyNumber: string | null;
  cqcLocationId: string | null;
  odsCode: string | null;
  gphcNumber: string | null;
};

// Shared by the review-queue table and the "Run now" result panel — both list which hard
// identifiers a discovered candidate carries.
export function identifierSummary(item: IdentifierFields): string {
  const found = [
    item.companyNumber && `Company no. ${item.companyNumber}`,
    item.cqcLocationId && `CQC ${item.cqcLocationId}`,
    item.odsCode && `ODS ${item.odsCode}`,
    item.gphcNumber && `GPhC ${item.gphcNumber}`,
  ].filter(Boolean);
  return found.length > 0 ? found.join(", ") : "None found";
}
