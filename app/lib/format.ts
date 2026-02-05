export function formatTokenAmount(
  raw: string,
  decimals: number,
  maxFractionDigits: number = 6
): string {
  const value = BigInt(raw || '0');
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  const displayDecimals = Math.min(Math.max(maxFractionDigits, 0), decimals);
  if (displayDecimals === 0) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart
    .toString()
    .padStart(decimals, '0')
    .slice(0, displayDecimals);

  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}
