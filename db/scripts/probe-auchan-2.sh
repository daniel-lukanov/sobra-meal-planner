#!/usr/bin/env bash
# Probe round 2 for Auchan Portugal: round 1 showed the site is reachable and how its pages are built; this saves the pages the scraper needs
# (category listings or flyer, one product page, the sitemap) to data/raw/auchan/ (git-ignored). One request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/auchan"; mkdir -p "$out"
base="https://www.auchan.pt"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 60 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch auchan_sitemap_product0.xml "$base/sitemap_0-product.xml"
fetch auchan_cat_alimentacao.html "$base/pt/alimentacao/"
fetch auchan_cat_mercearia.html "$base/pt/alimentacao/mercearia/"
fetch auchan_cat_frescos.html "$base/pt/produtos-frescos/"
fetch auchan_cat_legumes.html "$base/pt/produtos-frescos/frutas-e-legumes/"
fetch auchan_cat_talho.html "$base/pt/produtos-frescos/talho/"
echo "Done. Files are in data/raw/auchan/"
