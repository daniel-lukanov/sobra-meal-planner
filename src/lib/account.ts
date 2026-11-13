// Accounts and households on our own Supabase project.
// Sign-up is username + password + the person's real email. The email is not verified yet, so it is only kept in the account's
// metadata; the address Supabase signs in with is a placeholder built from the username (no mail is ever sent to it).
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { sobraDb } from "@/integrations/sobra-db/client";

const AUTH_DOMAIN = "users.dream-giants.com";
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;
export const authEmail = (username: string) => `${username.trim().toLowerCase()}@${AUTH_DOMAIN}`;

/** Problem with the sign-up fields, in plain words, or null when they are fine. */
export function checkSignUp(f: { username: string; email: string; password: string }): string | null {
  const u = f.username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return "Pick a username of 3 to 20 letters, numbers or underscores.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return "Add your email address.";
  if (f.password.length < MIN_PASSWORD) return `Use a password of at least ${MIN_PASSWORD} characters.`;
  return null;
}

/** Turns what Supabase says into something a tester can act on. */
const friendly = (m: string) =>
  /already registered|already exists/i.test(m) ? "That username is taken. Try another one."
  : /invalid login/i.test(m) ? "Username or password does not match."
  : /rate limit/i.test(m) ? "Too many tries. Wait a minute and try again."
  : m;

export async function signUp(f: { username: string; email: string; password: string }): Promise<string | null> {
  const bad = checkSignUp(f);
  if (bad) return bad;
  const username = f.username.trim().toLowerCase();
  const free = await sobraDb.rpc("username_available", { name: username });
  if (free.data === false) return "That username is taken. Try another one.";
  const { data, error } = await sobraDb.auth.signUp({
    email: authEmail(username), password: f.password,
    options: { data: { username, contact_email: f.email.trim() } },
  });
  if (error) return friendly(error.message);
  // With "confirm email" switched on in Supabase there is no session after sign-up.
  return data.session ? null : "Your account was created but needs email confirmation. Switch off \"Confirm email\" in the Supabase Auth settings.";
}

export async function signIn(username: string, password: string): Promise<string | null> {
  const { error } = await sobraDb.auth.signInWithPassword({ email: authEmail(username), password });
  return error ? friendly(error.message) : null;
}

export const signOut = () => sobraDb.auth.signOut();

/** undefined while loading, null when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void sobraDb.auth.getSession().then(({ data }) => { if (live) setSession(data.session); });
    const { data: sub } = sobraDb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);
  return session;
}

export type Member = { id: string; name: string; role: string };
export type Household = { id: string; name: string; inviteCode: string; members: Member[] };

/** The signed-in person's household and who is in it. */
export function useHousehold(userId: string | undefined) {
  return useQuery({
    queryKey: ["household", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Household | null> => {
      const mine = await sobraDb.from("household_member").select("household_id, household(id, name, invite_code)").eq("profile_id", userId!).limit(1).maybeSingle();
      if (mine.error) throw mine.error;
      const h = mine.data?.household;
      if (!h) return null;
      const people = await sobraDb.from("household_member").select("profile_id, role, profile(display_name, username)").eq("household_id", h.id).order("joined_at");
      if (people.error) throw people.error;
      return {
        id: h.id, name: h.name, inviteCode: h.invite_code,
        members: people.data.map((m) => ({ id: m.profile_id, name: m.profile?.username ?? m.profile?.display_name ?? "Someone", role: m.role })),
      };
    },
  });
}

export async function invitePreview(code: string): Promise<{ name: string; members: number } | null> {
  const { data, error } = await sobraDb.rpc("household_invite_preview", { code });
  return error ? null : data[0] ?? null;
}

export function useHouseholdActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["household"] });
  return {
    join: async (code: string): Promise<string | null> => { const { error } = await sobraDb.rpc("join_household", { code }); await done(); return error ? friendly(error.message) : null; },
    leave: async (): Promise<string | null> => { const { error } = await sobraDb.rpc("leave_household"); await done(); return error ? friendly(error.message) : null; },
  };
}

export const inviteLink = (code: string) => `${window.location.origin}/join/${code}`;
