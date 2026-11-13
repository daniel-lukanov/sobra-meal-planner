import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { invitePreview, useHouseholdActions, useSession } from "@/lib/account";
import { AccountForm } from "@/components/sobra/AccountForm";
import { SobraLogo } from "@/components/sobra/Brand";
import { Button } from "@/components/sobra/ui";

export const Route = createFileRoute("/join/$code")({
  head: () => ({ meta: [{ title: "Join a household · pratico" }, { name: "description", content: "You were invited to share a fridge and a weekly plan." }] }),
  component: Join,
});

function Join() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();
  const { join } = useHouseholdActions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useQuery({ queryKey: ["invite", code], queryFn: () => invitePreview(code), staleTime: 60_000 });

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto my-10 max-w-lg rounded-sheet bg-sheet p-6"><SobraLogo />{children}</div>
  );
  if (preview.isLoading || session === undefined) return shell(<p className="mt-6 text-muted-foreground">One moment</p>);
  if (!preview.data) {
    return shell(<>
      <h1 className="mt-6 text-[24px] font-bold">This invite link does not work</h1>
      <p className="mt-2 text-muted-foreground">Ask the person who sent it for a new link.</p>
      <Button className="mt-5" onClick={() => navigate({ to: "/plan" })}>Build my own week</Button>
    </>);
  }
  const { name, members } = preview.data;
  const accept = async () => {
    setBusy(true); setError(null);
    const p = await join(code);
    setBusy(false);
    if (p) setError(p); else void navigate({ to: "/household" });
  };
  return shell(<>
    <h1 className="mt-6 text-[26px] font-bold">Join {name}</h1>
    <p className="mt-2 text-muted-foreground">{members} {members === 1 ? "person is" : "people are"} in this household. You will share their fridge, weekly plan and shopping list.</p>
    {session ? (
      <>
        <p className="mt-3 text-[13px] text-muted-foreground">Your own household, if you started one, is replaced by this one.</p>
        {error && <p role="alert" className="mt-3 text-[13.5px] font-medium text-tomato">{error}</p>}
        <Button className="mt-5" disabled={busy} onClick={accept}>{busy ? "One moment" : "Join this household"}</Button>
      </>
    ) : (
      <div className="mt-5"><AccountForm /></div>
    )}
  </>);
}
