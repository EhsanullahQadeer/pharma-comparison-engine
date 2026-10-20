import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import ts from "typescript";

// Milestone 8 permission boundary: every export of a "use server" module is a callable endpoint,
// so each one must check the staff role (requireStaffRole/getStaffUser, directly or via a helper in
// the same file) unless it is deliberately public and listed here with the reason.
const intentionallyPublic: Record<string, string> = {
  "articles/articles.ts#getPublishedArticle": "public read of reviewed, published articles",
  "articles/articles.ts#getPublishedArticleSummaries": "public read of reviewed, published articles",
  "articles/articles.ts#getPublishedArticleSitemapEntries": "sitemap generation",
  "auth/sign-in.ts#staffSignIn": "the login itself",
  "auth/sign-out.ts#staffSignOut": "ends the caller's own session",
  "offers/public-offers.ts#getPublicOffers": "public comparison: published offers of PUBLISHED providers only",
  "price-alerts/price-alerts.ts#createPriceAlert": "public sign-up: validated, rate-limited, double opt-in by email",
  "price-alerts/price-alerts.ts#getPriceAlertByToken": "acts only through the alert's own secret token",
  "price-alerts/price-alerts.ts#confirmPriceAlert": "acts only through the alert's own secret token",
  "price-alerts/price-alerts.ts#deletePriceAlert": "acts only through the alert's own secret token",
  "offers/public-offers.ts#getPublicPriceHistory": "public price history: published offers of PUBLISHED providers only, capped request size",
  "providers/public-providers.ts#getPublicProviders": "public directory: PUBLISHED providers only",
  "providers/public-providers.ts#getPublicProvider": "public profile: PUBLISHED providers only",
  "providers/public-providers.ts#getPublicDirectoryStats": "public counts only",
  "submissions/public-submissions.ts#submitPharmacySuggestion": "public form, validated and rate-limited",
  "submissions/public-submissions.ts#submitContactMessage": "public form, validated and rate-limited",
  "submissions/public-submissions.ts#submitCorrectionRequest": "public form, validated and rate-limited",
};

const actionsDir = join(process.cwd(), "src", "actions");
const staffChecks = new Set(["requireStaffRole", "getStaffUser"]);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

function calledNames(node: ts.Node) {
  const names = new Set<string>();
  const visit = (child: ts.Node) => {
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) names.add(child.expression.text);
    child.forEachChild(visit);
  };
  visit(node);
  return names;
}

// Exported functions of one "use server" file that never reach a staff check.
function unguardedExports(path: string) {
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const isServerModule = source.statements[0] && ts.isExpressionStatement(source.statements[0])
    && ts.isStringLiteral(source.statements[0].expression) && source.statements[0].expression.text === "use server";
  if (!isServerModule) return [];

  const functions = new Map<string, { body: ts.Node; exported: boolean }>();
  for (const statement of source.statements) {
    const exported = Boolean(ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
    if (ts.isFunctionDeclaration(statement) && statement.name) functions.set(statement.name.text, { body: statement, exported });
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) functions.set(declaration.name.text, { body: declaration.initializer, exported });
      }
    }
  }

  // A function is guarded if it calls a staff check, or a same-file function that is guarded.
  const guarded = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    for (const [name, { body }] of functions) {
      if (guarded.has(name)) continue;
      if ([...calledNames(body)].some((called) => staffChecks.has(called) || guarded.has(called))) {
        guarded.add(name);
        changed = true;
      }
    }
  }
  return [...functions].filter(([name, { exported }]) => exported && !guarded.has(name)).map(([name]) => name);
}

const unguarded = listFiles(actionsDir).flatMap((path) => {
  const relative = path.slice(actionsDir.length + 1).split("\\").join("/");
  return unguardedExports(path).map((name) => `${relative}#${name}`);
});

test("every server action checks the staff role unless it is deliberately public", () => {
  const unexpected = unguarded.filter((key) => !(key in intentionallyPublic));
  assert.deepEqual(unexpected, [], "Add a requireStaffRole check, move the helper to a non-\"use server\" module, or list it in intentionallyPublic with a reason.");
});

test("the public allowlist has no stale entries", () => {
  const stale = Object.keys(intentionallyPublic).filter((key) => !unguarded.includes(key));
  assert.deepEqual(stale, [], "These are no longer unguarded exports; remove them from intentionallyPublic.");
});
