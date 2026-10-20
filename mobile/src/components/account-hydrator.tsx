import { useEffect } from "react";
import { budgetCardToRow, rowToBudgetCard, rowToDistributionEntry, rowToGoal } from "@vitals/shared";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

// Draws nothing. Mounted once at the app root. When someone is signed in it
// loads their saved cards, goals and profile into the store; when they sign
// out it resets the store to a fresh guest state.
export function AccountHydrator() {
  useEffect(() => {
    async function loadUserData(userId: string) {
      const [cardsRes, goalsRes, logRes, profileRes] = await Promise.all([
        supabase.from("budget_cards").select("*").eq("user_id", userId).order("sort_order"),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("distribution_log").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
        supabase.from("profiles").select("financial_profile").eq("id", userId).single(),
      ]);

      const store = useStore.getState();
      const savedCards = cardsRes.data ?? [];

      if (savedCards.length === 0) {
        // First time this user opens the app: save the two starting cards
        // (Income and Float) so they exist in the database from now on.
        await Promise.all(
          store.budgetCards.map((card, i) =>
            supabase.from("budget_cards").insert(budgetCardToRow(card, userId, i))
          )
        );
      } else {
        store.setBudgetCards(savedCards.map(rowToBudgetCard));
      }

      store.setGoals((goalsRes.data ?? []).map(rowToGoal));
      store.setDistributionLog((logRes.data ?? []).map(rowToDistributionEntry));
      // Set last: once the user id is set, every change starts saving to the
      // database, so everything above must already be loaded.
      store.setFinancialProfile(profileRes.data?.financial_profile ?? {});
      store.setUserId(userId);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserData(session.user.id);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        useStore.getState().resetToGuestState();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
