const DEFAULT_CURRENCY = 'PKR'
const DEFAULT_FRACTION = 100

/** Minor units per major unit, per currency (100 paisa in a rupee, 100 cents in a dollar). */
const CURRENCY_FRACTIONS: Record<string, number> = {
  PKR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: 'Rs ',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

function groupThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format an amount in major units (`4999.5` → `"Rs 4,999.50"`).
 *
 * Deliberately avoids `Intl.NumberFormat` / `toLocaleString`: ICU data and the
 * host locale differ between machines, which would make prices render
 * differently in CI than in the browser. Formatting is done by hand so output
 * is deterministic everywhere.
 */
export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const fraction = CURRENCY_FRACTIONS[currency] ?? DEFAULT_FRACTION
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `

  const safeAmount = Number.isFinite(amount) ? amount : 0
  const negative = safeAmount < 0
  const minorUnits = Math.round(Math.abs(safeAmount) * fraction)
  const whole = Math.floor(minorUnits / fraction)
  const remainder = minorUnits % fraction

  const fractionDigits = fraction === 1 ? 0 : 2
  const decimals =
    fractionDigits === 0 ? '' : `.${String(remainder).padStart(fractionDigits, '0')}`

  return `${negative ? '-' : ''}${symbol}${groupThousands(String(whole))}${decimals}`
}
