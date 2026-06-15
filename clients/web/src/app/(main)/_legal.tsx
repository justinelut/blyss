import { readFileSync } from 'fs'
import { join } from 'path'
import { Metadata } from 'next'
import { LegalPageShell } from './_legal/LegalPageShell'

function getContent(file: string): string {
  return readFileSync(join(process.cwd(), 'src/content/legal', file), 'utf8')
}

export function makeLegalPage(file: string, title: string) {
  const metadata: Metadata = {
    title: title,
    robots: { index: true, follow: true },
  }

  function Page() {
    const content = getContent(file)
    return <LegalPageShell title={title} content={content} />
  }

  return { metadata, Page }
}
