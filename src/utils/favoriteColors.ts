/** Fixed palette assigned by favorite order (index 0 = first penya saved as
 *  favorite) so each saved penya keeps a distinct, stable color across the
 *  bracket buttons and its highlighted path — up to FavoritePenyesContext's
 *  MAX_FAVORITES, with a couple of extras as headroom. */
const FAVORITE_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f97316", // orange
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
  "#14b8a6", // teal
];

export function getFavoriteColor(index: number): string {
  return FAVORITE_COLORS[index % FAVORITE_COLORS.length];
}
