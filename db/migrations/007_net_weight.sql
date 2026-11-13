-- 007: gross vs net weight.
-- A pack's label weight is not always what goes into the dish: canned tuna is weighed with its oil, bone-in chicken
-- includes bone. Recipe quantities mean USABLE weight, so prices per gram must be computed on usable weight.
--   product.usable_qty        usable weight of the whole pack (e.g. drained weight), in pack_unit. Wins when known.
--   ingredient.usable_fraction fallback share of the pack that is usable, for products without usable_qty (1 = all of it)
-- The values the scraper sets are PLACEHOLDERS from typical yields and must be checked against pack labels.

alter table public.ingredient
  add column usable_fraction numeric not null default 1 check (usable_fraction > 0 and usable_fraction <= 1),
  add column usable_note text;

alter table public.product
  add column usable_qty numeric check (usable_qty > 0),
  add column usable_source text check (usable_source in ('label','rule','manual')),
  add constraint product_usable_within_pack check (usable_qty is null or usable_qty <= pack_qty);

-- same columns as before; only price_per_base_unit changes, now per USABLE unit
create or replace view public.product_price_today with (security_invoker = true) as
select p.id as product_id, p.chain_id, p.ingredient_id, p.name, p.pack_qty, p.pack_unit,
  rp.price as regular_price, pr.promo_price, pr.requires_loyalty_card, pr.deal_text, pr.ends_on as promo_ends_on,
  coalesce(pr.promo_price, rp.price) as effective_price,
  coalesce(pr.promo_price, rp.price) / coalesce(p.usable_qty, p.pack_qty * coalesce(i.usable_fraction, 1)) as price_per_base_unit
from public.product p
left join public.ingredient i on i.id = p.ingredient_id
left join lateral (
  select x.price from public.product_price x
  where x.product_id = p.id
    and x.valid_from <= (now() at time zone 'Europe/Lisbon')::date
    and (x.valid_to is null or x.valid_to >= (now() at time zone 'Europe/Lisbon')::date)
  order by x.valid_from desc limit 1) rp on true
left join lateral (
  select q.promo_price, q.requires_loyalty_card, q.deal_text, w.ends_on
  from public.promotion q join public.promotion_window w on w.promotion_id = q.id
  where q.product_id = p.id
    and w.starts_on <= (now() at time zone 'Europe/Lisbon')::date
    and w.ends_on >= (now() at time zone 'Europe/Lisbon')::date
  order by q.promo_price limit 1) pr on true
where p.active and coalesce(pr.promo_price, rp.price) is not null;

-- placeholder fallbacks (verify against labels)
update public.ingredient set usable_fraction = 0.7,  usable_note = 'Canned tuna: label weight includes oil or brine; drained weight is roughly 70% (placeholder, check labels)' where slug = 'tuna';
update public.ingredient set usable_fraction = 0.65, usable_note = 'Bone-in cut: edible share roughly 65% (placeholder)' where slug in ('chicken-thighs', 'chicken-drumsticks');
