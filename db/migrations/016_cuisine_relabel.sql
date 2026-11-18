-- 016: two cuisine labels from the audit. The chicken and spinach rice uses soy sauce; the pepper and egg rice bowl has no Asian ingredient.
update public.recipe set cuisine = 'Asian' where slug = 'chicken-spinach-rice';
update public.recipe set cuisine = 'Mediterranean' where slug = 'rice-bowl-pepper-egg';
