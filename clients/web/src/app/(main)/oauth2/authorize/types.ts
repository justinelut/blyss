import { operations } from '@/lib/api'

export type AuthorizeResponse =
  operations['oauth2:authorize']['responses']['200']['content']['application/json']
