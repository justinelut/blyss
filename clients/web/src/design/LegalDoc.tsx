'use client'

import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface LegalDocProps {
  /** Raw markdown content. */
  children: string
  className?: string
}

/**
 * LegalDoc — sanitized markdown renderer.
 *
 * Used for: legal pages (Terms, Privacy, Acceptable Use, Refunds), help
 * articles, AND subscription benefit perk content created by creators.
 *
 * Sanitization (rehype-sanitize default schema): allows paragraphs, headings,
 * bold/italic, lists, links (with rel="noopener noreferrer"), blockquotes,
 * horizontal rules, inline code, code blocks. Strips: <script>, <iframe>,
 * style attributes, JS event handlers, javascript: URLs.
 *
 * Visual: max 64ch column with the Blyss type scale per plan §3.3.
 *
 *   <LegalDoc>{`# Heading\n\nBody...`}</LegalDoc>
 */
export const LegalDoc = ({ children, className }: LegalDocProps) => {
  return (
    <div
      className={cn(
        // Type scale
        'font-sans text-[var(--text-secondary)] leading-[1.6] text-[16px]',
        'max-w-[64ch]',
        // Headings
        '[&_h1]:font-display [&_h1]:font-semibold [&_h1]:text-[clamp(32px,4vw,48px)] [&_h1]:tracking-[-0.02em] [&_h1]:mt-12 [&_h1]:mb-6 [&_h1]:text-[var(--text-primary)]',
        '[&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-[clamp(24px,2.5vw,32px)] [&_h2]:tracking-[-0.01em] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[var(--text-primary)]',
        '[&_h3]:font-display [&_h3]:font-medium [&_h3]:text-[20px] [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[var(--text-primary)]',
        // Paragraphs + lists
        '[&_p]:my-4',
        '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:my-1.5',
        // Inline emphasis
        '[&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]',
        '[&_em]:italic',
        '[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[var(--accent-hover)]',
        // Blockquote
        '[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--text-secondary)]',
        // Code
        '[&_code]:font-mono [&_code]:text-[14px] [&_code]:bg-[var(--surface-sunken)] [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5',
        '[&_pre]:my-6 [&_pre]:bg-[var(--surface-sunken)] [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // HR
        '[&_hr]:my-10 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-[var(--border)]',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // External links open in new tab and have rel for safety.
          a: ({ href, children: linkChildren, ...rest }) => {
            const isExternal = !!href && /^https?:\/\//i.test(href)
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...rest}
              >
                {linkChildren}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
