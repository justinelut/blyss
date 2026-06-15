'use client'

/**
 * CurriculumOutlineModule — module-by-module syllabus for course
 * creators. Per plan §19.5.
 *
 * v1 reads `settings.modules: Array<{ title: string, lessons: Array<{ title: string, duration?: string }> }>`.
 * Empty / missing → renders nothing.
 */

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

interface Lesson {
  title: string
  duration?: string
}
interface CourseModule {
  title: string
  lessons: Lesson[]
}

const readCourseModules = (
  settings: Record<string, unknown>,
): CourseModule[] => {
  const raw = settings.modules
  if (!Array.isArray(raw)) return []
  const out: CourseModule[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const title = (m as { title?: unknown }).title
    const lessons = (m as { lessons?: unknown }).lessons
    if (typeof title !== 'string' || !Array.isArray(lessons)) continue
    const validLessons: Lesson[] = []
    for (const l of lessons) {
      if (!l || typeof l !== 'object') continue
      const lTitle = (l as { title?: unknown }).title
      if (typeof lTitle !== 'string') continue
      validLessons.push({
        title: lTitle,
        duration:
          typeof (l as { duration?: unknown }).duration === 'string'
            ? ((l as { duration: string }).duration)
            : undefined,
      })
    }
    out.push({ title, lessons: validLessons })
  }
  return out
}

export const CurriculumOutlineModule: {
  kind: 'curriculum_outline'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'curriculum_outline',
  Component: ({ settings }) => {
    const modules = readCourseModules(settings)
    if (modules.length === 0) return null
    const totalLessons = modules.reduce(
      (acc, m) => acc + m.lessons.length,
      0,
    )
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-12 md:px-16">
        <div className="mx-auto max-w-[820px]">
        <Eyebrow>What you&rsquo;ll learn</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
          {modules.length} modules · {totalLessons} lessons
        </h2>
        <div className="mt-6 flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {modules.map((m, mi) => (
            <details key={mi} className="group py-4" open={mi === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-4">
                <span className="flex items-baseline gap-3">
                  <span className="font-sans text-[12px] font-semibold tabular-nums text-[var(--text-muted)]">
                    {String(mi + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-[16px] font-medium text-[var(--text-primary)]">
                    {m.title}
                  </span>
                </span>
                <span className="font-sans text-[12px] text-[var(--text-muted)]">
                  {m.lessons.length} {m.lessons.length === 1 ? 'lesson' : 'lessons'}
                </span>
              </summary>
              <ol className="mt-3 flex flex-col gap-2 pl-9">
                {m.lessons.map((l, li) => (
                  <li
                    key={li}
                    className="flex items-baseline justify-between gap-4 font-sans text-[13px] text-[var(--text-secondary)]"
                  >
                    <span>{l.title}</span>
                    {l.duration && (
                      <span className="font-sans text-[12px] tabular-nums text-[var(--text-muted)]">
                        {l.duration}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
        </div>
      </section>
    )
  },
}
