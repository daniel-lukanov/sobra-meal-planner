import { createFileRoute, redirect } from "@tanstack/react-router";

// The plan lives on Home now. Old links keep working.
export const Route = createFileRoute("/plan")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
});
