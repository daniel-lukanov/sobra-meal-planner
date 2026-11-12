import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { eur, useApp } from "@/lib/store";
import { useExp } from "@/lib/experiment";
import { getSharedPlan } from "@/lib/experiment.functions";
import { perPerson } from "@/lib/week";
import { Button } from "@/components/sobra/ui";
import { SobraLogo } from "@/components/sobra/Brand";
import { stores, type StoreName } from "@/data/stores";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }) => {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) return null;
    return getSharedPlan({ data: { id: params.id } }).catch(() => null);
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.store} plan shared with you · pratico` : "Shared plan · pratico";
    const description = loaderData ? `${loaderData.plan.dinners.length} dinners for ${eur(loaderData.total)}, ${eur(perPerson(loaderData.total, loaderData.people))} each.` : "A dinner plan shared on pratico.";
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ] };
  },
  component: Shared,
});

function Shared() {
  const plan = Route.useLoaderData();
  const navigate = useNavigate();
  if (!plan) {
    return (
      <div className="mx-auto my-10 max-w-lg rounded-sheet bg-sheet p-6">
        <SobraLogo />
        <h1 className="mt-6 text-[24px] font-bold">We couldn't find this plan</h1>
        <p className="mt-2 text-muted-foreground">The link may be incomplete. You can still build your own week.</p>
        <Button className="mt-5" onClick={() => navigate({ to: "/plan" })}>Build my week</Button>
      </div>
    );
  }
  const open = () => {
    const store = (stores as readonly string[]).includes(plan.store) ? (plan.store as StoreName) : "Pingo Doce";
    useApp.getState().set({ store, mode: plan.mode, chosen: plan.plan.chosen, people: plan.people, weekAccepted: false });
    const s = useExp.getState().ensure();
    useExp.getState().update({ shared_plan_id: plan.id, ...(s.survey_pre_completed ? {} : { store }) }, true);
    navigate({ to: "/plan" });
  };
  return (
    <div className="mx-auto my-10 max-w-lg rounded-sheet bg-sheet p-6">
      <SobraLogo />
      <h1 className="mt-6 text-[26px] font-bold">{plan.store} plan shared with you. Your share: {eur(perPerson(plan.total, plan.people))}.</h1>
      <ul className="mt-4 space-y-1 text-[15px]">{plan.plan.dinners.map((d) => <li key={d.day + d.title}><span className="font-semibold">{d.day}:</span> {d.title}</li>)}</ul>
      <p className="mt-3 text-[12.5px] text-muted-foreground">Sample prices, no guarantee.</p>
      <Button className="mt-5" onClick={open}>Open the plan</Button>
    </div>
  );
}
