import Button from '@/components/atoms/Button'
import { FiCheckCircle } from 'react-icons/fi'
import Link from 'next/link'

export default function DonationSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const reference = searchParams.reference as string | undefined
  const amount = searchParams.amount as string | undefined
  const organizationName = searchParams.organization as string | undefined

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <FiCheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          Thank You for Your Donation!
        </h1>

        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Your generous support means a lot
          {organizationName && ` to ${organizationName}`}.
        </p>

        {amount && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Donation Amount
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              KES {(parseInt(amount) / 100).toFixed(2)}
            </p>
          </div>
        )}

        {reference && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transaction Reference
            </p>
            <p className="font-mono text-sm text-gray-900 dark:text-white">
              {reference}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A confirmation email with your donation receipt has been sent to
            your email address.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button variant="default" className="w-full sm:w-auto">
                Return to Homepage
              </Button>
            </Link>
            {organizationName && (
              <Link href={`/${organizationName}`}>
                <Button variant="outline" className="w-full sm:w-auto">
                  Visit Creator Storefront
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
