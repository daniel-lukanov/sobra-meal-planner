// Keeps this person's food settings (diet, proteins, allergens, goals, cooking mode, favourite meals) in step with their profile_prefs row.
import { praticoDb } from "@/integrations/pratico-db/client";
import { useApp, prefsOf } from "@/lib/store";
import { stable } from "@/lib/household-data";
import type { Choice } from "@/lib/sync-choice";
import type { Lifestyle } from "@/lib/prefs";
import type { Database } from "@/integrations/pratico-db/types";

type Row = Database["public"]["Tables"]["profile_prefs"]["Row"];
const DELAY = 500;
const keyOf = (p: { lifestyle: string; proteins: string[]; allergens: string[]; goals: string[]; mode: string; meals: string[] }) =>
  stable([p.lifestyle, [...p.proteins].sort(), [...p.allergens].sort(), [...p.goals].sort(), p.mode, [...p.meals].sort()]);
const localKey = () => { const s = useApp.getState(); return keyOf({ ...prefsOf(s), mode: s.mode, meals: s.meals }); };
const rowKey = (r: Row) => keyOf({ lifestyle: r.lifestyle, proteins: r.proteins, allergens: r.allergens, goals: r.goals, mode: r.cooking_mode, meals: r.meals });

export function createPrefsSync(uid: string, prefer: Choice) {
  let remote: string | null = null, ready = false, stopped = false, applying = false, timer: ReturnType<typeof setTimeout> | undefined;

  const push = async () => {
    if (!ready || stopped) return;
    const want = localKey();
    if (want === remote) return;
    const s = useApp.getState();
    const { error } = await praticoDb.from("profile_prefs").upsert({
      profile_id: uid, lifestyle: s.lifestyle, proteins: s.proteins, allergens: s.allergens, goals: s.goals, cooking_mode: s.mode, meals: s.meals, updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[prefs sync] could not save", error); else remote = want;
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void push(), DELAY); };
  const unsubscribe = useApp.subscribe((s, p) => {
    if (applying || !ready) return;
    if (s.lifestyle !== p.lifestyle || s.proteins !== p.proteins || s.allergens !== p.allergens || s.goals !== p.goals || s.mode !== p.mode || s.meals !== p.meals) schedule();
  });
  return {
    async start() {
      const { data, error } = await praticoDb.from("profile_prefs").select("*").eq("profile_id", uid).maybeSingle();
      if (error || stopped) { if (error) console.warn("[prefs sync] could not load", error); return; }
      remote = data ? rowKey(data) : null;
      if (data && prefer === "account") {
        applying = true;
        try { useApp.setState({ lifestyle: data.lifestyle as Lifestyle, proteins: data.proteins, allergens: data.allergens, goals: data.goals, mode: data.cooking_mode as "prep" | "daily", meals: data.meals }); } finally { applying = false; }
      }
      ready = true;
      if (remote !== localKey()) void push();
    },
    stop() { stopped = true; ready = false; clearTimeout(timer); unsubscribe(); },
  };
}
