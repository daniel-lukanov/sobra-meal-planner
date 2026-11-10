export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · Sobra` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Sobra` },
    { property: "og:description", content: description },
  ],
});
