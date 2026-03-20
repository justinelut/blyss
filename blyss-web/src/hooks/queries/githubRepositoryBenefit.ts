import { api } from '@/utils/client'
import { unwrap } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { defaultRetry } from './retry'

export const useListIntegrationsGithubRepositoryBenefitUserRepositories = () =>
  useQuery({
    queryKey: ['integrationsGithubRepositoryBenefitUserRepositories'],
    queryFn: () =>
      unwrap(
        api.GET('/v1/integrations/github_repository_benefit/user/repositories'),
      ),
    retry: defaultRetry,
  })
