'use client'

interface LoadMoreButtonProps {
  onClick: () => void
  loading?: boolean
}

export function LoadMoreButton({ onClick, loading = false }: LoadMoreButtonProps) {
  return (
    <div className="mt-32 flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="group flex flex-col items-center gap-4"
      >
        <span className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant transition-colors group-hover:text-primary">
          {loading ? 'Loading...' : 'Load more creators'}
        </span>
        <div className="h-12 w-[2px] bg-primary-fixed transition-all duration-500 group-hover:h-16"></div>
      </button>
    </div>
  )
}
