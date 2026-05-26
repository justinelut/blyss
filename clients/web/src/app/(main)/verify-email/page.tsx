import LogoIcon from '@/components/Brand/logos/LogoIcon'
import { CONFIG } from '@/utils/config'
import Button from '@/components/atoms/Button'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Email Update confirmation',
}

export default async function Page(props: {
  searchParams: Promise<{ token: string; return_to?: string }>
}) {
  const searchParams = await props.searchParams

  const { token, return_to } = searchParams

  const urlSearchParams = new URLSearchParams({
    ...(return_to && { return_to }),
  })

  return (
    <form
      className="flex h-screen w-full grow items-center justify-center bg-[var(--background)]"
      method="POST"
      action={`${CONFIG.BASE_URL}/v1/email-update/verify?${urlSearchParams.toString()}`}
    >
      <div className="flex w-80 flex-col items-center gap-4">
        <LogoIcon size={48} className="mb-6" />
        <div className="text-center text-[var(--text-secondary)]">
          To complete the email update process, please click the button below:
        </div>
        <input type="hidden" name="token" value={token} />
        <Button fullWidth size="lg" type="submit">
          Update the email
        </Button>
      </div>
    </form>
  )
}
