-- 010: more Portuguese -> English terms, and retranslate_products() to re-run the translation after terms change.
-- Run it from the SQL editor (it is not callable with the public key):  select public.retranslate_products();
insert into public.term_translation (pt, en) values
  ('perninha de frango', 'Chicken Drumstick'), ('perninhas de frango', 'Chicken Drumsticks'), ('perna de frango', 'Chicken Leg'), ('pernas de frango', 'Chicken Legs'),
  ('coxa de frango', 'Chicken Drumstick'), ('coxas de frango', 'Chicken Drumsticks'), ('sobrecoxa de frango', 'Chicken Thigh'), ('sobrecoxas de frango', 'Chicken Thighs'),
  ('asas de frango', 'Chicken Wings'), ('frango inteiro', 'Whole Chicken'), ('com miúdos', 'with Giblets'), ('aos pedaços', 'in Pieces'),
  ('desossada', 'Boneless'), ('desossado', 'Boneless'), ('desossadas', 'Boneless'), ('temperada', 'Seasoned'), ('temperado', 'Seasoned'),
  ('biológicos', 'Organic'), ('biológicas', 'Organic'), ('frescos', 'Fresh'), ('frescas', 'Fresh'), ('fresco', 'Fresh'), ('fresca', 'Fresh'),
  ('gordura', 'Fat'), ('classe', 'Size'), ('padrão', 'Padrón'), ('negro', 'Black'), ('extra longo', 'Extra Long'), ('clássico', 'Classic'), ('clássica', 'Classic'),
  ('atum posta', 'Tuna Steak'), ('e oregãos', 'and Oregano'), ('de espelta', 'Spelt'), ('inteiro', 'Whole'), ('inteira', 'Whole'),
  ('dos açores', 'from the Azores'), ('com', 'with'), ('sem', 'without'), ('e', 'and'), ('em', 'in'), ('perninha', 'Drumstick'), ('perna', 'Leg'), ('pedaços', 'Pieces'),
  ('em posta', 'Steak'), ('posta', 'Steak'), ('caril', 'Curry'), ('óleo de girassol', 'Sunflower Oil'), ('óleo', 'Oil'), ('de girassol', 'Sunflower'),
  ('girassol', 'Sunflower'), ('oregãos', 'Oregano'), ('miúdos', 'Giblets')
on conflict (pt) do update set en = excluded.en;

create or replace function public.retranslate_products() returns integer
language plpgsql set search_path = public as $$
declare n integer;
begin
  update public.product set name_en = public.translate_pt_en(name), name_en_source = 'rule' where name_en_source is distinct from 'manual';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.retranslate_products() from public, anon, authenticated;
