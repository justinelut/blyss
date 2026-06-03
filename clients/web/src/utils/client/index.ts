import { toast } from '@/components/Toast/use-toast'
import {
  getSessionToken,
  getSessionTokenHeaderName,
} from '@/utils/session-token'
import {
  createClient as baseCreateClient,
  Client,
  Middleware,
} from '@/lib/api'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { NextRequest } from 'next/server'

const errorMiddleware: Middleware = {
  onError: async () => {
    toast({
      title: 'A network error occurred',
      description: 'Please try again later',
    })
  },
}

// Dynamically attach the X-Guest-Session-Token header on every client-side
// request so guest carts work. Without this, the header was baked in at
// module load — when the cookie didn't exist yet — and never updated, so
// every cart POST went without the token, the backend rejected it with 401,
// and the cart appeared to "add then disappear".
const guestSessionMiddleware: Middleware = {
  onRequest: async ({ request }) => {
    const token = getSessionToken()
    if (token) {
      request.headers.set(getSessionTokenHeaderName(), token)
    }
    return request
  },
}

export const createClientSideAPI = (token?: string): Client => {
  const api = baseCreateClient(process.env.NEXT_PUBLIC_API_URL as string, token)
  api.use(guestSessionMiddleware)
  api.use(errorMiddleware)
  return api
}

export const api = createClientSideAPI()

export const createServerSideAPI = async (
  headers: NextRequest['headers'],
  cookies: ReadonlyRequestCookies,
  token?: string,
): Promise<Client> => {
  let apiHeaders = {}

  const xForwardedFor = headers.get('X-Forwarded-For')

  if (xForwardedFor) {
    apiHeaders = {
      ...apiHeaders,
      'X-Forwarded-For': xForwardedFor,
    }
  }

  apiHeaders = {
    ...apiHeaders,
    Cookie: cookies.toString(),
  }

  // When running inside GitHub Codespaces, we need to pass a token to access forwarded ports
  if (process.env.GITHUB_TOKEN) {
    apiHeaders = {
      ...apiHeaders,
      'X-Github-Token': process.env.GITHUB_TOKEN,
    }
  }

  // Use POLAR_API_URL for server-side requests (e.g., in Docker containers)
  // Fall back to NEXT_PUBLIC_API_URL for local development
  const apiUrl =
    process.env.POLAR_API_URL || (process.env.NEXT_PUBLIC_API_URL as string)

  const client = baseCreateClient(apiUrl, token, apiHeaders)

  return client
}
