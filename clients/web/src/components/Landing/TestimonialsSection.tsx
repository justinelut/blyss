import { Star } from 'lucide-react'

const testimonials = [
  {
    id: 1,
    name: 'Kevin O.',
    role: 'Architect',
    content:
      'Blyss gave me a platform to sell my 3D assets to a global audience.',
  },
  {
    id: 2,
    name: 'Sarah W.',
    role: 'Director',
    content:
      'Finally, a marketplace that understands the Kenyan creative spirit.',
  },
  {
    id: 3,
    name: 'Juma B.',
    role: 'Entrepreneur',
    content:
      'The payment process is seamless. Supporting local talent is easy.',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="bg-primary py-20 text-on-primary">
      <div className="mx-auto max-w-6xl px-8 text-center">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary-fixed opacity-80">
          Our Community
        </span>
        <h2 className="font-headline mb-12 mt-3 text-3xl md:text-4xl">Loved by Makers</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="rounded-xl border-l-4 border-tertiary-fixed bg-primary-container/30 p-6 text-left backdrop-blur-sm"
            >
              <div className="mb-4 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-tertiary-fixed text-tertiary-fixed" />
                ))}
              </div>
              <p className="mb-4 text-base font-medium italic">"{testimonial.content}"</p>
              <p className="text-sm font-bold">
                — {testimonial.name}, {testimonial.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
