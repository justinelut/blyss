import { Category } from '@/hooks/queries/categories'

interface CategoriesSectionProps {
  categories: Category[]
  selectedCategory: string
  onCategorySelect: (categoryId: string) => void
}

export default function CategoriesSection({
  categories,
  selectedCategory,
  onCategorySelect,
}: CategoriesSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-8 pb-12">
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="font-label text-xs font-bold uppercase tracking-widest text-primary">
            Browse by craft
          </span>
          <h2 className="font-headline mt-1 text-3xl">Curated Categories</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`rounded-full px-5 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
