import assert from "node:assert/strict";
import { test } from "node:test";

import { chromium } from "playwright";

import { pickStructuredPrice, readProductCard } from "./product-price";

test("structured prices require a matching product and GBP currency", () => {
  const product = (name: string, price: unknown, priceCurrency = "GBP") => ({
    "@type": "Product", name, offers: { price, priceCurrency },
  });
  assert.equal(pickStructuredPrice([{ "@type": "Offer", price: 3.99 }, product("Tadalafil", 2.99)], ["viagra"]), null);
  assert.equal(pickStructuredPrice([product("Viagra", 4.99, "USD")], ["viagra"]), null);
  assert.equal(pickStructuredPrice([product("Viagra", 4.99)], ["viagra"]), "£4.99");
  assert.equal(pickStructuredPrice([product("Viagra", 4.99), product("Viagra", 9.99)], ["viagra"]), null);
});

test("product cards separate postage, generic references, and dynamic prices", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<section>
      <div><h3>Sildenafil</h3><p>Generic Viagra</p><p>From £1.00/pill</p></div>
      <div><h3>Viagra</h3><p>The original.</p><p id="price"></p></div>
      <p>Postage and packaging cost is <span>£3.99</span></p>
    </section>`);
    assert.equal((await readProductCard(page, ["viagra"])).latestPrice, null);
    await page.locator("#price").evaluate(element => { element.textContent = "From £4.99/pill"; });
    const result = await readProductCard(page, ["viagra"]);
    assert.equal(result.latestPrice, "£4.99");
    assert.equal(result.deliveryPrice, "£3.99");
    assert.equal(result.priceBasis, "from (per pill)");
  } finally {
    await browser.close();
  }
});
