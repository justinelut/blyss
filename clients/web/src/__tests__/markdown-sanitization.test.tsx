import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LegalDoc } from '@/design'

/**
 * Markdown sanitization test — plan/tasks/phase-09-testing.md §9.2.7.
 * Feed dangerous content to LegalDoc; assert it's stripped.
 */
describe('LegalDoc sanitization', () => {
  const dangerous = [
    { name: 'script tag', input: '<script>alert("xss")</script>', forbidden: 'alert' },
    { name: 'iframe', input: '<iframe src="https://evil.com"></iframe>', forbidden: 'iframe' },
    { name: 'javascript URL', input: '[click](javascript:alert(1))', forbidden: 'javascript:' },
    { name: 'event handler', input: '<div onload="steal()">hi</div>', forbidden: 'onload' },
    { name: 'img onerror', input: '<img src=x onerror="steal()">', forbidden: 'onerror' },
  ]

  for (const { name, input, forbidden } of dangerous) {
    test(`strips ${name}`, () => {
      const { container } = render(<LegalDoc>{input}</LegalDoc>)
      expect(container.innerHTML).not.toContain(forbidden)
    })
  }

  test('allows safe markdown', () => {
    const { container } = render(
      <LegalDoc>{`# Hello\n\n**bold** and [link](https://blyss.co.ke)`}</LegalDoc>,
    )
    expect(container.querySelector('h1')).toBeTruthy()
    expect(container.querySelector('strong')).toBeTruthy()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://blyss.co.ke')
  })
})
