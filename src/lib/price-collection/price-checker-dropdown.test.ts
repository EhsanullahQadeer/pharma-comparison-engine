import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "patchright";

import { readPriceCheckerDropdown } from "./price-checker-dropdown";

// Trimmed copy of a live Treated "Price checker": only the default strength's packs are in the page;
// choosing another strength refills the Quantity list (the live page fetches it from its own endpoint).
// Like the live page, the checker appears twice (desktop + mobile copy).
const packs: Record<string, [string, string, boolean?][]> = {
  "25mg": [["4 Tablets", "38.95"], ["8 Tablets", "61.95"]],
  "50mg": [["4 Tablets", "43.95"], ["8 Tablets", "75.95"]],
  "100mg": [["4 Tablets", "45.95"], ["8 Tablets", "78.95", true]],
};

function checkerPage(title: string) {
  const rows = (strength: string) => packs[strength].map(([quantity, price, oos]) => `<li><span class="quantity">${quantity} ${oos ? "Out of stock" : ""}</span><span class="price"><strong data-price="${price}">£${price}</strong></span></li>`).join("");
  return `<h1>${title}</h1>
    <div class="single-price-checker">
      <div class="dropdown-list single-doses-list"><ul class="options">
        ${Object.keys(packs).map((strength, index) => `<li class="${index === 0 ? "active" : ""}"><span class="quantity">${strength}</span></li>`).join("")}
      </ul></div>
      <div class="dropdown-list single-doses-price-list"><ul class="options">${rows("25mg")}</ul></div>
    </div>
    <div class="single-price-checker mobile-copy">
      <div class="dropdown-list single-doses-list"><ul class="options">${Object.keys(packs).map((strength) => `<li><span class="quantity">${strength}</span></li>`).join("")}</ul></div>
      <div class="dropdown-list single-doses-price-list"><ul class="options">${rows("25mg")}</ul></div>
    </div>
    <script>
      const packs = ${JSON.stringify(packs)};
      const rows = ${rows.toString()};
      document.querySelectorAll(".single-price-checker:not(.mobile-copy) .single-doses-list li").forEach((li) => li.addEventListener("click", () => {
        li.parentElement.querySelectorAll("li").forEach((other) => other.classList.remove("active"));
        li.classList.add("active");
        setTimeout(() => { document.querySelector(".single-price-checker .single-doses-price-list ul").innerHTML = rows(li.textContent.trim()); }, 300);
      }));
    </script>`;
}

test("chooses the exact strength, waits for its packs and reads the matching pack's price", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(checkerPage("Viagra"));
    const tokens = ["viagra", "sildenafil"];
    const fifty = await readPriceCheckerDropdown(page, tokens, { strengthMg: 50, packQuantity: 4, generic: false });
    assert.equal(fifty?.itemPricePence, 4395);
    assert.equal(fifty?.availability, "IN_STOCK");
    const hundredEight = await readPriceCheckerDropdown(page, tokens, { strengthMg: 100, packQuantity: 8, generic: false });
    assert.equal(hundredEight?.itemPricePence, 7895);
    assert.equal(hundredEight?.availability, "OUT_OF_STOCK");
    // Default (already active) strength is read without a click.
    await page.setContent(checkerPage("Viagra"));
    assert.equal((await readPriceCheckerDropdown(page, tokens, { strengthMg: 25, packQuantity: 4, generic: false }))?.itemPricePence, 3895);
  } finally {
    await browser.close();
  }
});

test("keeps branded and generic pages apart and refuses unknown strengths", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const tokens = ["viagra", "sildenafil"];
    await page.setContent(checkerPage("Sildenafil"));
    assert.equal(await readPriceCheckerDropdown(page, tokens, { strengthMg: 25, packQuantity: 4, generic: false }), undefined);
    assert.equal((await readPriceCheckerDropdown(page, tokens, { strengthMg: 25, packQuantity: 4, generic: true }))?.itemPricePence, 3895);
    await page.setContent(checkerPage("Viagra"));
    assert.equal(await readPriceCheckerDropdown(page, tokens, { strengthMg: 25, packQuantity: 4, generic: true }), undefined);
    assert.equal(await readPriceCheckerDropdown(page, tokens, { strengthMg: 75, packQuantity: 4, generic: false }), undefined);
  } finally {
    await browser.close();
  }
});

// Trimmed from Treated's Viagra Connect page: one strength, shown as a read-only field with no list.
const singleStrengthPage = `<h1>Viagra Connect</h1>
  <div class="single-price-checker">
    <div class="form-group" data-dl="dosage"><input type="text" value="50mg" readonly="readonly" name="strength" placeholder="Strength:"></div>
    <div class="dropdown-list single-doses-price-list"><ul class="options">
      <li class="active"><span class="quantity">4 Tablets </span><span class="price"><strong data-price="39.95">£39.95</strong></span></li>
      <li><span class="quantity">8 Tablets </span><span class="price"><strong data-price="69.95">£69.95</strong><span>Save <span class="you-saved" data-price="9.95">£9.95</span></span></span></li>
    </ul></div>
  </div>`;

test("reads a checker with one fixed strength and no strength list", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(singleStrengthPage);
    const connect = ["viagra connect", "sildenafil", "viagra"];
    assert.equal((await readPriceCheckerDropdown(page, connect, { strengthMg: 50, packQuantity: 4, generic: false }))?.itemPricePence, 3995);
    assert.equal((await readPriceCheckerDropdown(page, connect, { strengthMg: 50, packQuantity: 8, generic: false }))?.itemPricePence, 6995);
    // Not a pack it sells, and never prescription Viagra.
    assert.equal(await readPriceCheckerDropdown(page, connect, { strengthMg: 50, packQuantity: 16, generic: false }), undefined);
    assert.equal(await readPriceCheckerDropdown(page, ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4, generic: false }), undefined);
  } finally {
    await browser.close();
  }
});
