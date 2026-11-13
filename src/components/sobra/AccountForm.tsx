import { useState } from "react";
import { signIn, signUp } from "@/lib/account";
import { Button, UnderlineTabs } from "./ui";

const field = "mt-1 min-h-11 w-full rounded-ctl bg-sheet-2 px-3";

/** Create an account or sign in. The caller reacts to the session appearing; this only reports problems. */
export function AccountForm({ initial = "create" }: { initial?: "create" | "signin" }) {
  const [mode, setMode] = useState<"create" | "signin">(initial);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const problem = mode === "create" ? await signUp({ username, email, password }) : await signIn(username, password);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <UnderlineTabs label="Account" value={mode} onChange={(m) => { setMode(m); setError(null); }}
        options={[{ value: "create", label: "Create account" }, { value: "signin", label: "Sign in" }]} />
      <div>
        <label htmlFor="acc-user" className="text-[13.5px] font-medium">Username</label>
        <input id="acc-user" value={username} maxLength={20} autoCapitalize="none" autoComplete="username" onChange={(e) => setUsername(e.target.value)} className={field} />
      </div>
      {mode === "create" && (
        <div>
          <label htmlFor="acc-mail" className="text-[13.5px] font-medium">Email</label>
          <input id="acc-mail" type="email" value={email} maxLength={200} autoComplete="email" onChange={(e) => setEmail(e.target.value)} className={field} />
          <p className="mt-1 text-[12px] text-muted-foreground">We do not send anything yet. It is kept so you can recover your account later.</p>
        </div>
      )}
      <div>
        <label htmlFor="acc-pass" className="text-[13.5px] font-medium">Password</label>
        <input id="acc-pass" type="password" value={password} autoComplete={mode === "create" ? "new-password" : "current-password"} onChange={(e) => setPassword(e.target.value)} className={field} />
      </div>
      {error && <p role="alert" className="text-[13.5px] font-medium text-tomato">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "One moment" : mode === "create" ? "Create account" : "Sign in"}</Button>
    </form>
  );
}
