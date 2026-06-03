'use client'

import { useListNotificationRecipients } from '@/hooks/queries/notifications'
import { schemas } from '@/lib/api'
import ShadowListGroup from '@/components/atoms/ShadowListGroup'

const NotificationRecipientItem = ({
  recipient,
}: {
  recipient: schemas['NotificationRecipientSchema']
}) => {
  return (
    <div className="flex flex-col gap-y-2">
      <span className="font-medium">{recipient.platform} Device</span>
      <span className="dark:text-polar-500 font-mono text-xs text-[var(--text-muted)]">
        {recipient.expo_push_token}
      </span>
    </div>
  )
}

export const NotificationRecipientsSettings = () => {
  const { data: notificationRecipients } = useListNotificationRecipients()

  return (
    <ShadowListGroup>
      {notificationRecipients?.items &&
      notificationRecipients.items.length > 0 ? (
        notificationRecipients.items.map((recipient) => {
          return (
            <ShadowListGroup.Item key={recipient.id}>
              <NotificationRecipientItem recipient={recipient} />
            </ShadowListGroup.Item>
          )
        })
      ) : (
        <ShadowListGroup.Item>
          <p className="dark:text-polar-500 text-sm text-[var(--text-muted)]">
            You don&apos;t have any active Notification Recipients.
          </p>
        </ShadowListGroup.Item>
      )}
    </ShadowListGroup>
  )
}
