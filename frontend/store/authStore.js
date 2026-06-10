import { create } from 'zustand'

// NOT persisted — Supabase manages session persistence via AsyncStorage internally
export const useAuthStore = create((set) => ({
  user:    null,    // Supabase User object
  session: null,    // Supabase Session object
  isGuest: false,
  profile: null,    // public.profiles row

  setUser:    (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setGuest:   (isGuest) => set({ isGuest }),
  setProfile: (profile) => set({ profile }),

  clearAuth: () => set({ user: null, session: null, isGuest: false, profile: null }),
}))
