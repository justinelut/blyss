'use client'

import { DashboardBody } from '@/components/Layout/DashboardLayout'
import FeatureSettings from '@/components/Settings/FeatureSettings'
import OrganizationDeleteSettings from '@/components/Settings/OrganizationDeleteSettings'
import OrganizationMPesaSettings from '@/components/Settings/OrganizationMPesaSettings'
import OrganizationNotificationSettings from '@/components/Settings/OrganizationNotificationSettings'
import OrganizationProfileSettings from '@/components/Settings/OrganizationProfileSettings'
import { Section, SectionDescription } from '@/components/Settings/Section'
import { StorefrontBioFields } from '@/components/Settings/StorefrontBioFields'
import { schemas } from '@/lib/api'

export default function ClientPage({
  organization: org,
}: {
  organization: schemas['Organization']
}) {
  return (
    <DashboardBody
      wrapperClassName="max-w-(--breakpoint-sm)!"
      title="Organization Settings"
    >
      <div className="flex flex-col gap-y-12">
        {/* Bio + creator category — drives what shows on the public
            /creators/{slug} page above the fold. Lives at the top of
            the settings page because it's the highest-impact field
            for buyer trust on a freshly-onboarded storefront, and
            the IncompleteProfileBanner deeplinks here via
            #organization. */}
        <Section id="organization">
          <SectionDescription
            title="Public storefront"
            description="Bio and category shown on your public creator page."
          />
          <StorefrontBioFields organization={org} />
        </Section>

        <Section id="profile">
          <SectionDescription title="Profile" />
          <OrganizationProfileSettings organization={org} />
        </Section>

        <Section id="notifications">
          <SectionDescription title="Notifications" />
          <OrganizationNotificationSettings organization={org} />
        </Section>

        <Section id="payouts">
          <SectionDescription
            title="Payouts & M-Pesa"
            description="Configure your payout method and M-Pesa settings for receiving payments"
          />
          <OrganizationMPesaSettings organization={org} showFinanceDeepLink />
        </Section>

        <Section id="features">
          <SectionDescription
            title="Features"
            description="Manage alpha & beta features for your organization"
          />
          <FeatureSettings organization={org} />
        </Section>

        <Section id="danger">
          <SectionDescription
            title="Danger Zone"
            description="Irreversible actions for this organization"
          />
          <OrganizationDeleteSettings organization={org} />
        </Section>
      </div>
    </DashboardBody>
  )
}
