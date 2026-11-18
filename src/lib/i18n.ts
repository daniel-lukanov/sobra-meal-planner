import { create } from "zustand";

export type Lang = "en" | "pt";
export const LANG_KEY = "pratico-lang";

/** Price of the paid variant, one value so it can change. */
export const PLUS_PRICE = 3.99;

const en = {
  // shell
  "app.title": "pratico: see what you overpaid on your last shop",
  "app.desc": "Check your last supermarket receipt and see how much you could have saved in Lisbon this week. Free, about one minute, no account.",
  "nav.steps.shop": "Your shop", "nav.steps.check": "Check", "nav.steps.savings": "Savings",
  "lang.switch": "Language",
  "price.note": "Sample prices, no guarantee.",
  "common.back": "Back", "common.copy": "Copy", "common.copied": "Copied", "common.no_thanks": "No thanks", "common.show_all": "Show all", "common.show_less": "Show less",
  "common.privacy": "We only use this for the pilot and the raffle.",
  // start
  "start.title": "How much did you overpay on your last shop?",
  "start.sub": "Answer three quick questions, then scan your receipt. We compare it with this week's prices in five Lisbon supermarkets.",
  "start.scan": "Scan your receipt", "start.manual": "No receipt? Pick what you usually buy", "start.demo": "Use an example receipt",
  "start.fine": "Free. About one minute. No account.",
  "start.missing": "Please answer the questions above first.",
  "start.missing_one": "Please answer this question first.",
  "start.optional": "required",
  // survey questions
  "q1.q": "How many people do you buy groceries for?",
  "q1.just_me": "Just me", "q1.two": "2", "q1.three_four": "3–4", "q1.five_plus": "5 or more",
  "q2.q": "Roughly how much do you spend on groceries in a normal week?",
  "q2.u30": "Under €30", "q2.30_60": "€30–60", "q2.60_100": "€60–100", "q2.100_150": "€100–150", "q2.o150": "Over €150",
  "q3.q": "What do you do about supermarket deals today? Select all that apply.",
  "q3.flyer": "I check the flyer or app before shopping", "q3.grab": "I grab deals I see in the store", "q3.loyalty": "I use a loyalty card", "q3.multi": "I shop at more than one supermarket to save", "q3.none": "I don't really look at deals",
  "q4.q": "Does that savings number feel realistic for how you shop?",
  "q4.yes": "Yes, about right", "q4.high": "Too high", "q4.low": "Too low", "q4.unsure": "Not sure",
  "q5.q": "To save that money, what would you actually do? Select all that apply.",
  "q5.cheaper": "Shop at the cheaper supermarket this week", "q5.brand": "Buy a different brand that's on deal", "q5.store_brand": "Switch to store brands", "q5.split": "Split my shopping between two stores", "q5.nothing": "Nothing, I'd keep shopping as I do",
  "q5b.q": "What stops you?",
  "q5b.far": "The other store is too far", "q5b.small": "The amount isn't worth it", "q5b.brands": "I like my usual brands", "q5b.hassle": "Too much hassle to plan", "q5b.none": "None of these",
  "q6.q": "How would you rather tell pratico what you buy?",
  "q6.photo": "Photo of my receipt", "q6.pick": "Pick my usual products once", "q6.loyalty": "Connect my loyalty card", "q6.neither": "I wouldn't do either",
  "q7.q": "How often would you check pratico before shopping?",
  "q7.weekly": "Every week", "q7.biweekly": "Every 2–3 weeks", "q7.big": "Only before a big shop", "q7.never": "Probably never",
  "q8.q": "If pratico didn't launch, how would you feel?",
  "q8.very": "Very disappointed", "q8.some": "Somewhat disappointed", "q8.not": "Not disappointed",
  "q9.q": "What would stop you from using pratico next week? Select all that apply.",
  "q9.trust": "I don't trust the prices", "q9.slow": "Scanning or picking products takes too long", "q9.small": "The savings are too small", "q9.forget": "I'd forget about it", "q9.fine": "What I do now works fine", "q9.nothing": "Nothing, I'd use it",
  "q9.other": "Anything else? (optional)",
  // reading
  "read.reading": "Reading your receipt…",
  "read.title": "Is this your receipt?",
  "read.yes": "Yes, that's my receipt", "read.again": "Scan again",
  "read.fix": "Tap a line to fix the name or price.",
  "read.fail": "We couldn't read this receipt. Take the photo again with the whole receipt and good light.",
  "read.total": "Total", "read.save_line": "Save",
  "read.sample_note": "This is an example receipt. In this version we show the same one for every photo.",
  "read.pick_photo": "Choose a photo",
  "read.name": "Name", "read.price": "Price in euros",
  // manual
  "man.title": "What do you usually buy?",
  "man.household": "How many people do you shop for?",
  "man.store": "Where do you usually shop?",
  "man.products": "Tap what you usually buy",
  "man.show": "Show my savings",
  "man.missing_store": "Please choose your usual store.",
  "man.missing_products": "Please pick at least one product.",
  // products
  "p.chicken": "Chicken breast 1 kg", "p.beef": "Minced beef 500 g", "p.salmon": "Salmon fillets 400 g", "p.eggs": "Eggs 12", "p.milk": "Semi-skimmed milk 6 × 1 L",
  "p.yogurt": "Greek yogurt 4 pack", "p.coffee": "Ground coffee 250 g", "p.olive_oil": "Extra virgin olive oil 750 ml", "p.spaghetti": "Spaghetti 500 g", "p.detergent": "Laundry detergent 40 washes",
  "p.bananas": "Bananas 1 kg", "p.tomatoes": "Tomatoes 1 kg", "p.bread": "Sliced bread 600 g", "p.rice": "Rice 1 kg", "p.toilet_paper": "Toilet paper 12 rolls",
  "sec.veg": "Fruit and veg", "sec.meat": "Meat and fish", "sec.dairy": "Dairy and eggs", "sec.pantry": "Pantry", "sec.household": "Household",
  // result
  "res.big_receipt": "On this receipt you could have saved",
  "res.big_manual": "Each week you could save about",
  "res.percent": "That's {pct}% of {total}. If this is your weekly shop, that's about {month} a month.",
  "res.percent_manual": "That's {pct}% of {total}. Over a month that's about {month}.",
  "res.compare": "Compared with this week's prices for the same or an equivalent product.",
  "res.easiest_title": "Easiest option",
  "res.easiest": "Shop at {store} this week. The same basket costs {price} there. You save {save} in one trip.",
  "res.already": "Your store is already the cheapest for this basket. You save by picking up a few products where they're on promotion.",
  "res.baskets": "Your basket at each store",
  "res.cheapest": "cheapest", "res.yours": "your store",
  "res.most": "Where you save the most",
  "res.reason.promo": "on promotion", "res.reason.store_brand": "store brand", "res.reason.regular": "regular price",
  "res.paid": "you paid {price}", "res.best_price": "Already the best price",
  "res.list": "Get my shopping list",
  "res.share": "Share my savings on WhatsApp",
  "res.soon": "coming soon",
  "res.fd.loyalty": "Connect your loyalty card", "res.fd.dinners": "Dinner ideas from your deals", "res.fd.delivery": "Order groceries online",
  "res.fd.thanks": "This isn't available yet. Thanks, your tap tells us you'd want it.",
  "res.no_result": "There is nothing to show yet. Start with your receipt.",
  "res.start_over": "Start again",
  // finish
  "fin.title": "Two minutes more?",
  "fin.sub": "A few quick questions help us build the right thing. You can skip them.",
  "fin.skip": "Skip the questions",
  "fin.continue": "Continue",
  "fin.q5b_missing": "Please answer this question first.",
  "fin.cta.free_title": "Join the free pilot", "fin.cta.free_text": "Every Thursday we send you your cheapest list for the week.", "fin.cta.free_btn": "Join the free pilot",
  "fin.cta.paid_title": "pratico Plus: {price} a month, first month free", "fin.cta.paid_text": "Nothing is charged now. Cancel anytime.", "fin.cta.paid_btn": "Reserve my spot",
  "fin.contact.label": "Email or WhatsApp number", "fin.contact.send": "Save", "fin.contact.thanks": "Thanks. We'll be in touch.",
  "fin.contact.bad": "Please enter an email or a phone number.",
  "fin.raffle.title": "Win a supermarket voucher",
  "fin.raffle.text": "Leave your email and follow us on Instagram. We'll contact the winners after 30 November.",
  "fin.raffle.email": "Your email", "fin.raffle.save": "Enter the raffle", "fin.raffle.thanks": "You're in the raffle.",
  "fin.raffle.bad": "Please enter a valid email.",
  "fin.raffle.friends": "Every friend who signs up through your link gives you one more entry.",
  "fin.follow": "Follow @pratico.lisboa",
  "fin.whatsapp": "Share on WhatsApp",
  "fin.done_title": "Thanks for checking your shop",
  // list
  "list.title": "Your shopping list",
  "list.sub": "Every product at the store where it's cheapest this week.",
  "list.save": "save {amount}",
  "list.total": "{store} total",
  "list.blocked_title": "Your free list for this week is used",
  "list.blocked_text": "The first list each week is free. Join to get your cheapest list every week.",
  "list.back": "Back to my savings",
  // share
  "share.text": "I just checked my last {store} receipt with pratico: I could have saved {saving} this week. Cheapest this week for my basket: {cheapest}. Check yours:",
  "share.text_manual": "I just checked my usual shop at {store} with pratico: I could have saved {saving} this week. Cheapest this week for my basket: {cheapest}. Check yours:",
  "share.fallback": "Copy this text and send it:",
  // landing
  "land.title": "{name} could have saved {saving} at {store}. How much could you save?",
  "land.someone": "Someone",
  "land.btn": "Check my receipt",
  "land.sub": "pratico compares your supermarket receipt with this week's prices in five Lisbon supermarkets.",
  "land.referral": "Want one more raffle entry for your friend? Leave your email.",
  "land.email": "Your email", "land.signup": "Sign me up",
  // errors
  "err.not_found": "We couldn't find this page",
  "err.go_home": "Go to the start",
} as const;

