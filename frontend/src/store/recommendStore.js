import { create } from 'zustand'

const useRecommendStore = create((set) => ({
  recommendations: null,
  wizardAnswers:   null,

  setWizardAnswers:   (a) => set({ wizardAnswers: a }),
  setRecommendations: (r) => set({ recommendations: r }),
  clear: () => set({ recommendations: null, wizardAnswers: null }),
}))

export default useRecommendStore
