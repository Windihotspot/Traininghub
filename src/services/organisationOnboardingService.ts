
import { supabase } from '@/services/supabase'
import type {
  OrganisationApplicationPayload,
  OrganisationApplicationResponse,
} from '@/types/organisationOnboarding'

class OrganisationOnboardingService {
  async register(
    payload: OrganisationApplicationPayload,
  ): Promise<OrganisationApplicationResponse> {
    const { data, error } = await supabase.functions.invoke(
      'organisation-onboarding-submit',
      {
        body: payload,
      },
    )

    if (error) {
      throw new Error(
        error.message || 'Failed to register your organisation.',
      )
    }

    if (!data?.success) {
      throw new Error(
        data?.message || 'Failed to register your organisation.',
      )
    }

    return data as OrganisationApplicationResponse
  }
}

export const organisationOnboardingService =
  new OrganisationOnboardingService()

export default organisationOnboardingService
