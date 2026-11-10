import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/plan" }); },
  head: () => ({ meta: [
    { title: "Sobra Lisboa — Cook twice a week, eat different meals every day" },
    { name: "description", content: "Turn this week's real deals at Pingo Doce, Continente or Lidl into a 1-tap meal plan for 1 or 2 people." },
    { property: "og:title", content: "Sobra Lisboa — Cook twice a week, eat different meals every day" },
    { property: "og:description", content: "Turn this week's real deals at Pingo Doce, Continente or Lidl into a 1-tap meal plan for 1 or 2 people." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80" },
    { name: "twitter:image", content: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80" },
  ] }),
});
