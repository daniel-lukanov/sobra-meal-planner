import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/plan" }); },
  head: () => ({ meta: [
    { title: "Sobra · Your week of dinners" },
    { name: "description", content: "A week of dinners built from this week's deals at your supermarket." },
    { property: "og:title", content: "Sobra · Your week of dinners" },
    { property: "og:description", content: "A week of dinners built from this week's deals at your supermarket." },
  ] }),
});
