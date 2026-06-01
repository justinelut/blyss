import { schemas } from '@/lib/api'
import Login from './Login'

interface AuthModalProps {
  returnTo?: string
  returnParams?: Record<string, string>
  signup?: schemas['UserSignupAttribution']
}

export const AuthModal = ({
  returnTo,
  returnParams,
  signup,
}: AuthModalProps) => {
  const isSignup = signup !== undefined
  const title = isSignup ? 'Sign Up' : 'Log In'

  const copy = isSignup ? (
    <p className="font-sans text-xl text-[var(--text-secondary)]">
      Sell your digital products and subscriptions on Blyss. M-Pesa or card,
      paid out within 24 hours.
    </p>
  ) : null

  return (
    <div className="overflow-y-auto p-12">
      <div className="flex flex-col justify-between gap-y-16">
        <div className="flex flex-col gap-y-4">
          <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)]">
            {title}
          </h1>
          {copy}
        </div>

        <div className="flex flex-col gap-y-12">
          <Login
            returnTo={returnTo}
            returnParams={returnParams}
            signup={signup}
          />
        </div>
      </div>
    </div>
  )
}
