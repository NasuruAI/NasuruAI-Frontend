/**
 * Country flags (design-system §6): bundled SVGs, 4:3, small radius and a
 * hairline border so white flags don't dissolve into the canvas. Emoji flags
 * are not used: Android and Windows draw them inconsistently.
 *
 * Simplified at this size on purpose (16-24 px); national colours are imagery,
 * not UI tokens.
 */

import { cx } from "./cx";

type Svg = React.ReactNode;

const H3 = (a: string, b: string, c: string): Svg => (
  <>
    <rect width="24" height="6" fill={a} />
    <rect y="6" width="24" height="6" fill={b} />
    <rect y="12" width="24" height="6" fill={c} />
  </>
);
const V3 = (a: string, b: string, c: string): Svg => (
  <>
    <rect width="8" height="18" fill={a} />
    <rect x="8" width="8" height="18" fill={b} />
    <rect x="16" width="8" height="18" fill={c} />
  </>
);

const FLAGS: Record<string, Svg> = {
  DE: H3("#000000", "#DD0000", "#FFCE00"),
  NL: H3("#AE1C28", "#FFFFFF", "#21468B"),
  IE: V3("#169B62", "#FFFFFF", "#FF883E"),
  NG: V3("#008751", "#FFFFFF", "#008751"),
  GH: (
    <>
      {H3("#CE1126", "#FCD116", "#006B3F")}
      <path
        d="M12 6.4l.9 2.7h2.8l-2.3 1.7.9 2.7-2.3-1.7-2.3 1.7.9-2.7-2.3-1.7h2.8z"
        fill="#000000"
      />
    </>
  ),
  CH: (
    <>
      <rect width="24" height="18" fill="#DA291C" />
      <rect x="10.5" y="4" width="3" height="10" fill="#FFFFFF" />
      <rect x="7" y="7.5" width="10" height="3" fill="#FFFFFF" />
    </>
  ),
  CA: (
    <>
      <rect width="24" height="18" fill="#FFFFFF" />
      <rect width="6" height="18" fill="#D52B1E" />
      <rect x="18" width="6" height="18" fill="#D52B1E" />
      <path
        d="M12 4.2l.9 1.8 1-.4-.3 2.3 1.3-1.2.4.9 1.4-.3-.5 1.6.6.3-2.2 1.9.3.9-2.3-.3.1 2.6h-.8l.1-2.6-2.3.3.3-.9-2.2-1.9.6-.3-.5-1.6 1.4.3.4-.9 1.3 1.2-.3-2.3 1 .4z"
        fill="#D52B1E"
      />
    </>
  ),
  GB: (
    <>
      <rect width="24" height="18" fill="#012169" />
      <path d="M0 0l24 18M24 0L0 18" stroke="#FFFFFF" strokeWidth="3.6" />
      <path d="M0 0l24 18M24 0L0 18" stroke="#C8102E" strokeWidth="1.2" />
      <path d="M12 0v18M0 9h24" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M12 0v18M0 9h24" stroke="#C8102E" strokeWidth="3.6" />
    </>
  ),
  US: (
    <>
      <rect width="24" height="18" fill="#FFFFFF" />
      {[0, 2, 4, 6, 8, 10, 12].map((row) => (
        <rect key={row} y={row * (18 / 13)} width="24" height={18 / 13} fill="#B22234" />
      ))}
      <rect width="10" height={(18 / 13) * 7} fill="#3C3B6E" />
    </>
  ),
  KE: (
    <>
      <rect width="24" height="18" fill="#FFFFFF" />
      <rect width="24" height="5.2" fill="#000000" />
      <rect y="6.4" width="24" height="5.2" fill="#BB0000" />
      <rect y="12.8" width="24" height="5.2" fill="#006600" />
      <ellipse cx="12" cy="9" rx="2.4" ry="5" fill="#BB0000" stroke="#000000" strokeWidth="0.8" />
    </>
  ),
};

export const COUNTRY_NAMES: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  CA: "Canada",
  IE: "Ireland",
  NL: "Netherlands",
  CH: "Switzerland",
  US: "United States",
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
};

export function Flag({
  country,
  size = 20,
  decorative = true,
  className,
}: {
  country: string;
  /** Width in px; height follows at 4:3. */
  size?: number;
  /** Hidden from assistive tech when the country name is written beside it. */
  decorative?: boolean;
  className?: string;
}) {
  const art = FLAGS[country.toUpperCase()];
  return (
    <svg
      viewBox="0 0 24 18"
      width={size}
      height={(size * 3) / 4}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (COUNTRY_NAMES[country.toUpperCase()] ?? country)}
      className={cx("shrink-0 overflow-hidden rounded-[3px] border border-line", className)}
    >
      {art ?? <rect width="24" height="18" fill="var(--sunken)" />}
    </svg>
  );
}
