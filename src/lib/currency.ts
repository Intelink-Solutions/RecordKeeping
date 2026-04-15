import { store } from "@/lib/store";

export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  const profile = store.getBusinessProfile();
  const symbol = profile.currency || "$";
  const position = profile.currencyPosition || "before";

  const formatted = amount.toLocaleString(undefined, options);
  return position === "after" ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}
