#!/usr/bin/env bash
# Probe: fetch a few Continente pages ONCE and save the raw responses to data/raw/continente/ (git-ignored),
# so the real scraper can be written against what the site actually returns. Slow and small on purpose.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/continente"; mkdir -p "$out"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
base="https://www.continente.pt"
fetch() { # name url
  code=$(curl -sS -m 30 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')"
  sleep 2
}
fetch grid_arroz.html   "$base/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid?q=arroz&start=0&sz=24"
fetch search_arroz.html "$base/pesquisa/?q=arroz"
fetch grid_frango.html  "$base/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid?q=frango&start=0&sz=24"
fetch home.html         "$base/"
fetch folhetos.html     "$base/folhetos/"
echo "Done. Files are in data/raw/continente/"
