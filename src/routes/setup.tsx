import { createFileRoute, redirect } from "@tanstack/react-router";

// "Your meals" moved into Account. Old links keep working.
export const Route = createFileRoute("/setup")({
  beforeLoad: () => { throw redirect({ to: "/account" }); },
});
