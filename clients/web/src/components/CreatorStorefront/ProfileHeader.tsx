'use client'

import { Organization, Product } from '@polar-sh/sdk'
import { CheckCircle, Mail, Globe, Share2, Check } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/utils/client'

interface ProfileHeaderProps {
  organization: Organization & { email?: string | null }
  products: Product[]
}

export function ProfileHeader({ organization, products }: ProfileHeaderProps) {
  const isVerified = organization.profile_settings?.is_featured || false
  const [shareSuccess, setShareSuccess] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [email, setEmail] = useState('')

  const productCount = products.length
  const followers = 0
  const rating = 0

  const handleShare = async () => {
    const url = `${window.location.origin}/creators/${organization.slug}`
    const title = `Check out ${organization.name} on Blyss`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(url)
        }
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    })
  }

  const handleMessage = () => {
    if (organization.email) {
      window.location.href = `mailto:${organization.email}`
    }
  }

  const handleFollow = async () => {
    if (isFollowing) return

    setShowEmailPrompt(true)
  }

  const handleSubscribe = async () => {
    if (!email || isFollowLoading) return

    setIsFollowLoading(true)
    try {
      await api.POST('/v1/newsletter/subscribe', {
        body: {
          email,
          organization_id: organization.id,
        },
      })
      setIsFollowing(true)
      setShowEmailPrompt(false)
      setEmail('')
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setIsFollowing(true)
        setShowEmailPrompt(false)
      } else {
        alert('Failed to subscribe. Please try again.')
      }
    } finally {
      setIsFollowLoading(false)
    }
  }

  return (
    <section className="relative z-10 -mt-32 mx-auto max-w-7xl px-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-end">
        {/* Avatar */}
        <div className="relative">
          <div className="h-48 w-48 overflow-hidden rounded-xl border-8 border-background bg-surface-container-high">
            {organization.avatar_url ? (
              <img
                src={organization.avatar_url}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                <span className="text-6xl font-bold text-on-surface-variant">
                  {organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Name and Actions */}
        <div className="flex-1 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface">
                {organization.name}
              </h1>
              {isVerified && (
                <p className="mt-1 flex items-center gap-2 font-medium tracking-wide text-primary">
                  <CheckCircle size={16} fill="currentColor" />
                  Master Artisan & Digital Curator
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {organization.email && (
                <button
                  onClick={handleMessage}
                  className="flex items-center gap-2 rounded-full bg-secondary px-6 py-3 font-bold text-on-secondary transition-all hover:bg-surface-container-highest hover:text-on-surface active:scale-95"
                >
                  <Mail size={20} />
                  Message
                </button>
              )}
              <button
                onClick={handleFollow}
                disabled={isFollowing}
                className={`flex items-center gap-2 rounded-full px-8 py-3 font-bold shadow-lg transition-all active:scale-95 ${
                  isFollowing
                    ? 'bg-surface-container-high text-on-surface cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:bg-surface-container-highest hover:text-on-surface'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check size={20} />
                    Following
                  </>
                ) : (
                  'Follow'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Prompt Modal */}
      {showEmailPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-xl">
            <h3 className="mb-4 font-headline text-2xl font-bold">
              Follow {organization.name}
            </h3>
            <p className="mb-4 text-on-surface-variant">
              Enter your email to receive updates about new products and releases.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mb-4 w-full rounded-lg border border-outline bg-surface-container px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailPrompt(false)}
                className="flex-1 rounded-full bg-surface-container px-6 py-3 font-bold text-on-surface transition-all hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={!email || isFollowLoading}
                className="flex-1 rounded-full bg-primary px-6 py-3 font-bold text-on-primary transition-all hover:bg-surface-container-highest hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFollowLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bio & Socials */}
      <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          {organization.bio && (
            <p className="max-w-3xl font-light text-xl leading-relaxed text-on-surface-variant">
              {organization.bio}
            </p>
          )}
          <div className="mt-6 flex gap-6">
            {organization.website && (
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
              >
                <Globe size={20} />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Website
                </span>
              </a>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
            >
              <Share2 size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">
                {shareSuccess ? 'Copied!' : 'Share'}
              </span>
            </button>
          </div>
        </div>
        <div className="flex flex-col justify-end md:col-span-4">
          <div className="flex justify-around rounded-xl bg-surface-container-low p-6">
            <div className="text-center">
              <div className="font-headline text-2xl font-black">{followers}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant">
                Followers
              </div>
            </div>
            <div className="text-center">
              <div className="font-headline text-2xl font-black">{productCount}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant">
                Creations
              </div>
            </div>
            <div className="text-center">
              <div className="font-headline text-2xl font-black">
                {rating > 0 ? rating.toFixed(1) : '—'}
              </div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant">
                Rating
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
