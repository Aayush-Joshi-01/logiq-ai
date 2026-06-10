import { create } from 'zustand'

// NOT persisted — Supabase manages session persistence via AsyncStorage internally
export const useAuthStore = create((set) => ({
  user:          null,   // Supabase User object
  session:       null,   // Supabase Session object
  isGuest:       false,
  profile:       null,   // public.profiles row
  sessionLoaded: false,  // true once initial getSession() has resolved

  setUser:    (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null, sessionLoaded: true }),
  setGuest:   (isGuest) => set({ isGuest, sessionLoaded: true }),
  setProfile: (profile) => set({ profile }),

  clearAuth: () => set({ user: null, session: null, isGuest: false, profile: null }),
}))
