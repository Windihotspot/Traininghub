import ApiService from '@/services/api' // Update this import if your existing file uses a different path/name.
import type {
  OrganisationApplicationPayload,
  OrganisationApplicationResponse,
} from '@/types/organisationOnboarding'

/** Public application submission. The Edge Function validates input and writes with server-side privileges. */
export const organisationOnboardingService = {
  submit(payload: OrganisationApplicationPayload) {
    return ApiService.post<OrganisationApplicationResponse>(
      '/organisation-onboarding-submit',
      payload,
    )
  },
}
