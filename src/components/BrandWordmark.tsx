import { getAppBrandName, splitBrandWord, DEFAULT_APP_NAME } from "@/lib/app-branding";

interface BrandWordmarkProps {
  shortName?: string;
  className?: string;
  /** Color for the first half of the word when showing the default two-tone
   * "Record"/"KEEPING" split. A shop's own short name is shown as a single
   * solid brand-color run instead, since it won't generally follow that
   * capitalization pattern. */
  defaultAccentColor?: string;
}

/** Renders the app's brand wordmark — either the generic "RecordKEEPING"
 * default (two-tone) or the shop's own short name (single-tone, brand color)
 * once they've completed setup. */
const BrandWordmark = ({ shortName, className, defaultAccentColor = "#0f172a" }: BrandWordmarkProps) => {
  const brandName = getAppBrandName({ shortName });

  if (brandName !== DEFAULT_APP_NAME) {
    return (
      <span className={className} style={{ color: "hsl(var(--primary))" }}>
        {brandName}
      </span>
    );
  }

  const [first, second] = splitBrandWord(brandName);
  return (
    <span className={className}>
      <span style={{ color: defaultAccentColor }}>{first}</span>
      <span style={{ color: "hsl(var(--primary))" }}>{second}</span>
    </span>
  );
};

export default BrandWordmark;
