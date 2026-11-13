import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { pageHead } from "@/lib/head";
import { inviteLink, signOut, useHousehold, useHouseholdActions, useSession } from "@/lib/account";
import { AccountForm } from "@/components/sobra/AccountForm";
import { Button, Chip, PageHeader } from "@/components/sobra/ui";

export const Route = createFileRoute("/household")({
  head: pageHead("Household", "Invite the people you cook and shop with, and share one fridge and one plan."),
  component: HouseholdPage,
});

function HouseholdPage() {
  const session = useSession();
  const house = useHousehold(session?.user.id);
  const { leave } = useHouseholdActions();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (session === undefined) return <PageHeader small="Household" title="One moment" />;
  if (!session) {
    return (
      <>
        <PageHeader small="Household" title="Cook and shop together" sub="Create an account, then invite the people you live with. Everyone sees the same fridge, the same plan and the same ticks on the shopping list." />
        <div className="max-w-md rounded-sheet bg-sheet p-5"><AccountForm /></div>
      </>
    );
  }
  const h = house.data;
  const link = h ? inviteLink(h.inviteCode) : "";
  const text = `Join my household on pratico so we share our fridge and our weekly plan: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast("Invite link copied."); } catch { toast("Could not copy. Select the link and copy it by hand."); } };

  return (
    <>
      <PageHeader small={session.user.email ? "Signed in" : "Household"} title={h ? `Your household` : "Loading your household"} sub="Everyone in it sees the same fridge, plan and shopping list ticks." />
      {house.error && <p role="alert" className="mb-4 text-tomato">Could not load your household. Reload the page and try again.</p>}
      {h && (
        <div className="grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
          <section aria-labelledby="mem" className="card bg-sheet p-5">
            <h2 id="mem" className="text-[18px] font-bold">People ({h.members.length})</h2>
            <ul className="mt-3 divide-y divide-rule">
              {h.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <span className="text-[15.5px] font-medium">{m.name}{m.id === session.user.id && " (you)"}</span>
                  {m.role === "owner" && <Chip tone="neutral">owner</Chip>}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="inv" className="card bg-sheet p-5">
            <h2 id="inv" className="text-[18px] font-bold">Invite someone</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Send this link. They create an account and join with one tap.</p>
            <input readOnly aria-label="Invite link" value={link} onFocus={(e) => e.currentTarget.select()} className="mt-3 min-h-11 w-full rounded-ctl bg-sheet-2 px-3 text-[13px]" />
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-ctl bg-basil px-4 text-[15px] font-semibold text-basil-ink">Send on WhatsApp</a>
              <Button variant="secondary" onClick={copy}>Copy link</Button>
            </div>
          </section>
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-4 text-[14px]">
        {h && h.members.length > 1 && (confirmLeave ? (
          <span className="flex items-center gap-2">
            <span>Leave and start a household of your own?</span>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>Stay</Button>
            <Button onClick={async () => { const p = await leave(); setConfirmLeave(false); toast(p ?? "You left the household."); }}>Leave</Button>
          </span>
        ) : <button type="button" onClick={() => setConfirmLeave(true)} className="min-h-11 underline underline-offset-4">Leave this household</button>)}
        <button type="button" onClick={() => void signOut()} className="min-h-11 text-muted-foreground underline underline-offset-4">Sign out</button>
      </div>
    </>
  );
}
