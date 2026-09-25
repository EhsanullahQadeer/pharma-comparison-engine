import assert from "node:assert/strict";
import test from "node:test";

import { pickBigCommercePrice } from "./bigcommerce-price";

// Shape taken from a live Well Pharmacy product page (BigCommerce), trimmed.
function wellPage(title: string, price: { value: number; currency: string }, instock = true) {
  const bcData = {
    product_attributes: {
      sku: null,
      instock,
      available_to_sell: 195,
      stock_message: "Ships in {1-2} days",
      price: { with_tax: { formatted: `£${price.value.toFixed(2)}`, value: price.value, currency: price.currency }, tax_label: "VAT" },
    },
  };
  return `<html><head><title>${title} | Well Pharmacy</title></head><body>
    <h1 class="productView-title">${title}</h1>
    <script type="text/javascript">var BCData = ${JSON.stringify(bcData)};</script>
  </body></html>`;
}

const url = "https://well.co.uk/viagra-50mg-4-pack-subscription/";

test("reads the embedded price when the product title names the exact strength and pack", () => {
  const price = pickBigCommercePrice(wellPage("Viagra 50mg 4 Pack Subscription", { value: 24, currency: "GBP" }), ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4 }, url);
  assert.equal(price?.itemPricePence, 2400);
  assert.equal(price?.availability, "IN_STOCK");
  assert.equal(price?.source, "bigcommerce-page-data");
  assert.equal(price?.evidence, "Viagra 50mg 4 Pack Subscription");
});

test("rejects a page whose title names a different pack size or strength", () => {
  const html = wellPage("Viagra 50mg 8 Pack Subscription", { value: 49.5, currency: "GBP" });
  assert.equal(pickBigCommercePrice(html, ["viagra"], { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickBigCommercePrice(html, ["viagra"], { strengthMg: 100, packQuantity: 8 }, url), undefined);
});

test("reports out-of-stock and ignores non-GBP or missing BCData", () => {
  const outOfStock = pickBigCommercePrice(wellPage("Sildenafil 100mg 8 Pack Subscription", { value: 23.6, currency: "GBP" }, false), ["sildenafil"], { strengthMg: 100, packQuantity: 8 }, url);
  assert.equal(outOfStock?.itemPricePence, 2360);
  assert.equal(outOfStock?.availability, "OUT_OF_STOCK");
  assert.equal(pickBigCommercePrice(wellPage("Viagra 50mg 4 Pack Subscription", { value: 24, currency: "EUR" }), ["viagra"], { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickBigCommercePrice("<h1 class=\"productView-title\">Viagra 50mg 4 Pack</h1>", ["viagra"], { strengthMg: 50, packQuantity: 4 }, url), undefined);
});

test("without a variant, only needs an ingredient or brand token in the title", () => {
  const html = wellPage("Viagra 50mg 4 Pack Subscription", { value: 24, currency: "GBP" });
  assert.equal(pickBigCommercePrice(html, ["viagra"], undefined, url)?.itemPricePence, 2400);
  assert.equal(pickBigCommercePrice(html, ["cialis"], undefined, url), undefined);
});
