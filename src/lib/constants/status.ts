// Status enums for the Seasonal Talent Ecosystem

export const MATCH_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  UNAVAILABLE: 'unavailable',
} as const;

export type AvailabilityStatus = typeof AVAILABILITY_STATUS[keyof typeof AVAILABILITY_STATUS];

export const HOUSING_STATUS = {
  OFFERED: 'offered',
  NEEDED: 'needed',
  VERIFIED: 'verified',
  NONE: 'none',
} as const;

export type HousingStatus = typeof HOUSING_STATUS[keyof typeof HOUSING_STATUS];

export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

// Status labels for UI
export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  [HOUSING_STATUS.OFFERED]: 'Boende erbjuds',
  [HOUSING_STATUS.NEEDED]: 'Söker boende',
  [HOUSING_STATUS.VERIFIED]: 'Verifierat boende',
  [HOUSING_STATUS.NONE]: 'Inget boende',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  [AVAILABILITY_STATUS.AVAILABLE]: 'Tillgänglig',
  [AVAILABILITY_STATUS.BUSY]: 'Upptagen',
  [AVAILABILITY_STATUS.UNAVAILABLE]: 'Ej tillgänglig',
};
