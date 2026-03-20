import { Preview, Section, Text } from '@react-email/components'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Intro from '../components/Intro'
import WrapperBlyss from '../components/WrapperBlyss'
import type { schemas } from '../types'

export function OrganizationInvite({
  email,
  organization_name,
  inviter_email,
  invite_url,
}: schemas['OrganizationInviteProps']) {
  return (
    <WrapperBlyss>
      <Preview>You've been added to {organization_name} on Blyss</Preview>
      <Intro>
        {inviter_email} has added you to{' '}
        <span className="font-bold">{organization_name}</span> on Blyss.
      </Intro>
      <Section>
        <Text>
          As a member of {organization_name} you're now able to manage{' '}
          {organization_name}'s products, customers, and subscriptions on Blyss.
        </Text>
      </Section>
      <Section className="text-center">
        <Button href={invite_url}>Go to the Blyss dashboard</Button>
      </Section>
      <Footer email={email} />
    </WrapperBlyss>
  )
}

OrganizationInvite.PreviewProps = {
  email: 'john@example.com',
  organization_name: 'Acme Inc.',
  inviter_email: 'admin@acme.com',
  invite_url: 'https://blyss.co.ke/dashboard/acme-inc',
}

export default OrganizationInvite
