#!/usr/bin/env bash
# Probe: fetch a few Aldi Portugal pages ONCE and save the raw responses to data/raw/aldi/ (git-ignored),
# so the real scraper can be written against what the site actually returns (same method as the Continente, Pingo Doce and Lidl probes).
# Aldi PT has no online grocery shop; food appears as weekly offers, like Lidl.
# Round 1 is a guess at the URL shapes: robots.txt and the sitemap first, then the home and offer pages. Slow and small on purpose:
# one request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/aldi"; mkdir -p "$out"
base="https://www.aldi.pt"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 30 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch aldi_home.html "$base/"
fetch aldi_robots.txt "$base/robots.txt"
fetch aldi_sitemap.xml "$base/sitemap.xml"
fetch aldi_ofertas.html "$base/ofertas.html"
fetch aldi_produtos.html "$base/produtos.html"
echo "Done. Files are in data/raw/aldi/"
