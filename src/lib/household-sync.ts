// Keeps the browser's fridge, receipts, accepted week and list ticks in step with the household's rows in the database.
//  * on sign-in the database wins, except for a household that has nothing yet: then this browser's data is uploaded
//    (the prototype's sample fridge is not)
//  * later changes in the app are pushed after a short pause, row by row; changes by housemates arrive through Realtime
//  * a change by someone else is never applied while this browser still has an unsent change
import { useEffect, useRef, useState } from "react";
import { praticoDb } from "@/integrations/pratico-db/client";
import { useApp } from "@/lib/store";
import { initialFridge, type FridgeItem, type Receipt } from "@/data/fridge";
import { useIngredients } from "@/lib/db-queries";
import { useHousehold, useSession } from "@/lib/account";
import { createPrefsSync } from "@/lib/prefs-sync";
import { decide, fridgeTouched, prefsRowUsed, type Choice, type LocalSnapshot, type RemoteSummary } from "@/lib/sync-choice";
import { prefsOf } from "@/lib/store";
import { DEFAULT_PREFS } from "@/lib/prefs";
import type { StoreName } from "@/data/stores";
import type { CatIngredient } from "@/lib/plan-from-db";
import type { Json, Database } from "@/integrations/pratico-db/types";
import {
  FRIDGE_SLUG, fridgeFromRow, fridgeKey, normalize, receiptFromRow, receiptKey, stable, toFridgeRow, toReceiptRow,
  type FridgeInsert, type FridgeRow, type ReceiptRow,
} from "@/lib/household-data";

type PlanRow = Database["public"]["Tables"]["household_plan_state"]["Row"];
type Snapshot = { fridge: FridgeRow[]; receipts: ReceiptRow[]; plan: PlanRow | null };
type Remote = { fridge: Map<string, string>; receipts: Map<string, string>; plan: string | null };

const initialMeals = ["Tortilla", "Curry", "Rice bowls", "Pasta", "Roast chicken", "Potato salad"];
const PUSH_DELAY = 400, PULL_DELAY = 300;
const isSample = (f: FridgeItem) => !f.receiptId && initialFridge.some((x) => x.id === f.id && x.name === f.name);
const fridgeListKey = (l: FridgeItem[]) => stable([...l].sort((a, b) => (a.uid ?? "").localeCompare(b.uid ?? "")).map((f) => [f.uid, f.id, f.name, f.daysLeft, f.maxDays, f.receiptId ?? null, f.qty ?? null]));
const receiptListKey = (l: Receipt[]) => stable([...l].sort((a, b) => a.id.localeCompare(b.id)).map((r) => [r.id, r.store, r.date, r.total]));
const planKey = (p: { chosen: unknown; accepted: boolean; checked: unknown; stores: string[]; have: string[] }) => stable({ chosen: p.chosen, accepted: p.accepted, checked: p.checked, stores: [...p.stores].sort(), have: [...p.have].sort() });

