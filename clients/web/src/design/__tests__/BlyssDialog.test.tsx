import { describe, test, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import {
  BlyssDialog,
  BlyssDialogBody,
  BlyssDialogEyebrow,
  BlyssDialogHeader,
  BlyssDialogTitle,
} from '../BlyssDialog'

/**
 * BlyssDialog — branded modal replacement for shadcn Dialog on
 * marketing + storefront surfaces.
 *
 * Plan §3.4 (motion + materials): warm scrim, paper card, smooth
 * easing, no shadow / gradient on the card.
 */

describe('BlyssDialog (§3.4 motion + materials)', () => {
  test('renders nothing when open=false', () => {
    const { queryByRole } = render(
      <BlyssDialog open={false} onOpenChange={() => {}}>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    expect(queryByRole('dialog')).toBeNull()
  })

  test('renders header + body + close button when open', () => {
    const { getByRole, getByText } = render(
      <BlyssDialog open onOpenChange={() => {}} titleId="t">
        <BlyssDialogHeader>
          <BlyssDialogEyebrow>About</BlyssDialogEyebrow>
          <BlyssDialogTitle id="t">Jane Doe</BlyssDialogTitle>
        </BlyssDialogHeader>
        <BlyssDialogBody>
          <p>Long bio text.</p>
        </BlyssDialogBody>
      </BlyssDialog>,
    )
    expect(getByRole('dialog')).toBeTruthy()
    expect(getByText('About')).toBeTruthy()
    expect(getByText('Jane Doe')).toBeTruthy()
    expect(getByText('Long bio text.')).toBeTruthy()
    // Close button is rendered by default
    expect(getByRole('button', { name: 'Close' })).toBeTruthy()
  })

  test('close button calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    const { getByRole } = render(
      <BlyssDialog open onOpenChange={onOpenChange}>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('Escape key dismisses the dialog', () => {
    const onOpenChange = vi.fn()
    render(
      <BlyssDialog open onOpenChange={onOpenChange}>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('backdrop click dismisses the dialog', () => {
    const onOpenChange = vi.fn()
    const { getByRole } = render(
      <BlyssDialog open onOpenChange={onOpenChange}>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    // The backdrop is a button labeled 'Close dialog'
    fireEvent.click(getByRole('button', { name: 'Close dialog' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('hideCloseButton suppresses the × button', () => {
    const { queryByRole } = render(
      <BlyssDialog open onOpenChange={() => {}} hideCloseButton>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    // 'Close dialog' (backdrop) still exists; 'Close' (× button) does not
    expect(queryByRole('button', { name: 'Close' })).toBeNull()
    expect(queryByRole('button', { name: 'Close dialog' })).toBeTruthy()
  })

  test('dialog card has no drop-shadow class (per §3.4)', () => {
    const { getByRole } = render(
      <BlyssDialog open onOpenChange={() => {}}>
        <BlyssDialogHeader>
          <BlyssDialogTitle>Hi</BlyssDialogTitle>
        </BlyssDialogHeader>
      </BlyssDialog>,
    )
    const cls = getByRole('dialog').className
    expect(cls).not.toMatch(/shadow-(md|lg|xl|2xl)/)
    expect(cls).not.toMatch(/bg-gradient/)
  })
})
