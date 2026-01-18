const DEFAULT_CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || 'KES';
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'en-KE';
const DEFAULT_CURRENCY_DISPLAY = process.env.NEXT_PUBLIC_CURRENCY_DISPLAY || 'symbol';
const DEFAULT_SYMBOL_OVERRIDE = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '';

function parseInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function getCurrencyConfig() {
  const fractionDigitsEnv = parseInteger(process.env.NEXT_PUBLIC_CURRENCY_FRACTION_DIGITS);

  return {
    currencyCode: DEFAULT_CURRENCY_CODE,
    locale: DEFAULT_LOCALE,
    currencyDisplay: DEFAULT_CURRENCY_DISPLAY,
    symbolOverride: DEFAULT_SYMBOL_OVERRIDE,
    fractionDigits: fractionDigitsEnv,
  };
}

export function getCurrencyLabel() {
  const { symbolOverride, currencyCode } = getCurrencyConfig();
  return (symbolOverride || currencyCode || '').trim();
}

export function formatMoney(value, options = {}) {
  const amount = toNumber(value);

  const config = getCurrencyConfig();
  const currencyCode = options.currencyCode || config.currencyCode;
  const locale = options.locale || config.locale;
  const currencyDisplay = options.currencyDisplay || config.currencyDisplay;
  const symbolOverride = (options.symbolOverride ?? config.symbolOverride) || '';

  const fractionDigits =
    options.fractionDigits ??
    (Number.isFinite(config.fractionDigits) ? config.fractionDigits : undefined);

  const minimumFractionDigits = Number.isFinite(fractionDigits) ? fractionDigits : undefined;
  const maximumFractionDigits = Number.isFinite(fractionDigits) ? fractionDigits : undefined;

  if (symbolOverride) {
    return `${symbolOverride} ${amount.toLocaleString(locale, {
      minimumFractionDigits: minimumFractionDigits ?? 2,
      maximumFractionDigits: maximumFractionDigits ?? 2,
    })}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    const label = (currencyCode || '').trim();
    const formatted = amount.toLocaleString(locale, {
      minimumFractionDigits: minimumFractionDigits ?? 2,
      maximumFractionDigits: maximumFractionDigits ?? 2,
    });
    return label ? `${label} ${formatted}` : formatted;
  }
}
