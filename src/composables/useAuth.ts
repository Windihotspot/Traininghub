import { ref, computed } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'

// App-wide singleton: one listener, shared state.
const session = ref<Session | null>(null)
const ready = ref(false)
let started = false

function init() {
  if (started) return
  started = true
  // getSession() waits for supabase-js to finish parsing invite/recovery tokens in the URL
  supabase.auth.getSession().then(({ data }) => { session.value = data.session; ready.value = true })
  supabase.auth.onAuthStateChange((_event, s) => { session.value = s; ready.value = true })
}

export function useAuth() {
  init()
  const user = computed(() => session.value?.user ?? null)
  const origin = window.location.origin

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }
  /** returns true when the user must confirm their email before a session exists */
  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${origin}/login` },
    })
    if (error) throw error
    return !data.session
  }
  async function sendReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/set-password` })
    if (error) throw error
  }
  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }
  async function signOut() { await supabase.auth.signOut() }

  return { session, user, ready, signIn, signUp, sendReset, updatePassword, signOut }
}
