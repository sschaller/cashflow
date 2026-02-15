export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatAmount(amount: number, currency: string = 'USD'): string {
  const prefix = amount >= 0 ? '+' : ''
  return prefix + formatCurrency(amount, currency)
}

export function formatCurrencyOrPlain(amount: number, currency: string | null): string {
  if (currency) return formatCurrency(amount, currency)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
