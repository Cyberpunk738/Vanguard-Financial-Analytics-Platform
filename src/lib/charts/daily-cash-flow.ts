/** Reserve enough room for two readable bars per transaction day plus axes. */
export function getDailyCashFlowLayout(dayCount: number) {
  return {
    minWidth: Math.max(360, dayCount * 28 + 80),
    barGap: 2,
    barCategoryGap: "20%",
    maxBarSize: 20,
  };
}
