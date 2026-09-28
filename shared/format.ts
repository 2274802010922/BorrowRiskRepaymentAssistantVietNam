import Decimal from "decimal.js";

/** Display only: never round the atomic amount used for signing. */
export function compactNumber(value: string, locale: "vi" | "en" = "vi", places = 6): string {
  const number = new Decimal(value);
  if (!number.isFinite()) throw new Error("INVALID_INPUT");
  const threshold = new Decimal(10).pow(-places);
  if (!number.isZero() && number.abs().lt(threshold))
    return (
      (number.isNegative() ? "> −" : "< ") +
      compactNumber(threshold.toFixed(places), locale, places)
    );
  const [integer, fraction] = number.toFixed(places).split(".");
  const group = locale === "vi" ? "." : ",";
  const decimal = locale === "vi" ? "," : ".";
  const whole = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const tail = fraction?.replace(/0+$/, "");
  return whole + (tail ? decimal + tail : "");
}

export function exactToken(atomic: string, decimals: number, locale: "vi" | "en" = "vi") {
  return compactNumber(
    new Decimal(atomic).div(new Decimal(10).pow(decimals)).toFixed(decimals),
    locale,
    decimals,
  );
}
