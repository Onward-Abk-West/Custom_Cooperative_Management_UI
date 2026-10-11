/**
 * Money helpers. The app's only currency is the Nigerian Naira (NGN),
 * so every amount is rendered through this file: comma-grouped
 * (₦11,600,000) and, on request, spelled out in words for the amount
 * popup ("Eleven million, six hundred thousand naira").
 */

const SYMBOL = "₦";

const groupFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const exactFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function sanitize(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Splits a value into sign + whole kobo, so rounding happens once. */
function toKobo(value: number): { negative: boolean; kobo: number } {
  const v = sanitize(value);
  const kobo = Math.round(Math.abs(v) * 100);
  return { negative: v < 0 && kobo !== 0, kobo };
}

/** ₦11,600,000 — whole naira without decimals, otherwise two decimals. */
export function formatNaira(value: number): string {
  const { negative, kobo } = toKobo(value);
  const amount = kobo / 100;
  const body = kobo % 100 === 0 ? groupFormatter.format(amount) : exactFormatter.format(amount);
  return `${negative ? "-" : ""}${SYMBOL}${body}`;
}

/** ₦11,600,000.00 — always two decimals (the popup and money inputs). */
export function formatNairaExact(value: number): string {
  const { negative, kobo } = toKobo(value);
  return `${negative ? "-" : ""}${SYMBOL}${exactFormatter.format(kobo / 100)}`;
}

/** 11,600,000 — comma grouping with no currency symbol. */
export function formatNumber(value: number): string {
  return groupFormatter.format(sanitize(value));
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion", "quadrillion"];

/** 1..999 as words (British style: "one hundred and five"). */
function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (rest > 0) {
    const restWords =
      rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ""}`;
    parts.push(hundreds > 0 ? `and ${restWords}` : restWords);
  }
  return parts.join(" ");
}

/** A non-negative safe integer as lowercase words. */
function integerToWords(n: number): string {
  if (n === 0) return ONES[0];
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: { text: string; scale: number }[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const scale = SCALES[i];
    parts.push({
      text: `${belowThousand(groups[i])}${scale ? ` ${scale}` : ""}`,
      scale: i,
    });
  }
  return parts.reduce((acc, part, idx) => {
    if (idx === 0) return part.text;
    // "one million and five", but "one million, two hundred thousand".
    const isLastSmall = part.scale === 0 && groups[0] < 100;
    return `${acc}${isLastSmall ? " and " : ", "}${part.text}`;
  }, "");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 11600000 → "Eleven million, six hundred thousand naira"
 * 1250.5   → "One thousand, two hundred and fifty naira and fifty kobo"
 */
export function nairaInWords(value: number): string {
  const { negative, kobo: totalKobo } = toKobo(value);
  if (!Number.isSafeInteger(totalKobo)) return "Amount too large to express in words";
  const naira = Math.floor(totalKobo / 100);
  const kobo = totalKobo % 100;

  const segments: string[] = [];
  if (naira > 0 || kobo === 0) {
    segments.push(`${integerToWords(naira)} naira`);
  }
  if (kobo > 0) {
    segments.push(`${integerToWords(kobo)} kobo`);
  }
  const text = segments.join(" and ");
  return capitalise(negative ? `minus ${text}` : text);
}

/**
 * Parses what someone typed into an amount box ("11,600,000", "₦25000.5").
 * Returns null for empty or non-numeric input.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
