'use client'

interface Category {
  id: string
  name: string
  slug: string
  product_count: number
}

interface Filters {
  categories: string[]
  priceMin: number
  priceMax: number
  formats: string[]
  model: string
}

interface FilterSidebarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  categories: Category[]
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  categories,
}: FilterSidebarProps) {
  const toggleCategory = (categorySlug: string) => {
    const newCategories = filters.categories.includes(categorySlug)
      ? filters.categories.filter((c) => c !== categorySlug)
      : [...filters.categories, categorySlug]
    onFiltersChange({ ...filters, categories: newCategories })
  }

  const toggleFormat = (format: string) => {
    if (format === 'all') {
      onFiltersChange({ ...filters, formats: [] })
    } else {
      const newFormats = filters.formats.includes(format)
        ? filters.formats.filter((f) => f !== format)
        : [...filters.formats, format]
      onFiltersChange({ ...filters, formats: newFormats })
    }
  }

  return (
    <aside className="w-full md:w-72 shrink-0 space-y-10">
      <div>
        <h3 className="text-lg font-bold mb-6 text-on-surface font-headline">
          Category
        </h3>
        <div className="space-y-3">
          {categories.length > 0 ? (
            categories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.slug)}
                  onChange={() => toggleCategory(category.slug)}
                  className="rounded border-outline text-secondary focus:ring-secondary"
                />
                <span className="text-on-surface-variant text-sm group-hover:text-primary transition-colors">
                  {category.name} ({category.product_count})
                </span>
              </label>
            ))
          ) : (
            <p className="text-on-surface-variant text-sm">Loading categories...</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-6 text-on-surface font-headline">
          Price Range
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-label">
                Min
              </label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) =>
                  onFiltersChange({ ...filters, priceMin: Number(e.target.value) })
                }
                className="w-full bg-surface-container-high border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 font-label">
                Max
              </label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) =>
                  onFiltersChange({ ...filters, priceMax: Number(e.target.value) })
                }
                className="w-full bg-surface-container-high border-none rounded-lg p-2 text-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-6 text-on-surface font-headline">Format</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Formats' },
            { id: 'pdf', label: 'PDF' },
            { id: 'mp4', label: 'MP4' },
            { id: 'mp3', label: 'MP3' },
          ].map((format) => (
            <span
              key={format.id}
              onClick={() => toggleFormat(format.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                format.id === 'all' && filters.formats.length === 0
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : filters.formats.includes(format.id)
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {format.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-6 text-on-surface font-headline">Model</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="model"
              checked={filters.model === 'one-time'}
              onChange={() => onFiltersChange({ ...filters, model: 'one-time' })}
              className="border-outline text-secondary focus:ring-secondary"
            />
            <span className="text-on-surface-variant text-sm group-hover:text-primary transition-colors">
              One-time Purchase
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="model"
              checked={filters.model === 'subscription'}
              onChange={() => onFiltersChange({ ...filters, model: 'subscription' })}
              className="border-outline text-secondary focus:ring-secondary"
            />
            <span className="text-on-surface-variant text-sm group-hover:text-primary transition-colors">
              Subscription Access
            </span>
          </label>
        </div>
      </div>
    </aside>
  )
}
