import { readFileSync } from 'fs'
import { join } from 'path'
import { Metadata } from 'next'
import { LegalDoc } from '@/design'

function getContent(file: string): string {
  return readFileSync(join(process.cwd(), 'src/content/legal', file), 'utf8')
}

export function makeLegalPage(file: string, title: string) {
  const metadata: Metadata = {
    title: `${title} · Blyss`,
    robots: { index: true, follow: true },
  }

  function Page() {
    const content = getContent(file)
    return (
      <div className="bg-[var(--background)] pt-20 text-[var(--text-primary)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-16 md:py-24">
          <LegalDoc>{content}</LegalDoc>
        </div>
      </div>
    )
  }

  return { metadata, Page }
}
