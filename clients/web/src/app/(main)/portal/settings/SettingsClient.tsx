'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toast/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Button from '@/components/atoms/Button'
import CountryPicker from '@/components/atoms/CountryPicker'
import { enums } from '@/lib/api'

interface Address {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

interface Profile {
  email: string
  name: string | null
  billing_address: Address | null
  tax_id: string | null
}

/**
 * Unified buyer profile editor.
 *
 * One form, one save action — fan-writes to every Customer row
 * the user owns across all creators. Blyss-as-MoR.
 *
 * Email is shown read-only. It's the link key between the user's
 * WebUser identity and the per-creator Customer rows; changing
 * it via this form would orphan past purchases. (Email change is
 * a separate flow on /settings/account.)
 */
export const SettingsClient = ({ initial }: { initial: Profile }) => {
  const router = useRouter()
  const [name, setName] = useState(initial.name ?? '')
  const [address, setAddress] = useState<Address>(
    initial.billing_address ?? { country: 'KE' },
  )
  const [saving, setSaving] = useState(false)

  const setField = (field: keyof Address) => (value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Strip empty strings — Address.country is the only required field.
      const cleaned: Address = {
        country: address.country || 'KE',
      }
      if (address.line1) cleaned.line1 = address.line1
      if (address.line2) cleaned.line2 = address.line2
      if (address.city) cleaned.city = address.city
      if (address.state) cleaned.state = address.state
      if (address.postal_code) cleaned.postal_code = address.postal_code

      const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${apiBase}/v1/me/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || null,
          billing_address: cleaned,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Could not save profile')
      }
      toast({ title: 'Profile saved' })
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile'
      toast({ title: msg, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-8">
      <header className="flex flex-col gap-y-2">
        <h2 className="text-3xl tracking-tight">Settings</h2>
        <p className="max-w-prose text-[var(--text-muted)]">
          Blyss handles billing for every purchase across all creators.
          The details below appear on your receipts and tax invoices.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-y-8 max-w-xl">
        <section className="flex flex-col gap-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Account
          </h3>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={initial.email}
              disabled
              readOnly
            />
            <p className="text-xs text-[var(--text-muted)]">
              Email changes are managed in your account settings.
            </p>
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
        </section>

        <section className="flex flex-col gap-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Billing address
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Used on receipts for every creator you buy from.
          </p>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="line1">Address</Label>
            <Input
              id="line1"
              value={address.line1 ?? ''}
              onChange={(e) => setField('line1')(e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="line2">Apartment, suite, etc. (optional)</Label>
            <Input
              id="line2"
              value={address.line2 ?? ''}
              onChange={(e) => setField('line2')(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city ?? ''}
                onChange={(e) => setField('city')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input
                id="postal_code"
                value={address.postal_code ?? ''}
                onChange={(e) => setField('postal_code')(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="state">State / region</Label>
              <Input
                id="state"
                value={address.state ?? ''}
                onChange={(e) => setField('state')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="country">Country</Label>
              <CountryPicker
                value={address.country ?? 'KE'}
                onChange={(country) => setField('country')(country)}
                allowedCountries={enums.addressInputCountryValues}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Payment methods
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Cards and M-Pesa numbers are entered securely each time you
            purchase. Blyss does not store your full payment details.
            For active subscriptions, the renewal payment method is
            tied to the original subscription and managed automatically.
          </p>
        </section>

        <div className="flex flex-row items-center gap-x-4">
          <Button type="submit" loading={saving} disabled={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
