import { Preview, Section } from '@react-email/components'
import BodyText from '../components/BodyText'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Intro from '../components/Intro'
import WrapperBlyss from '../components/WrapperBlyss'
import type { schemas } from '../types'

export function OrganizationUnderReview({
  email,
  organization,
}: schemas['OrganizationUnderReviewProps']) {
  return (
    <WrapperBlyss>
      <Preview>
        Your organization is under review - a standard part of our onboarding
        process
      </Preview>
      <Intro>
        Your organization <strong>{organization.name}</strong> is currently
        under review as part of our standard onboarding process.
      </Intro>
      <Section>
        <BodyText>
          We review storefront and payout information to check it against
          Blyss&apos;s marketplace policies. Paystack may request additional
          identity, business, or account details before it activates a payout
          destination.
        </BodyText>
        <BodyText>
          <strong>What happens next?</strong>
        </BodyText>
        <BodyText>
          We&apos;ll contact you if we need more information and notify you when
          the review status changes. Review timing can vary.
        </BodyText>
        <BodyText>
          You can continue managing your storefront while the review is in
          progress.
        </BodyText>
        <BodyText>
          <Button href="https://blyss.co.ke/help">
            Visit the Help Center
          </Button>
        </BodyText>
        <BodyText>
          If you have questions, email support@blyss.co.ke.
        </BodyText>
      </Section>
      <Footer email={email} />
    </WrapperBlyss>
  )
}

OrganizationUnderReview.PreviewProps = {
  email: 'admin@example.com',
  organization: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Acme Inc.',
    slug: 'acme-inc',
    avatar_url: 'https://avatars.githubusercontent.com/u/105373340?s=200&v=4',
  },
}

export default OrganizationUnderReview
