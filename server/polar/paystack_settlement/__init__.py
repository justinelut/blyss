"""Public API for paystack settlement events.

Settlements are recorded by webhook handlers in
`polar.integrations.paystack.tasks` (`transfer.success` / `.failed` /
`.reversed`). This module exposes a read-only listing endpoint the
dashboard's BlyssPayoutLedger consumes to render real settlement
timestamps instead of the previous T+2 estimate.
"""
