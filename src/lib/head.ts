const OG = "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80";
export const pageHead = (title: string, description: string, image = false) => () => ({
  meta: [
    { title: `${title} · pratico` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · pratico` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(image ? [{ property: "og:image", content: OG }, { name: "twitter:image", content: OG }] : []),
  ],
});
