'use client'

/**
 * RecipeCardModule — sample recipe block for cookbook creators.
 * Per plan §19.5.
 *
 * v1 reads the recipe from `settings`:
 *   - title: string
 *   - servings: number
 *   - duration: string  (e.g. "45 min")
 *   - ingredients: string[]
 *   - steps: string[]
 *
 * If the recipe isn't configured, the module renders nothing.
 */

import { Eyebrow } from '@/design'

import type { StorefrontModuleProps } from './index'

interface Recipe {
  title: string
  servings?: number
  duration?: string
  ingredients: string[]
  steps: string[]
}

const readRecipe = (settings: Record<string, unknown>): Recipe | null => {
  const title = settings.title
  const ingredients = settings.ingredients
  const steps = settings.steps
  if (
    typeof title !== 'string' ||
    !Array.isArray(ingredients) ||
    !Array.isArray(steps)
  ) {
    return null
  }
  return {
    title,
    servings:
      typeof settings.servings === 'number' ? settings.servings : undefined,
    duration:
      typeof settings.duration === 'string' ? settings.duration : undefined,
    ingredients: ingredients.filter((i): i is string => typeof i === 'string'),
    steps: steps.filter((s): s is string => typeof s === 'string'),
  }
}

export const RecipeCardModule: {
  kind: 'recipe_card'
  Component: React.FC<StorefrontModuleProps>
} = {
  kind: 'recipe_card',
  Component: ({ settings }) => {
    const recipe = readRecipe(settings)
    if (!recipe) return null
    return (
      <section className="mx-auto max-w-[820px] px-6 py-12 md:px-12">
        <Eyebrow>Sample recipe</Eyebrow>
        <article className="mt-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-6 md:p-8">
          <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
            {recipe.title}
          </h2>
          {(recipe.servings || recipe.duration) && (
            <p className="mt-2 font-sans text-[12px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {recipe.servings && <span>{recipe.servings} servings</span>}
              {recipe.servings && recipe.duration && <span> · </span>}
              {recipe.duration && <span>{recipe.duration}</span>}
            </p>
          )}
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
            <div>
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Ingredients
              </h3>
              <ul className="mt-3 flex flex-col gap-1.5 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Method
              </h3>
              <ol className="mt-3 flex flex-col gap-3 font-sans text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-sans text-[12px] font-semibold tabular-nums text-[var(--text-muted)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </section>
    )
  },
}
