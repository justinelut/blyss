'use client'

interface HeroBannerProps {
  coverImage?: string
  organizationName: string
}

export function HeroBanner({ coverImage, organizationName }: HeroBannerProps) {
  return (
    <section className="relative h-[400px] w-full overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-primary/20 to-secondary/10"></div>
      {coverImage ? (
        <img
          src={coverImage}
          alt={`${organizationName} Cover`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-orange-100 to-pink-100"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
    </section>
  )
}
