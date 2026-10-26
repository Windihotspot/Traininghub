
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'

const user = ref<any>(null)
const memberships = ref<any[]>([])
const platformRole = ref<string | null>(null)
const activeOrganisationId = ref<string | null>(null)
const loading = ref(false)

const userRoles = computed(() => [
  ...new Set([
    ...memberships.value.map((membership) => membership.role),
    ...(platformRole.value ? [platformRole.value] : []),
  ]),
])

const activeMembership = computed(() =>
  memberships.value.find(
    (membership) =>
      membership.organisation_id === activeOrganisationId.value,
  ) ?? memberships.value[0] ?? null,
)

const organisation = computed(
  () => activeMembership.value?.organisation ?? null,
)


let currentLoad: Promise<void> | null = null

async function loadCurrentUser(): Promise<void> {
  if (currentLoad) return currentLoad

  currentLoad = (async () => {
    loading.value = true

    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Unable to read auth session:', error)
        return
      }

      const authUser = data.session?.user

      if (!authUser) {
        user.value = null
        memberships.value = []
        platformRole.value = null
        activeOrganisationId.value = null
        return
      }

      user.value = authUser

      const [membershipResult, profileResult] = await Promise.all([
        supabase
          .from('organisation_members')
          .select(`
            organisation_id,
            role,
            organisation:organisations (
              id,
              name,
              slug,
              logo_url
            )
          `)
          .eq('user_id', authUser.id),

        supabase
          .from('profiles')
          .select('platform_role')
          .eq('id', authUser.id)
          .maybeSingle(),
      ])

      if (membershipResult.error) {
        console.error(
          'Unable to load organisation memberships:',
          membershipResult.error,
        )
        return
      }

      if (profileResult.error) {
        console.error(
          'Unable to load platform role:',
          profileResult.error,
        )
        return
      }

      // Do not apply results if the user changed during the requests.
      const { data: latestSession } = await supabase.auth.getSession()

      if (latestSession.session?.user.id !== authUser.id) return

      memberships.value = membershipResult.data ?? []
      platformRole.value = profileResult.data?.platform_role ?? null

      if (
        !memberships.value.some(
          (membership) =>
            membership.organisation_id === activeOrganisationId.value,
        )
      ) {
        activeOrganisationId.value =
          memberships.value[0]?.organisation_id ?? null
      }
    } catch (error) {
      console.error('Failed to load current user:', error)
    } finally {
      loading.value = false
    }
  })()

  try {
    await currentLoad
  } finally {
    currentLoad = null
  }
}

async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) throw error

  user.value = null
  memberships.value = []
  platformRole.value = null
  activeOrganisationId.value = null
}

export function useCurrentUser() {
  return {
    user,
    memberships,
    platformRole,
    userRoles,
    activeOrganisationId,
    activeMembership,
    organisation,
    loading,
    loadCurrentUser,
    signOut,
  }
}
