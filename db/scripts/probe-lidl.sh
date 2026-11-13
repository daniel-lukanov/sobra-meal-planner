#!/usr/bin/env bash
# Probe: fetch a few Lidl Portugal pages ONCE and save the raw responses to data/raw/lidl/ (git-ignored),
# so the real scraper can be written against what the site actually returns (same method as the Continente and Pingo Doce probes).
# Lidl PT has no online grocery shop; food appears as weekly offers, so the probe looks at the home page, robots.txt,
# the sitemap and the offers pages. Slow and small on purpose: one request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/lidl"; mkdir -p "$out"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 30 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch lidl_home.html     "https://www.lidl.pt/"
fetch lidl_robots.txt    "https://www.lidl.pt/robots.txt"
fetch lidl_sitemap.xml   "https://www.lidl.pt/sitemap.xml"
fetch lidl_ofertas.html  "https://www.lidl.pt/ofertas"
fetch lidl_c_ofertas.html "https://www.lidl.pt/c/ofertas-da-semana/s10007374"
fetch lidl_folhetos.html "https://www.lidl.pt/c/folhetos/s10008136"
echo "Done. Files are in data/raw/lidl/"
