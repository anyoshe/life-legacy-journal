/** Free tier max photo memories. PLUS (subscription) lifts this. */
export const FREE_MEMORY_PHOTO_LIMIT = 5;

export function memoryLimitForTier(tier: string | null | undefined): number {
  if (tier === "PLUS" || tier === "PRO") return 500;
  return FREE_MEMORY_PHOTO_LIMIT;
}
