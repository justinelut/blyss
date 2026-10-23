export async function GET() {
  return new Response(
    `
              Blyss — a Kenya-focused marketplace for digital products and subscriptions.

                            https://blyss.co.ke

                          © {new Date().getFullYear()} Blyss
    `,
    {
      headers: {
        'Cache-Control': 'no-cache',
      },
      status: 200,
    },
  )
}
