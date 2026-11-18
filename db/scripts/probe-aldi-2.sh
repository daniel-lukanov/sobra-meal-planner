#!/usr/bin/env bash
# Probe round 2 for Aldi Portugal: round 1 showed the site is reachable and how its pages are built; this saves the pages the scraper needs
# (category listings or flyer, one product page, the sitemap) to data/raw/aldi/ (git-ignored). One request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/aldi"; mkdir -p "$out"
base="https://www.aldi.pt"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 60 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch aldi_nord_sitemap.xml "$base/.aldi-nord-sitemap.xml"
fetch aldi_folheto_semana.html "$base/folheto/esta-semana.html"
fetch aldi_oportunidades.html "$base/oportunidades-da-semana.html"
fetch aldi_produto_salsichas.html "$base/produto-detalhe/salsichas-xxl-75080000.html"
fetch aldi_newsletter_frescos.html "$base/offers-newsletter.html?hash=2-F-16-11-Frescos"
echo "Done. Files are in data/raw/aldi/"
