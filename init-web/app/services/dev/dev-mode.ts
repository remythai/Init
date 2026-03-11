export const DEV_MODE_USER_ID = 999;
export const DEV_MODE_ORGA_ID = 1;

export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
}

export function isMockOrganizer(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_IS_ORGANIZER === 'true';
}
