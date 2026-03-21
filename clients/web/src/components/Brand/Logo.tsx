'use client'

import { useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface LogoProps {
  variant?: 'light' | 'dark' | 'email'
  className?: string
  size?: number
}

/**
 * Centralized Logo component for Blyss branding
 *
 * Supports three variants:
 * - light: For light backgrounds
 * - dark: For dark backgrounds
 * - email: For email templates
 *
 * Includes error handling with text fallback to "Blyss" if logo fails to load
 */
export const Logo = ({ variant = 'light', className, size }: LogoProps) => {
  const [error, setError] = useState(false)

  // Text fallback if logo fails to load
  if (error) {
    return <span className={twMerge('font-bold', className)}>Blyss</span>
  }

  // Get logo URL based on variant
  const getLogoUrl = (variant: 'light' | 'dark' | 'email'): string => {
    switch (variant) {
      case 'dark':
        return '/blyss-logo-dark.svg'
      case 'email':
        return '/blyss-logo-email.png'
      case 'light':
      default:
        return '/blyss-logo.svg'
    }
  }

  const logoUrl = getLogoUrl(variant)
  const altText = 'Blyss Logo'

  const handleError = () => {
    console.warn(`Failed to load logo asset: ${logoUrl}`)
    setError(true)
  }

  return (
    <img
      src={logoUrl}
      alt={altText}
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
      onError={handleError}
    />
  )
}
