import { create } from 'zustand';

type PlanState = {
  isPro: boolean;
  setIsPro: (isPro: boolean) => void;
};

export const usePlan = create<PlanState>((set) => ({
  isPro: process.env.NEXT_PUBLIC_IS_PRO === 'true',
  setIsPro: (isPro) => set({ isPro }),
}));
