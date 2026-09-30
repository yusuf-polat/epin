export const PERMISSIONS = [
  'approve_listings',
  'manage_products',
  'manage_disputes',
  'manage_stores',
  'manage_categories',
  'manage_users',
  'ban_user',
  'manage_roles',
  'manage_wallets',
  'manage_orders',
  'manage_finance',
  'view_reports',
  'manage_payments',
  'moderate_content',
  'view_audit_log',
  'manage_settings',
  'broadcast_notifications',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<'ADMIN' | 'DESTEK', Permission[]> = {
  ADMIN: [...PERMISSIONS],
  DESTEK: ['approve_listings', 'manage_disputes', 'manage_orders', 'moderate_content'],
};
