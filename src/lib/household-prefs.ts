// The other members' food settings, so a shared household plan can respect every diet and allergy in it.
import { useQuery } from "@tanstack/react-query";
import { praticoDb } from "@/integrations/pratico-db/client";
import { useHousehold, useSession } from "@/lib/account";
import type { Lifestyle, Prefs } from "@/lib/prefs";

export type MemberPrefs = Prefs & { meals: string[] };

/** Settings of the housemates (not the signed-in person). Empty when signed out or living alone. */
export function useHousemates(): MemberPrefs[] {
  const session = useSession();
  const uid = session?.user.id;
  const house = useHousehold(uid);
  const others = (house.data?.members ?? []).map((m) => m.id).filter((id) => id !== uid).sort();
  const q = useQuery({
    queryKey: ["household-prefs", others.join(",")],
    enabled: others.length > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<MemberPrefs[]> => {
      const { data, error } = await praticoDb.from("profile_prefs").select("*").in("profile_id", others);
      if (error) throw error;
      return data.map((r) => ({ lifestyle: r.lifestyle as Lifestyle, proteins: r.proteins, allergens: r.allergens, goals: r.goals, meals: r.meals }));
    },
  });
  return others.length > 0 ? q.data ?? [] : [];
}
