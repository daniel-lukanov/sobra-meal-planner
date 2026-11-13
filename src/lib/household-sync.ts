// Keeps the browser's fridge, receipts, accepted week and list ticks in step with the household's rows in the database.
//  * on sign-in the database wins, except for a household that has nothing yet: then this browser's data is uploaded
//    (the prototype's sample fridge is not)
//  * later changes in the app are pushed after a short pause, row by row; changes by housemates arrive through Realtime
//  * a change by someone else is never applied while this browser still has an unsent change
import { useEffect, useRef } from "react";
import { sobraDb } from "@/integrations/sobra-db/client";
import { useApp } from "@/lib/store";
import { initialFridge, type FridgeItem, type Receipt } from "@/data/fridge";
import { useIngredients } from "@/lib/db-queries";
import { useHousehold, useSession } from "@/lib/account";
import type { CatIngredient } from "@/lib/plan-from-db";
import type { Json, Database } from "@/integrations/sobra-db/types";
import {
  FRIDGE_SLUG, fridgeFromRow, fridgeKey, normalize, receiptFromRow, receiptKey, stable, toFridgeRow, toReceiptRow,
  type FridgeInsert, type FridgeRow, type ReceiptRow,
} from "@/lib/household-data";

type PlanRow = Database["public"]["Tables"]["household_plan_state"]["Row"];
type Snapshot = { fridge: FridgeRow[]; receipts: ReceiptRow[]; plan: PlanRow | null };
type Remote = { fridge: Map<string, string>; receipts: Map<string, string>; plan: string | null };

const PUSH_DELAY = 400, PULL_DELAY = 300;
const isSample = (f: FridgeItem) => !f.receiptId && initialFridge.some((x) => x.id === f.id && x.name === f.name);
const fridgeListKey = (l: FridgeItem[]) => stable([...l].sort((a, b) => (a.uid ?? "").localeCompare(b.uid ?? "")).map((f) => [f.uid, f.id, f.name, f.daysLeft, f.maxDays, f.receiptId ?? null, f.qty ?? null]));
const receiptListKey = (l: Receipt[]) => stable([...l].sort((a, b) => a.id.localeCompare(b.id)).map((r) => [r.id, r.store, r.date, r.total]));
const planKey = (p: { chosen: unknown; accepted: boolean; checked: unknown }) => stable({ chosen: p.chosen, accepted: p.accepted, checked: p.checked });

function createSync(hid: string, userId: string, ings: CatIngredient[]) {
  const bySlug = new Map(ings.map((i) => [i.slug, i]));
  const byId = new Map(ings.map((i) => [i.id, i]));
  let remote: Remote = { fridge: new Map(), receipts: new Map(), plan: null };
  let ready = false, stopped = false, applying = false, pushing = false, pushAgain = false, pullAgain = false;
  let pushTimer: ReturnType<typeof setTimeout> | undefined, pullTimer: ReturnType<typeof setTimeout> | undefined;

  const fetchAll = async (): Promise<Snapshot> => {
    const [f, r, p] = await Promise.all([
      sobraDb.from("fridge_item").select("*").eq("household_id", hid).order("created_at", { ascending: false }),
      sobraDb.from("receipt").select("*").eq("household_id", hid).order("created_at", { ascending: false }),
      sobraDb.from("household_plan_state").select("*").eq("household_id", hid).maybeSingle(),
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
      if (planKey({ chosen, accepted: snap.plan.accepted, checked }) !== planKey({ chosen: cur.chosen, accepted: cur.weekAccepted, checked: cur.checked })) {
        patch.chosen = chosen; patch.weekAccepted = snap.plan.accepted; patch.checked = checked;
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
        const { error } = await sobraDb.from("receipt").upsert(rUp);
        if (error) throw error;
        for (const r of rUp) remote.receipts.set(r.id!, receiptKey(r));
      }
      const fUp = frows.filter((r) => remote.fridge.get(r.id!) !== fridgeKey(r));
      if (fUp.length) {
        const { error } = await sobraDb.from("fridge_item").upsert(fUp);
        if (error) throw error;
        for (const r of fUp) remote.fridge.set(r.id!, fridgeKey(r));
      }
      const keepF = new Set(frows.map((r) => r.id!));
      const fDel = [...remote.fridge.keys()].filter((id) => !keepF.has(id));
      if (fDel.length) {
        const { error } = await sobraDb.from("fridge_item").delete().in("id", fDel);
        if (error) throw error;
        for (const id of fDel) remote.fridge.delete(id);
      }
      const keepR = new Set(rrows.map((r) => r.id!));
      const rDel = [...remote.receipts.keys()].filter((id) => !keepR.has(id));
      if (rDel.length) {
        const { error } = await sobraDb.from("receipt").delete().in("id", rDel);
        if (error) throw error;
        for (const id of rDel) remote.receipts.delete(id);
      }

      const cur = useApp.getState();
      const wanted = planKey({ chosen: cur.chosen, accepted: cur.weekAccepted, checked: cur.checked });
      if (wanted !== remote.plan) {
        const { error } = await sobraDb.from("household_plan_state").upsert({
          household_id: hid, chosen: cur.chosen as unknown as Json, accepted: cur.weekAccepted, checked: cur.checked as unknown as Json,
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
    if (s.fridge !== prev.fridge || s.receipts !== prev.receipts || s.chosen !== prev.chosen || s.weekAccepted !== prev.weekAccepted || s.checked !== prev.checked) schedulePush();
  });

  const channel = sobraDb.channel(`household-${hid}`);
  for (const table of ["fridge_item", "receipt", "household_plan_state"] as const) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `household_id=eq.${hid}` }, () => schedulePull());
  }

  return {
    async start() {
      try {
        const snap = await fetchAll();
        if (stopped) return;
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
      void sobraDb.removeChannel(channel);
    },
  };
}

/** Mount once, near the top of the app. Does nothing while signed out. */
export function useHouseholdSync() {
  const session = useSession();
  const uid = session?.user.id;
  const house = useHousehold(uid);
  const ings = useIngredients();
  const hydrated = useApp((s) => s.hydrated);
  const hid = house.data?.id;
  const ingData = ings.data;

  useEffect(() => {
    if (!uid || !hid || !ingData || !hydrated) return;
    const sync = createSync(hid, uid, ingData);
    void sync.start();
    return () => sync.stop();
  }, [uid, hid, ingData, hydrated]);

  // Signing out clears this browser's copy, so the next account on the same device starts clean.
  const prev = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (session === undefined) return;
    if (prev.current && !uid) useApp.setState({ fridge: initialFridge, receipts: [], chosen: {}, weekAccepted: false, checked: {} });
    prev.current = uid;
  }, [uid, session]);
}