function createSync(hid: string, userId: string, ings: CatIngredient[], prefer: Choice) {
  const bySlug = new Map(ings.map((i) => [i.slug, i]));
  const byId = new Map(ings.map((i) => [i.id, i]));
  let remote: Remote = { fridge: new Map(), receipts: new Map(), plan: null };
  let ready = false, stopped = false, applying = false, pushing = false, pushAgain = false, pullAgain = false;
  let pushTimer: ReturnType<typeof setTimeout> | undefined, pullTimer: ReturnType<typeof setTimeout> | undefined;

  const fetchAll = async (): Promise<Snapshot> => {
    const [f, r, p] = await Promise.all([
      praticoDb.from("fridge_item").select("*").eq("household_id", hid).order("created_at", { ascending: false }),
      praticoDb.from("receipt").select("*").eq("household_id", hid).order("created_at", { ascending: false }),
      praticoDb.from("household_plan_state").select("*").eq("household_id", hid).maybeSingle(),
    ]);
    if (f.error) throw f.error;
    if (r.error) throw r.error;
    if (p.error) throw p.error;
    return { fridge: f.data, receipts: r.data, plan: p.data };
  };

  const setLocal = (patch: Partial<ReturnType<typeof useApp.getState>>) => {
    applying = true;
    try { useApp.setState(patch); } finally { applying = false; }
  };

  /** Records what the database holds, and copies the chosen parts of it into the app. */
  const take = (snap: Snapshot, parts: { fridge: boolean; plan: boolean }) => {
    remote = {
      fridge: new Map(snap.fridge.map((r) => [r.id, fridgeKey(r)])),
      receipts: new Map(snap.receipts.map((r) => [r.id, receiptKey(r)])),
      plan: snap.plan ? planKey(snap.plan) : null,
    };
    const cur = useApp.getState();
    const patch: Partial<ReturnType<typeof useApp.getState>> = {};
    if (parts.fridge) {
      const today = new Date();
      const fridge = snap.fridge.map((r) => fridgeFromRow(r, byId.get(r.ingredient_id), today));
      const receipts = snap.receipts.map(receiptFromRow);
      if (fridgeListKey(fridge) !== fridgeListKey(cur.fridge)) patch.fridge = fridge;
      if (receiptListKey(receipts) !== receiptListKey(cur.receipts)) patch.receipts = receipts;
    }
    if (parts.plan && snap.plan) {
      const chosen = snap.plan.chosen as Record<string, string>, checked = snap.plan.checked as Record<string, boolean>;
      const stores = snap.plan.stores.length ? (snap.plan.stores as StoreName[]) : cur.stores;
      if (planKey({ chosen, accepted: snap.plan.accepted, checked, stores, have: snap.plan.have }) !== planKey({ chosen: cur.chosen, accepted: cur.weekAccepted, checked: cur.checked, stores: cur.stores, have: cur.have })) {
        patch.chosen = chosen; patch.weekAccepted = snap.plan.accepted; patch.checked = checked; patch.stores = stores; patch.have = snap.plan.have;
      }
    }
    if (Object.keys(patch).length) setLocal(patch);
  };

  const push = async () => {
    if (!ready || stopped) return;
    if (pushing) { pushAgain = true; return; }
    pushing = true; pushAgain = false;
    try {
      const s = useApp.getState();
      const norm = normalize(s.fridge, s.receipts);
      if (norm.changed) setLocal({ fridge: norm.fridge, receipts: norm.receipts });
      const today = new Date();

      const rrows = norm.receipts.map((r) => toReceiptRow(r, { householdId: hid, userId }));
      const frows: FridgeInsert[] = [];
      for (const f of norm.fridge) {
        const ing = bySlug.get(FRIDGE_SLUG[f.id] ?? f.id);
        if (ing) frows.push(toFridgeRow(f, { householdId: hid, ingredientId: ing.id, today }));
      }

      const rUp = rrows.filter((r) => remote.receipts.get(r.id!) !== receiptKey(r));
      if (rUp.length) {
        const { error } = await praticoDb.from("receipt").upsert(rUp);
        if (error) throw error;
        for (const r of rUp) remote.receipts.set(r.id!, receiptKey(r));
      }
      const fUp = frows.filter((r) => remote.fridge.get(r.id!) !== fridgeKey(r));
      if (fUp.length) {
        const { error } = await praticoDb.from("fridge_item").upsert(fUp);
        if (error) throw error;
        for (const r of fUp) remote.fridge.set(r.id!, fridgeKey(r));
      }
      const keepF = new Set(frows.map((r) => r.id!));
      const fDel = [...remote.fridge.keys()].filter((id) => !keepF.has(id));
      if (fDel.length) {
        const { error } = await praticoDb.from("fridge_item").delete().in("id", fDel);
        if (error) throw error;
        for (const id of fDel) remote.fridge.delete(id);
      }
      const keepR = new Set(rrows.map((r) => r.id!));
      const rDel = [...remote.receipts.keys()].filter((id) => !keepR.has(id));
      if (rDel.length) {
        const { error } = await praticoDb.from("receipt").delete().in("id", rDel);
        if (error) throw error;
        for (const id of rDel) remote.receipts.delete(id);
      }

      const cur = useApp.getState();
      const wanted = planKey({ chosen: cur.chosen, accepted: cur.weekAccepted, checked: cur.checked, stores: cur.stores, have: cur.have });
      if (wanted !== remote.plan) {
        const { error } = await praticoDb.from("household_plan_state").upsert({
          household_id: hid, chosen: cur.chosen as unknown as Json, accepted: cur.weekAccepted, checked: cur.checked as unknown as Json, stores: cur.stores, have: cur.have,
          updated_by: userId, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        remote.plan = wanted;
      }
    } catch (e) {
      console.warn("[household sync] could not save, will retry on the next change", e);
    } finally {
      pushing = false;
      if (pushAgain) schedulePush();
      else if (pullAgain) schedulePull();
    }
  };

  const pull = async () => {
    if (!ready || stopped) return;
    if (pushing || pushTimer) { pullAgain = true; return; }
    pullAgain = false;
    try { take(await fetchAll(), { fridge: true, plan: true }); } catch (e) { console.warn("[household sync] could not load", e); }
  };

  function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(() => { pushTimer = undefined; void push(); }, PUSH_DELAY); }
  function schedulePull() { clearTimeout(pullTimer); pullTimer = setTimeout(() => { pullTimer = undefined; void pull(); }, PULL_DELAY); }

  const unsubscribe = useApp.subscribe((s, prev) => {
    if (applying || !ready) return;
    if (s.fridge !== prev.fridge || s.receipts !== prev.receipts || s.chosen !== prev.chosen || s.weekAccepted !== prev.weekAccepted || s.checked !== prev.checked || s.stores !== prev.stores || s.have !== prev.have) schedulePush();
  });

  const channel = praticoDb.channel(`household-${hid}`);
  for (const table of ["fridge_item", "receipt", "household_plan_state"] as const) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `household_id=eq.${hid}` }, () => schedulePull());
  }

  return {
    async start() {
      try {
        const snap = await fetchAll();
        if (stopped) return;
        if (prefer === "device") {
          // This device's data replaces the account's: record what the database holds, then push everything over it.
          take(snap, { fridge: false, plan: false });
          // The untouched demo fridge is not the person's data; a fridge they edited is kept whole.
          const cur = useApp.getState();
          if (!fridgeTouched(cur.fridge)) setLocal({ fridge: cur.fridge.filter((f) => !isSample(f)) });
          ready = true;
          channel.subscribe();
          void push();
          return;
        }
        const fridgeEmpty = snap.fridge.length === 0 && snap.receipts.length === 0;
        if (fridgeEmpty) {
          const cur = useApp.getState();
          const keep = cur.fridge.filter((f) => !isSample(f));
          if (keep.length !== cur.fridge.length) setLocal({ fridge: keep });
        }
        take(snap, { fridge: !fridgeEmpty, plan: true });
        ready = true;
        channel.subscribe();
        if (fridgeEmpty || !snap.plan) void push();
      } catch (e) {
        console.warn("[household sync] could not start", e);
      }
    },
    stop() {
      stopped = true; ready = false;
      clearTimeout(pushTimer); clearTimeout(pullTimer);
      unsubscribe();
      void praticoDb.removeChannel(channel);
    },
  };
}

