export default function SupportedUseCases() {
  return (
    <div className="flex flex-col gap-y-4 text-sm">
      <div className="flex flex-col gap-y-2">
        <p className="font-medium text-[var(--text-primary)]">
          What you can sell on Blyss
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Digital products and recurring subscriptions made by you — ebooks,
          templates, beats, courses, presets, photo packs, software licenses,
          paid newsletters, communities, and creator subscriptions.
        </p>
      </div>

      <div className="flex flex-col gap-y-2">
        <p className="font-medium text-[var(--text-primary)]">
          What&apos;s not allowed
        </p>
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          <li>• Reselling other people&apos;s work without rights</li>
          <li>
            • Adult content, weapons, pirated software, or anything illegal in
            Kenya
          </li>
          <li>• Pyramid schemes, deceptive get-rich-quick offers</li>
          <li>• Hate speech, harassment, or content that targets minors</li>
          <li>
            • Anything covered in our{' '}
            <a
              href="/acceptable-use"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              acceptable-use policy
            </a>
          </li>
        </ul>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[var(--text-muted)]">
          Stores that violate these rules will be paused, and pending payouts
          may be held while we review. We&apos;ll always tell you why.
        </p>
      </div>
    </div>
  )
}
