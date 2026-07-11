/**
 * Collectible categories. TheCardLab is not limited to sports cards —
 * any verifiable (slab-certifiable) collectible category belongs here.
 * Adding a category: extend this list; the `category` columns are plain
 * text validated at the API layer, so no DB migration is needed.
 */
export const COLLECTIBLE_CATEGORIES = [
  "sports",
  "pokemon",
  "digimon",
  "magic",
  "yugioh",
  "onepiece",
  "lorcana",
  "dragonball",
  "star_wars",
  "marvel",
  "other",
] as const;

export type CollectibleCategory = (typeof COLLECTIBLE_CATEGORIES)[number];

export function isCollectibleCategory(v: unknown): v is CollectibleCategory {
  return typeof v === "string" && (COLLECTIBLE_CATEGORIES as readonly string[]).includes(v);
}
