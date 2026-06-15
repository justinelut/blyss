import Login from '@/components/Auth/Login'
import { Metadata } from 'next'
import { LoginShell } from './LoginShell'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Blyss — Kenya\'s modern creator marketplace.',
}

export default async function Page(props: {
  searchParams: Promise<{ return_to?: string; from?: string }>
}) {
  const searchParams = await props.searchParams
  const { return_to, ...rest } = searchParams

  return (
    <LoginShell>
      <Login returnTo={return_to} returnParams={rest} />
    </LoginShell>
  )
}
