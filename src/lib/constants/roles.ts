// User roles in the Matildus platform
export const ROLES = {
  TALENT: 'talent',
  EMPLOYER: 'employer',
  HOST: 'host',
  ADMIN: 'admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Role display names
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.TALENT]: 'Kandidat',
  [ROLES.EMPLOYER]: 'Arbetsgivare',
  [ROLES.HOST]: 'Värd',
  [ROLES.ADMIN]: 'Admin',
};
