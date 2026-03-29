import { create } from "zustand";
import type { CreateTradePactBody, CreateGoalPactBody } from "@safe-meet/shared";

interface TradeDraft extends Partial<Omit<CreateTradePactBody, "type">> {
  type: "TRADE";
}
interface GoalDraft extends Partial<Omit<CreateGoalPactBody, "type">> {
  type: "GOAL";
}
type PactDraft = TradeDraft | GoalDraft;

interface PactCreationStore {
  draft: PactDraft;
  setDraftField: <K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) => void;
  resetDraft: (type: "TRADE" | "GOAL") => void;
}

export const usePactCreationStore = create<PactCreationStore>((set) => ({
  draft: { type: "TRADE" },
  setDraftField: (key, value) =>
    set((s) => ({ draft: { ...s.draft, [key]: value } })),
  resetDraft: (type) => set({ draft: { type } }),
}));
