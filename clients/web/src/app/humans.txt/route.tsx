export async function GET() {
  return new Response(
    `
              Blyss — the modern modern marketplace for digital products.

                            https://blyss.co.ke

                  Built on top of Polar.sh (Apache 2.0).
                  https://github.com/polarsource/polar

                          © 2026 Blyss · Nairobi
    `,
    {
      headers: {
        'Cache-Control': 'no-cache',
      },
      status: 200,
    },
  )
}
