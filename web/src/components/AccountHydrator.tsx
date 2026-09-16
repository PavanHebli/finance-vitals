"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useStore,
  budgetCardToRow,
  rowToBudgetCard,
  rowToGoal,
  rowToDistributionEntry,
} from "@/lib/store";
import type { FinancialProfile } from "@/lib/types";

// Mount-once, renders nothing. On login, pulls a signed-in user's
// budgetCards/goals/distributionLog/financialProfile out of Supabase into
// the store; on logout, resets the store back to fresh Guest defaults so a
// new Guest session on the same browser never shows a previous user's data.
// Guests who never sign in never trigger any Supabase read here.
export function AccountHydrator() {
  useEffect(() => {
    const supabase = createClient();
    const { setBudgetCards, setGoals, setDistributionLog, setFinancialProfile, hydrateUserId, resetToGuestState } =
      useStore.getState();

    async function hydrate(userId: string) {
      const [cardsRes, goalsRes, logRes, profileRes] = await Promise.all([
        supabase.from("budget_cards").select("*").eq("user_id", userId).order("sort_order"),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("distribution_log").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
        supabase.from("profiles").select("financial_profile").eq("id", userId).single(),
      ]);

      const existingCards = cardsRes.data ?? [];

      if (existingCards.length === 0) {
        // First time this user has ever been hydrated — the store's current
        // in-memory defaults (income + cash) have never been persisted.
        // Insert them now so they become durable from this point forward.
        const defaults = useStore.getState().budgetCards;
        await Promise.all(
          defaults.map((card, i) => supabase.from("budget_cards").insert(budgetCardToRow(card, userId, i)))
        );
      } else {
        setBudgetCards(existingCards.map(rowToBudgetCard));
      }

      setGoals((goalsRes.data ?? []).map(rowToGoal));
      setDistributionLog((logRes.data ?? []).map(rowToDistributionEntry));
      setFinancialProfile((profileRes.data?.financial_profile as Partial<FinancialProfile>) ?? {});

      // Last: only once state is fully populated does this open the
      // write-through gate on every store action.
      hydrateUserId(userId);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) hydrate(session.user.id);
      else hydrateUserId(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        hydrate(session.user.id);
      } else {
        resetToGuestState();
        hydrateUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
