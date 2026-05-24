// Stub for the deleted seats hook (B2B seat-based pricing is disabled in Blyss
// per plan §4.4 step 1). Returns empty data so consuming components render
// gracefully. Phase 5 + Phase 6 redesigns will remove call sites entirely.

export interface OrganizationSeatsData {
  total_seats: number
  available_seats: number
  seats: never[]
}

export const useOrganizationSeats = (
  _subscriptionId?: string,
): { data: OrganizationSeatsData | undefined; isLoading: boolean } => {
  return {
    data: { total_seats: 0, available_seats: 0, seats: [] },
    isLoading: false,
  }
}
