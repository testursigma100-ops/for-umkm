/**
 * Format number to Indonesian Rupiah currency: Rp 25.000
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format plain number with thousand separator: 25.000
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Calculate profit and margin percentage
 */
export function calculateProfit(sellingPrice: number, hpp: number): { profit: number; margin: number } {
  const profit = (sellingPrice || 0) - (hpp || 0);
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return {
    profit,
    margin: Math.round(margin * 10) / 10,
  };
}

/**
 * Format date to Indonesian human-friendly format
 * e.g. 23 Sep 2026, 14:30
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Format date to simple format (e.g. 23 Sep 2026)
 */
export function formatDateOnly(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Get date string in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(existingCount: number = 0): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  const seq = String(existingCount + 1).padStart(3, '0');
  return `TRX-${yy}${mm}${dd}-${time}-${seq}`;
}
