-- 009: English names for products, kept in the database (no in-browser translation).
--   term_translation   Portuguese term -> English term. Add a row to teach the database a new word.
--   translate_pt_en()  replaces whole words and phrases, longest first, case-insensitive. Brands and unknown words stay as they are.
--   product.name_en    filled by a trigger whenever a product is inserted or its name changes, unless name_en_source = 'manual'.
--   ingredient.name_pt Portuguese display name (ingredient.name is the English one).
-- Rule translations are readable, not perfect ("Olive Oil Extra Virgin ..." keeps the Portuguese word order). Fix one by hand with:
--   update product set name_en = '...', name_en_source = 'manual' where id = '...';

create table public.term_translation (
  pt text primary key check (pt = lower(pt)),
  en text not null,
  note text
);
alter table public.term_translation enable row level security;
create policy "public read" on public.term_translation for select to anon, authenticated using (true);

insert into public.term_translation (pt, en) values
  ('azeite virgem extra', 'Extra Virgin Olive Oil'), ('azeite virgem', 'Virgin Olive Oil'), ('azeite', 'Olive Oil'), ('virgem extra', 'Extra Virgin'),
  ('molho de soja', 'Soy Sauce'), ('leite de coco', 'Coconut Milk'), ('grão de bico', 'Chickpeas'),
  ('peito de frango', 'Chicken Breast'), ('metades de frango', 'Chicken Halves'),
  ('filete de atum', 'Tuna Fillet'), ('filetes de atum', 'Tuna Fillets'), ('ventresca de atum', 'Tuna Belly'), ('lombo de atum', 'Tuna Loin'),
  ('massa esparguete', 'Spaghetti'), ('esparguete', 'Spaghetti'), ('massa', 'Pasta'),
  ('ao natural', 'Natural'), ('em azeite', 'in Olive Oil'), ('em óleo', 'in Oil'),
  ('do campo', 'Free-Range'), ('sem glúten', 'Gluten-Free'), ('com menos sal', 'Reduced Salt'), ('pack poupança', 'Value Pack'),
  ('zero desperdício', 'Zero Waste'), ('sem resíduos de pesticidas', 'Pesticide-Residue-Free'),
  ('para assar', 'for Roasting'), ('especial assar', 'Special for Roasting'), ('para fritar', 'for Frying'), ('para sushi', 'for Sushi'), ('sushi e sashimi', 'Sushi and Sashimi'),
  ('cenoura baby', 'Baby Carrots'), ('cenoura babys', 'Baby Carrots'), ('cenoura', 'Carrots'), ('cenouras', 'Carrots'),
  ('cebola nova', 'New Onion'), ('cebola', 'Onion'), ('cebolas', 'Onions'),
  ('batata', 'Potato'), ('batatas', 'Potatoes'), ('pimento', 'Pepper'), ('pimentos', 'Peppers'),
  ('ovos', 'Eggs'), ('ovo', 'Egg'), ('arroz', 'Rice'), ('agulha', 'Long-Grain'), ('carolino', 'Carolino'), ('vaporizado', 'Parboiled'), ('jasmim', 'Jasmine'),
  ('atum', 'Tuna'), ('espinafres', 'Spinach'), ('espinafre', 'Spinach'), ('frango', 'Chicken'), ('peito', 'Breast'),
  ('coxas', 'Drumsticks'), ('coxa', 'Drumstick'), ('sobrecoxas', 'Thighs'), ('sobrecoxa', 'Thigh'), ('asas', 'Wings'), ('asinhas', 'Wings'),
  ('limão', 'Lemon'), ('lima', 'Lime'),
  ('biológico', 'Organic'), ('biológica', 'Organic'), ('integral', 'Wholegrain'), ('cozido', 'Cooked'), ('congelado', 'Frozen'), ('congelados', 'Frozen'),
  ('vermelha', 'Red'), ('vermelho', 'Red'), ('branca', 'White'), ('verde', 'Green'), ('amarelo', 'Yellow'),
  ('tricolor', 'Tricolour'), ('picante', 'Spicy'), ('fino', 'Fine'), ('selecionado', 'Selected'), ('espelta', 'Spelt'), ('aveia', 'Oat'),
  ('reserva', 'Reserve'), ('cooperativa', 'Cooperative'), ('sustentável', 'Sustainable'), ('essencial', 'Essential'),
  ('dop', 'PDO'), ('igp', 'PGI');

create or replace function public.translate_pt_en(src text) returns text
language plpgsql stable set search_path = public as $$
declare t record; out text := src;
begin
  if src is null then return null; end if;
  for t in select pt, en from public.term_translation order by length(pt) desc, pt loop
    out := regexp_replace(out, '\m' || t.pt || '\M', t.en, 'gi');
  end loop;
  return out;
end $$;

alter table public.product
  add column name_en text,
  add column name_en_source text check (name_en_source in ('rule', 'manual'));

create or replace function public.product_set_name_en() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.name_en_source is distinct from 'manual' then
    new.name_en := public.translate_pt_en(new.name);
    new.name_en_source := 'rule';
  end if;
  return new;
end $$;

create trigger product_name_en before insert or update of name on public.product
  for each row execute function public.product_set_name_en();

-- backfill (the trigger fires on this update)
update public.product set name = name;

alter table public.ingredient add column name_pt text;
update public.ingredient set name_pt = v.pt from (values
  ('potatoes','Batata'), ('onion','Cebola'), ('carrots','Cenoura'), ('eggs','Ovos'), ('rice','Arroz'), ('chickpeas','Grão de bico'),
  ('peppers','Pimento'), ('tuna','Atum'), ('spinach','Espinafres'), ('chicken','Frango'), ('chicken-breast','Peito de frango'),
  ('chicken-thighs','Sobrecoxas de frango'), ('spaghetti','Esparguete'), ('coconut-milk','Leite de coco'), ('lemon','Limão'),
  ('soy-sauce','Molho de soja'), ('olive-oil','Azeite')) as v(slug, pt) where ingredient.slug = v.slug;

-- same view as 007, plus name_en at the end
create or replace view public.product_price_today with (security_invoker = true) as
select p.id as product_id, p.chain_id, p.ingredient_id, p.name, p.pack_qty, p.pack_unit,
  rp.price as regular_price, pr.promo_price, pr.requires_loyalty_card, pr.deal_text, pr.ends_on as promo_ends_on,
  coalesce(pr.promo_price, rp.price) as effective_price,
  coalesce(pr.promo_price, rp.price) / coalesce(p.usable_qty, p.pack_qty * coalesce(i.usable_fraction, 1)) as price_per_base_unit,
  p.name_en
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
