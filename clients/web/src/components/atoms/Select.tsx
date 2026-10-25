'use client'

import * as React from 'react'

import {
  SelectContent as SelectContentPrimitive,
  SelectGroup as SelectGroupPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectLabel as SelectLabelPrimitive,
  Select as SelectPrimitive,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from '@/components/ui/select'
import { Trigger as SelectTriggerBase } from '@radix-ui/react-select'
import { twMerge } from 'tailwind-merge'

const Select = SelectPrimitive

const SelectGroup = SelectGroupPrimitive

const SelectValue = SelectValuePrimitive

const SelectTrigger = ({
  ref,
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectTriggerPrimitive>) => (
  <SelectTriggerPrimitive
    ref={ref}
    className={twMerge(
      'flex cursor-pointer flex-row gap-x-2 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-3 text-[var(--text-primary)] shadow-xs transition-colors hover:border-[var(--border-strong)]',
      className,
    )}
    {...props}
  >
    {children}
  </SelectTriggerPrimitive>
)
SelectTrigger.displayName = SelectTriggerPrimitive.displayName

const SelectContent = ({
  ref,
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectContentPrimitive>) => (
  <SelectContentPrimitive
    ref={ref}
    className={twMerge(
      'rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]',
      className,
    )}
    {...props}
  >
    {children}
  </SelectContentPrimitive>
)
SelectContent.displayName = SelectContentPrimitive.displayName

const SelectLabel = ({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof SelectLabelPrimitive>) => (
  <SelectLabelPrimitive ref={ref} className={className} {...props} />
)
SelectLabel.displayName = SelectLabelPrimitive.displayName

const SelectItem = ({
  ref,
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectItemPrimitive>) => (
  <SelectItemPrimitive
    ref={ref}
    className={twMerge(className, 'cursor-pointer rounded-lg')}
    {...props}
  >
    {children}
  </SelectItemPrimitive>
)
SelectItem.displayName = SelectItemPrimitive.displayName

const SelectSeparator = ({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof SelectSeparatorPrimitive>) => (
  <SelectSeparatorPrimitive
    ref={ref}
    className={twMerge('', className)}
    {...props}
  />
)
SelectSeparator.displayName = SelectSeparatorPrimitive.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectTriggerBase,
  SelectValue,
}