/** What this browser holds, for deciding what to do on login. */
const localSnapshot = (): LocalSnapshot => {
  const s = useApp.getState();
  return { fridge: s.fridge, receipts: s.receipts, chosen: s.chosen, weekAccepted: s.weekAccepted, have: s.have, stores: s.stores, prefs: prefsOf(s), mode: s.mode, meals: s.meals, syncedFor: s.syncedFor };
};

/** Set while a login on a device with data waits for the person to pick which data to keep. */
export type PendingChoice = { uid: string; local: { fridge: number; allergens: number; stores: string[] }; remote: RemoteSummary & { stores: string[]; allergens: number } };
let setPendingGlobal: ((p: PendingChoice | null) => void) | null = null;
let resolveGlobal: ((c: Choice) => void) | null = null;
const listeners = new Set<(p: PendingChoice | null) => void>();
export const usePendingChoice = () => {
  const [p, setP] = useState<PendingChoice | null>(null);
  useEffect(() => { listeners.add(setP); return () => { listeners.delete(setP); }; }, []);
  return { pending: p, choose: (c: Choice) => resolveGlobal?.(c) };
};
setPendingGlobal = (p) => { for (const l of listeners) l(p); };

/** Mount once, near the top of the app. Does nothing while signed out. */
export function useHouseholdSync() {
  const session = useSession();
  const uid = session?.user.id;
  const house = useHousehold(uid);
  const ings = useIngredients();
  const hydrated = useApp((s) => s.hydrated);
  const hid = house.data?.id;
  const ingData = ings.data;
  const [choice, setChoice] = useState<Choice | null>(null);

  // Decide once per login: keep the account's data, upload this device's, or ask.
  useEffect(() => {
    setChoice(null);
    if (!uid || !hid || !hydrated) return;
    let alive = true;
    void (async () => {
      const [p, f, r, pl] = await Promise.all([
        praticoDb.from("profile_prefs").select("lifestyle, proteins, allergens, goals").eq("profile_id", uid).maybeSingle(),
        praticoDb.from("fridge_item").select("id", { count: "exact", head: true }).eq("household_id", hid),
        praticoDb.from("receipt").select("id", { count: "exact", head: true }).eq("household_id", hid),
        praticoDb.from("household_plan_state").select("*").eq("household_id", hid).maybeSingle(),
      ]);
      if (!alive) return;
      const remote: RemoteSummary = {
        prefs: prefsRowUsed(p.data), fridgeItems: f.count ?? 0, receipts: r.count ?? 0, plan: !!pl.data,
        planUsed: !!pl.data && (Object.keys(pl.data.chosen as object).length > 0 || pl.data.accepted || pl.data.stores.length > 0 || pl.data.have.length > 0),
      };
      const local = localSnapshot();
      const d = decide(uid, local, remote);
      if (d !== "ask") { setChoice(d); return; }
      resolveGlobal = (c) => { resolveGlobal = null; setPendingGlobal?.(null); if (alive) setChoice(c); };
      setPendingGlobal?.({ uid, local: { fridge: fridgeTouched(local.fridge) ? local.fridge.length : 0, allergens: local.prefs.allergens.length, stores: local.stores }, remote: { ...remote, stores: pl.data?.stores ?? [], allergens: p.data?.allergens.length ?? 0 } });
    })();
    return () => { alive = false; resolveGlobal = null; setPendingGlobal?.(null); };
  }, [uid, hid, hydrated]);

  useEffect(() => {
    if (!uid || !hid || !ingData || !hydrated || !choice) return;
    const sync = createSync(hid, uid, ingData, choice);
    const prefs = createPrefsSync(uid, choice);
    void sync.start();
    void prefs.start().then(() => useApp.setState({ syncedFor: uid }));
    return () => { sync.stop(); prefs.stop(); };
  }, [uid, hid, ingData, hydrated, choice]);

  // Signing out clears this browser's copy, so the next account on the same device starts clean.
  const prev = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (session === undefined) return;
    if (prev.current && !uid) useApp.setState({ fridge: initialFridge, receipts: [], chosen: {}, weekAccepted: false, checked: {}, have: [], today: null, syncedFor: null, stores: ["Pingo Doce"], lifestyle: "none", proteins: DEFAULT_PREFS.proteins, allergens: [], goals: [], meals: initialMeals });
    prev.current = uid;
  }, [uid, session]);
}