export type Key = keyof typeof en;

const pt: Record<Key, string> = {
  "app.title": "pratico: veja quanto pagou a mais na última compra",
  "app.desc": "Verifique o seu último talão de supermercado e veja quanto poderia ter poupado em Lisboa esta semana. Grátis, cerca de um minuto, sem conta.",
  "nav.steps.shop": "A sua compra", "nav.steps.check": "Verificar", "nav.steps.savings": "Poupança",
  "lang.switch": "Idioma",
  "price.note": "Preços de exemplo, sem garantia.",
  "common.back": "Voltar", "common.copy": "Copiar", "common.copied": "Copiado", "common.no_thanks": "Não, obrigado", "common.show_all": "Ver tudo", "common.show_less": "Ver menos",
  "common.privacy": "Só usamos isto para o piloto e para o sorteio.",
  "start.title": "Quanto pagou a mais na sua última compra?",
  "start.sub": "Responda a três perguntas rápidas e digitalize o talão. Comparamos com os preços desta semana em cinco supermercados de Lisboa.",
  "start.scan": "Digitalizar o talão", "start.manual": "Sem talão? Escolha o que costuma comprar", "start.demo": "Usar um talão de exemplo",
  "start.fine": "Grátis. Cerca de um minuto. Sem conta.",
  "start.missing": "Responda primeiro às perguntas acima.",
  "start.missing_one": "Responda primeiro a esta pergunta.",
  "start.optional": "obrigatória",
  "q1.q": "Para quantas pessoas faz as compras?",
  "q1.just_me": "Só para mim", "q1.two": "2", "q1.three_four": "3–4", "q1.five_plus": "5 ou mais",
  "q2.q": "Mais ou menos quanto gasta em compras numa semana normal?",
  "q2.u30": "Menos de 30 €", "q2.30_60": "30–60 €", "q2.60_100": "60–100 €", "q2.100_150": "100–150 €", "q2.o150": "Mais de 150 €",
  "q3.q": "O que faz hoje em relação às promoções dos supermercados? Escolha todas as que se aplicam.",
  "q3.flyer": "Vejo o folheto ou a app antes de ir às compras", "q3.grab": "Aproveito as promoções que vejo na loja", "q3.loyalty": "Uso cartão de fidelização", "q3.multi": "Compro em mais do que um supermercado para poupar", "q3.none": "Não costumo ver promoções",
  "q4.q": "Este valor de poupança parece realista para a forma como faz compras?",
  "q4.yes": "Sim, mais ou menos", "q4.high": "Alto demais", "q4.low": "Baixo demais", "q4.unsure": "Não sei",
  "q5.q": "Para poupar esse dinheiro, o que faria na prática? Escolha todas as que se aplicam.",
  "q5.cheaper": "Ia ao supermercado mais barato esta semana", "q5.brand": "Comprava outra marca que estivesse em promoção", "q5.store_brand": "Passava para marcas brancas", "q5.split": "Dividia as compras por duas lojas", "q5.nothing": "Nada, continuava a comprar como agora",
  "q5b.q": "O que o impede?",
  "q5b.far": "A outra loja fica longe", "q5b.small": "O valor não compensa", "q5b.brands": "Gosto das minhas marcas habituais", "q5b.hassle": "Dá muito trabalho planear", "q5b.none": "Nenhuma destas",
  "q6.q": "Como preferia dizer ao pratico o que compra?",
  "q6.photo": "Foto do meu talão", "q6.pick": "Escolher uma vez os produtos habituais", "q6.loyalty": "Ligar o meu cartão de fidelização", "q6.neither": "Não faria nenhuma das duas",
  "q7.q": "Com que frequência consultaria o pratico antes de ir às compras?",
  "q7.weekly": "Todas as semanas", "q7.biweekly": "De 2 em 2 ou 3 semanas", "q7.big": "Só antes de uma compra grande", "q7.never": "Provavelmente nunca",
  "q8.q": "Se o pratico não fosse lançado, como se sentiria?",
  "q8.very": "Muito desiludido", "q8.some": "Um pouco desiludido", "q8.not": "Nada desiludido",
  "q9.q": "O que o impediria de usar o pratico na próxima semana? Escolha todas as que se aplicam.",
  "q9.trust": "Não confio nos preços", "q9.slow": "Digitalizar ou escolher produtos demora demasiado", "q9.small": "A poupança é pequena demais", "q9.forget": "Ia-me esquecer", "q9.fine": "O que faço agora funciona bem", "q9.nothing": "Nada, usava",
  "q9.other": "Mais alguma coisa? (opcional)",
  "read.reading": "A ler o seu talão…",
  "read.title": "Este é o seu talão?",
  "read.yes": "Sim, é o meu talão", "read.again": "Digitalizar de novo",
  "read.fix": "Toque numa linha para corrigir o nome ou o preço.",
  "read.fail": "Não conseguimos ler este talão. Tire a foto outra vez, com o talão inteiro e boa luz.",
  "read.total": "Total", "read.save_line": "Guardar",
  "read.sample_note": "Este é um talão de exemplo. Nesta versão mostramos sempre o mesmo, seja qual for a foto.",
  "read.pick_photo": "Escolher uma foto",
  "read.name": "Nome", "read.price": "Preço em euros",
  "man.title": "O que costuma comprar?",
  "man.household": "Para quantas pessoas faz as compras?",
  "man.store": "Onde costuma fazer compras?",
  "man.products": "Toque no que costuma comprar",
  "man.show": "Ver a minha poupança",
  "man.missing_store": "Escolha o supermercado onde costuma comprar.",
  "man.missing_products": "Escolha pelo menos um produto.",
  "p.chicken": "Peito de frango 1 kg", "p.beef": "Carne picada de vaca 500 g", "p.salmon": "Filetes de salmão 400 g", "p.eggs": "Ovos 12", "p.milk": "Leite meio-gordo 6 × 1 L",
  "p.yogurt": "Iogurte grego 4 unidades", "p.coffee": "Café moído 250 g", "p.olive_oil": "Azeite virgem extra 750 ml", "p.spaghetti": "Esparguete 500 g", "p.detergent": "Detergente da roupa 40 doses",
  "p.bananas": "Bananas 1 kg", "p.tomatoes": "Tomate 1 kg", "p.bread": "Pão de forma 600 g", "p.rice": "Arroz 1 kg", "p.toilet_paper": "Papel higiénico 12 rolos",
  "sec.veg": "Fruta e legumes", "sec.meat": "Carne e peixe", "sec.dairy": "Lacticínios e ovos", "sec.pantry": "Mercearia", "sec.household": "Casa",
  "res.big_receipt": "Neste talão poderia ter poupado",
  "res.big_manual": "Por semana poderia poupar cerca de",
  "res.percent": "Isso é {pct}% de {total}. Se esta for a sua compra semanal, são cerca de {month} por mês.",
  "res.percent_manual": "Isso é {pct}% de {total}. Num mês são cerca de {month}.",
  "res.compare": "Comparado com os preços desta semana do mesmo produto ou de um equivalente.",
  "res.easiest_title": "A opção mais fácil",
  "res.easiest": "Faça as compras no {store} esta semana. O mesmo cabaz custa lá {price}. Poupa {save} numa só ida.",
  "res.already": "A sua loja já é a mais barata para este cabaz. Poupa se apanhar alguns produtos onde estão em promoção.",
  "res.baskets": "O seu cabaz em cada loja",
  "res.cheapest": "mais barato", "res.yours": "a sua loja",
  "res.most": "Onde poupa mais",
  "res.reason.promo": "em promoção", "res.reason.store_brand": "marca branca", "res.reason.regular": "preço normal",
  "res.paid": "pagou {price}", "res.best_price": "Já tem o melhor preço",
  "res.list": "Ver a minha lista de compras",
  "res.share": "Partilhar a minha poupança no WhatsApp",
  "res.soon": "brevemente",
  "res.fd.loyalty": "Ligar o seu cartão de fidelização", "res.fd.dinners": "Ideias de jantares com as suas promoções", "res.fd.delivery": "Encomendar compras online",
  "res.fd.thanks": "Isto ainda não está disponível. Obrigado, o seu toque diz-nos que gostaria.",
  "res.no_result": "Ainda não há nada para mostrar. Comece pelo seu talão.",
  "res.start_over": "Começar de novo",
  "fin.title": "Mais dois minutos?",
  "fin.sub": "Umas perguntas rápidas ajudam-nos a construir a coisa certa. Pode saltá-las.",
  "fin.skip": "Saltar as perguntas",
  "fin.continue": "Continuar",
  "fin.q5b_missing": "Responda primeiro a esta pergunta.",
  "fin.cta.free_title": "Junte-se ao piloto gratuito", "fin.cta.free_text": "Todas as quintas-feiras enviamos-lhe a lista mais barata da semana.", "fin.cta.free_btn": "Juntar-me ao piloto gratuito",
  "fin.cta.paid_title": "pratico Plus: {price} por mês, primeiro mês grátis", "fin.cta.paid_text": "Não é cobrado nada agora. Cancele quando quiser.", "fin.cta.paid_btn": "Reservar o meu lugar",
  "fin.contact.label": "Email ou número de WhatsApp", "fin.contact.send": "Guardar", "fin.contact.thanks": "Obrigado. Entramos em contacto.",
  "fin.contact.bad": "Indique um email ou um número de telefone.",
  "fin.raffle.title": "Ganhe um vale de supermercado",
  "fin.raffle.text": "Deixe o seu email e siga-nos no Instagram. Contactamos os vencedores depois de 30 de novembro.",
  "fin.raffle.email": "O seu email", "fin.raffle.save": "Entrar no sorteio", "fin.raffle.thanks": "Já está no sorteio.",
  "fin.raffle.bad": "Indique um email válido.",
  "fin.raffle.friends": "Cada amigo que se inscrever pelo seu link dá-lhe mais uma participação.",
  "fin.follow": "Seguir @pratico.lisboa",
  "fin.whatsapp": "Partilhar no WhatsApp",
  "fin.done_title": "Obrigado por verificar a sua compra",
  "list.title": "A sua lista de compras",
  "list.sub": "Cada produto na loja onde está mais barato esta semana.",
  "list.save": "poupa {amount}",
  "list.total": "Total {store}",
  "list.blocked_title": "A sua lista gratuita desta semana já foi usada",
  "list.blocked_text": "A primeira lista de cada semana é grátis. Junte-se para receber todas as semanas a lista mais barata.",
  "list.back": "Voltar à minha poupança",
  "share.text": "Acabei de verificar o meu último talão do {store} com o pratico: poderia ter poupado {saving} esta semana. Mais barato esta semana para o meu cabaz: {cheapest}. Verifique o seu:",
  "share.text_manual": "Acabei de verificar a minha compra habitual no {store} com o pratico: poderia ter poupado {saving} esta semana. Mais barato esta semana para o meu cabaz: {cheapest}. Verifique o seu:",
  "share.fallback": "Copie este texto e envie:",
  "land.title": "{name} poderia ter poupado {saving} no {store}. Quanto poderia poupar?",
  "land.someone": "Alguém",
  "land.btn": "Verificar o meu talão",
  "land.sub": "O pratico compara o seu talão de supermercado com os preços desta semana em cinco supermercados de Lisboa.",
  "land.referral": "Quer dar mais uma participação no sorteio ao seu amigo? Deixe o seu email.",
  "land.email": "O seu email", "land.signup": "Inscrever-me",
  "err.not_found": "Não encontrámos esta página",
  "err.go_home": "Ir para o início",
};

export const STRINGS: Record<Lang, Record<Key, string>> = { en, pt };

export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  try { const saved = window.localStorage.getItem(LANG_KEY); if (saved === "pt" || saved === "en") return saved; } catch { /* ignore */ }
  return (navigator.language || "en").toLowerCase().startsWith("pt") ? "pt" : "en";
}

type L = { lang: Lang; set: (l: Lang) => void };
export const useLang = create<L>((set) => ({
  lang: "en",
  set: (lang) => { try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ } if (typeof document !== "undefined") document.documentElement.lang = lang === "pt" ? "pt-PT" : "en"; set({ lang }); },
}));

/** EN "€14.10", PT "14,10 €" (non-breaking space). */
export function money(n: number, lang: Lang): string {
  const v = (Math.round(n * 100) / 100).toFixed(2);
  return lang === "pt" ? `${v.replace(".", ",")} €` : `€${v}`;
}
/** Whole euros, for monthly amounts. */
export const moneyWhole = (n: number, lang: Lang) => (lang === "pt" ? `${Math.round(n)} €` : `€${Math.round(n)}`);

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return {
    lang,
    t: (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
    m: (n: number) => money(n, lang),
    mw: (n: number) => moneyWhole(n, lang),
  };
}
