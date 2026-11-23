import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('farmpilot_token') || null,
  user:  JSON.parse(localStorage.getItem('farmpilot_user') || 'null'),

  setAuth: (user, token) => {
    localStorage.setItem('farmpilot_token', token)
    localStorage.setItem('farmpilot_user', JSON.stringify(user))
    set({ user, token })
  },

  clearAuth: () => {
    localStorage.removeItem('farmpilot_token')
    localStorage.removeItem('farmpilot_user')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
