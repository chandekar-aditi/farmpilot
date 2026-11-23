import { create } from 'zustand'

const useProjectStore = create((set) => ({
  activeProject:  null,
  setupData:      null,
  solutionData:   null,
  timelineData:   null,

  setProject:      (p) => set({ activeProject: p }),
  setSetupData:    (d) => set({ setupData: d }),
  setSolutionData: (d) => set({ solutionData: d }),
  setTimelineData: (d) => set({ timelineData: d }),
  clearProject:    ()  => set({ activeProject: null, setupData: null, solutionData: null, timelineData: null }),
}))

export default useProjectStore
