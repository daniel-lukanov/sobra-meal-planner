#!/usr/bin/env bash
# Probe: fetch a few Pingo Doce pages ONCE and save the raw responses to data/raw/pingodoce/ (git-ignored),
# so the real scraper can be written against what the sites actually return (same method as probe-continente.sh).
# Slow and small on purpose: one request every ~2 s. Educational prototype use.
set -u
cd "$(dirname "$0")/../.."
out="data/raw/pingodoce"; mkdir -p "$out"
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
fetch() { # name url
  code=$(curl -sS -m 30 -L -A "$ua" -H "Accept-Language: pt-PT,pt;q=0.9" -o "$out/$1" -w "%{http_code}" "$2" 2>"$out/$1.err")
  echo "$1  http=$code  bytes=$(wc -c < "$out/$1" | tr -d ' ')  $2"
  sleep 2
}
fetch pd_home.html        "https://www.pingodoce.pt/"
fetch pd_robots.txt       "https://www.pingodoce.pt/robots.txt"
fetch pd_folhetos.html    "https://www.pingodoce.pt/folhetos/"
fetch pd_pesquisa.html    "https://www.pingodoce.pt/?s=arroz"
fetch mercadao_store.html "https://mercadao.pt/store/pingo-doce"
fetch mercadao_robots.txt "https://mercadao.pt/robots.txt"
fetch mercadao_search.html "https://mercadao.pt/store/pingo-doce/search?query=arroz"
echo "Done. Files are in data/raw/pingodoce/"
