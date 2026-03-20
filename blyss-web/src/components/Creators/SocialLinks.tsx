'use client'

import { schemas } from '@/lib/api'
import { Globe, Instagram } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'

interface SocialLinksProps {
  links: schemas['SocialLinks']
}

export const SocialLinks = ({ links }: SocialLinksProps) => {
  const platforms = [
    {
      key: 'twitter' as const,
      icon: FaXTwitter,
      label: 'Twitter',
    },
    {
      key: 'instagram' as const,
      icon: Instagram,
      label: 'Instagram',
    },
    {
      key: 'website' as const,
      icon: Globe,
      label: 'Website',
    },
  ]

  const availableLinks = platforms.filter((p) => links[p.key])

  if (availableLinks.length === 0) return null

  return (
    <div className="flex gap-3">
      {availableLinks.map(({ key, icon: Icon, label }) => (
        <a
          key={key}
          href={links[key] || ''}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <Icon size={24} />
        </a>
      ))}
    </div>
  )
}
