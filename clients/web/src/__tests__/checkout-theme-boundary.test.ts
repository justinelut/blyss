import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, test } from 'vitest'

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('Hosted checkout theme boundary', () => {
  test('defaults to an owned light theme instead of persisted marketplace state', () => {
    const layout = read('src/components/Checkout/CheckoutLayout.tsx')

    expect(layout).toContain("forceTheme={theme ?? 'light'}")
    expect(layout).toContain('data-checkout-shell')
    expect(layout).toContain('bg-[var(--background)]')
    expect(layout).toContain('text-[var(--text-primary)]')
    expect(layout).not.toContain('bg-white md:bg-gray-50')
  })

  test('form fields and payment action consume Blyss variables', () => {
    const form = read(
      'src/components/Checkout/components/CheckoutForm.tsx',
    )

    expect(form).toContain('bg-[var(--surface-sunken)]')
    expect(form).toContain('text-[var(--text-primary)]')
    expect(form).toContain('bg-[var(--accent)]')
    expect(form).toContain('text-[var(--accent-foreground)]')
  })
})
