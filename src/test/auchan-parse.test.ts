import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePage, promoEnd } from "../../db/scripts/auchan";

describe("auchan scraper", () => {
  it("reads the promotion end date", () => {
    expect(promoEnd("de 07/10/2026 a 31/12/2026")).toBe("2026-12-31");
    expect(promoEnd("")).toBeUndefined();
  });
  const tile = (price: string, was: string | null, name: string, unit: string, date = "") => `<div class="product-tile auc-product-tile auc-js-product-tile " data-pid="123" data-gtm="{&quot;name&quot;:&quot;${name}&quot;,&quot;price&quot;:&quot;${price}&quot;,&quot;brand&quot;:&quot;AUCHAN&quot;}">
    <div class="auc-product-tile__name"><div class="pdp-link"><h3><a class="link" href="/pt/alimentacao/mercearia/arroz-e-massa/arroz/${name}/123.html">${name}</a></h3></div></div>
    <div class="auc-product-tile__measures"><div class="auc-measures"><span class="auc-measures--price-per-unit">${unit}</span></div></div>
    <div class="auc-product-tile__prices"><div class="price"><span>${was ? `<div class="auc-price__stricked"><span class="list"><span class="strike-through value" content="${was}">x</span></span></div>` : ""}
    <span class="sales"> <span class="value" content="${price}"> 0 </span>${date ? `<span class="auc-price__promotion--pdp__date"> ${date} </span>` : ""}</span></span></div></div>`;
  it("parses a plain tile, a promo tile and loose produce", () => {
    const html = tile("0.99", null, "esparguete auchan 1kg", "0.99 €/Kg") + tile("1.50", "2.00", "arroz agulha auchan 1kg", "1.50 €/Kg", "de 01/11/2026 a 30/11/2026").replace('data-pid="123"', 'data-pid="124"') + tile("1.19", null, "cebola a granel", "1.19 €/Kg").replace('data-pid="123"', 'data-pid="125"');
    const { items } = parsePage(html);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ id: "123", price: 0.99, was: null, packQty: 1000, packUnit: "g" });
    expect(items[1]).toMatchObject({ was: 2, price: 1.5, until: "2026-11-30" });
    expect(items[2]).toMatchObject({ packQty: 1000, packUnit: "g" });
  });
  const f = "data/raw/auchan/auchan_cat_mercearia.html";
  it.skipIf(!existsSync(f))("reads the saved category page (24 tiles, none skipped)", () => {
    const r = parsePage(readFileSync(f, "utf8"));
    expect(r.items.length + r.skipped.length).toBe(24);
    expect(r.items.every((i) => i.price > 0 && i.packQty > 0)).toBe(true);
  });
});

describe("auchan loose and dozen", () => {
  const tile = (name: string, price: string, extra = "") => `<div class="product-tile auc-product-tile" data-pid="1" data-gtm="{}"><div class="auc-product-tile__name"><a href="/pt/a/b/c/1.html">${name}</a></div><span class="auc-measures--price-per-unit">1.57 &euro;</span><span class="sales"><span class="value" content="${price}">${price} &euro; ${extra}</span></span></div>`;
  it("prices loose goods per kg", async () => {
    const { parsePage } = await import("../../db/scripts/auchan");
    const r = parsePage(tile("peito de frango kg", "6.29", '<span class="auc-avgWeight">/Kg</span>')).items[0]!;
    expect(r.packQty).toBe(1000); expect(r.price).toBe(6.29);
  });
  it("reads dozens", async () => {
    const { parsePage } = await import("../../db/scripts/auchan");
    expect(parsePage(tile("ovos saborosos classe l uma dúzia", "3.1")).items[0]).toMatchObject({ packQty: 12, packUnit: "piece" });
    expect(parsePage(tile("ovos campo meia dúzia", "1.9")).items[0]).toMatchObject({ packQty: 6 });
  });
});
