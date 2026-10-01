import assert from "node:assert/strict";
import test from "node:test";

import { pageText, readDeliveryPolicy, readDiscountOffers } from "./site-offers";

test("page text keeps one block per line and drops scripts", () => {
  const html = "<div><p>Delivery from <strong>&pound;3.99</strong></p><script>var price = '£1.00 delivery';</script><li>Free delivery over &pound;40</li><li>Royal Mail Tracked 24&reg; &pound;3.99</li></div>";
  assert.equal(pageText(html), "Delivery from £3.99\nFree delivery over £40\nRoyal Mail Tracked 24 £3.99");
});

test("the cheapest standard delivery charge is read with its free-delivery threshold", () => {
  const policy = readDeliveryPolicy([
    "Royal Mail Tracked 48 - £2.95",
    "Royal Mail Special Delivery Guaranteed by 1pm - £6.95",
    "Free standard delivery on orders over £40.",
  ].join("\n"));
  assert.equal(policy?.standardFeePence, 295);
  assert.equal(policy?.freeOverPence, 4000);
  assert.match(policy?.evidenceText ?? "", /Tracked 48/);
});

test("a spending threshold is never mistaken for the delivery charge", () => {
  assert.equal(readDeliveryPolicy("Free delivery when you spend over £35"), undefined);
  const policy = readDeliveryPolicy("Standard delivery costs £3.49. Free delivery on orders over £35.");
  assert.deepEqual([policy?.standardFeePence, policy?.freeOverPence], [349, 3500]);
});

test("product rows and next-day-only prices are not taken as standard delivery", () => {
  assert.equal(readDeliveryPolicy("Sildenafil 50mg 4 tablets £14.99 with free delivery"), undefined);
  assert.equal(readDeliveryPolicy("Next day delivery £5.99")?.standardFeePence, 599);
  assert.equal(readDeliveryPolicy("Next day delivery £5.99\nStandard delivery £3.20")?.standardFeePence, 320);
});

test("free delivery on all orders is a zero charge", () => {
  assert.deepEqual(readDeliveryPolicy("We offer free tracked delivery on all orders."), {
    standardFeePence: 0,
    freeOverPence: null,
    evidenceText: "We offer free tracked delivery on all orders.",
  });
  // Well's banner: free only above a spending level, and the charge below it isn't stated.
  assert.equal(readDeliveryPolicy("Get free standard delivery on all orders over £30 excluding our weight management service"), undefined);
});

test("a discount code is read with its value and who it is for", () => {
  assert.deepEqual(readDiscountOffers("Get 10% off your first order with code WELCOME10 at checkout"), [{
    code: "WELCOME10",
    valueType: "PERCENT",
    valuePercent: 10,
    valuePence: null,
    eligibility: "New customers (first order)",
    evidenceText: "Get 10% off your first order with code WELCOME10 at checkout",
  }]);
  const [fixed] = readDiscountOffers("Save £5 today - use code: SAVE5");
  assert.deepEqual([fixed.code, fixed.valueType, fixed.valuePence, fixed.eligibility], ["SAVE5", "FIXED_AMOUNT", 500, "See the pharmacy's terms"]);
});

test("offers without a code need a stated audience, and repeats are merged", () => {
  assert.deepEqual(readDiscountOffers("Save 20%\nSildenafil 50mg - 20% off"), []);
  const offers = readDiscountOffers("Subscribe and save 15%\nSubscribe and save 15% on repeat orders\nEnter your code below for 10% off");
  assert.equal(offers.length, 1);
  assert.deepEqual([offers[0].code, offers[0].valuePercent, offers[0].eligibility], [null, 15, "Subscription orders"]);
});

test("offers for other services are ignored, and a loyalty reward is not a first-order discount", () => {
  assert.deepEqual(readDiscountOffers("Get £15 off Weight Loss Services using code: HEALTHY15\nSave £10 off your first weight loss consultation with code FIRSTWL10"), []);
  const [loyalty] = readDiscountOffers("LOYALTY REWARD: On Completion of your First Order, Get Exclusive 10% off code for ALL Future Orders");
  assert.deepEqual([loyalty.code, loyalty.valuePercent, loyalty.eligibility], [null, 10, "Returning customers"]);
});
