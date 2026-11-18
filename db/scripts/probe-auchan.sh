#!/usr/bin/env bash
# Probe: fetch a few Auchan Portugal pages ONCE and save the raw responses to data/raw/auchan/ (git-ignored),
# so the real scraper can be written against what the site actually returns (same method as the Continente, Pingo Doce and Lidl probes).
# Auchan PT has an online grocery shop (Salesforce Commerce Cloud like Continente and Pingo Doce).
# Round 1 is a guess at the URL shapes: robots.txt and the sitemap first, then the home and offer pages. Slow and small on purpose:
# one request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/auchan"; mkdir -p "$out"
base="https://www.auchan.pt"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 30 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch auchan_home.html "$base/pt/" 
fetch auchan_robots.txt "$base/robots.txt"
fetch auchan_sitemap.xml "$base/sitemap_index.xml"
fetch auchan_alimentar.html "$base/pt/alimentar/"
fetch auchan_promocoes.html "$base/pt/promocoes/"
echo "Done. Files are in data/raw/auchan/"
