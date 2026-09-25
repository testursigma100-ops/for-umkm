import { Transaction, BusinessProfile } from '../types';
import { formatRupiah, formatDateTime } from './formatters';

interface RenderOptions {
  paperWidth?: '80mm' | '58mm';
  scale?: number;
}

/**
 * Helper to wrap text cleanly and draw line by line
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'left'
): number {
  ctx.textAlign = align;
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && currentLine !== '') {
      ctx.fillText(currentLine, x, currentY);
      currentLine = words[n];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    ctx.fillText(currentLine, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

/**
 * Load image safely with crossOrigin
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Pure HTML5 Canvas Receipt Rasterizer
 * Produces crisp, pixel-perfect PNG thermal receipts (Standard 576px / 384px width)
 */
export async function renderReceiptToCanvas(
  transaction: Transaction,
  profile: BusinessProfile,
  options: RenderOptions = {}
): Promise<HTMLCanvasElement> {
  const { paperWidth = '80mm', scale = 2 } = options;

  // Base canvas logical dimensions: 576px (80mm) or 384px (58mm)
  const baseWidth = paperWidth === '58mm' ? 384 : 576;
  const padding = paperWidth === '58mm' ? 20 : 32;
  const contentWidth = baseWidth - padding * 2;
  const centerX = baseWidth / 2;

  // Pre-load logo if present
  let logoImg: HTMLImageElement | null = null;
  if (profile.logo_url) {
    try {
      logoImg = await loadImage(profile.logo_url);
    } catch {
      logoImg = null;
    }
  }

  // Pre-calculate dynamic canvas height
  let estimatedHeight = padding; // top padding

  if (logoImg) {
    estimatedHeight += 70; // logo + gap
  }

  estimatedHeight += 34; // store name
  if (profile.address) estimatedHeight += 24;
  if (profile.phone) estimatedHeight += 18;
  if (profile.instagram) estimatedHeight += 18;

  estimatedHeight += 20; // divider 1
  estimatedHeight += 76; // metadata (no nota, tanggal, metode)
  if (transaction.customer_name) estimatedHeight += 18;
  if (transaction.notes) estimatedHeight += 18;

  estimatedHeight += 20; // divider 2

  const items = Array.isArray(transaction.items) ? transaction.items : [];
  estimatedHeight += Math.max(1, items.length) * 44; // items list

  estimatedHeight += 20; // divider 3
  const discountAmount = transaction.discount || 0;
  if (discountAmount > 0) estimatedHeight += 38;
  estimatedHeight += 32; // total line

  if (transaction.payment_method === 'cash' && transaction.cash_received) {
    estimatedHeight += 38;
  }

  estimatedHeight += 20; // divider 4
  estimatedHeight += 40; // footer message
  estimatedHeight += 26; // branding
  estimatedHeight += padding; // bottom padding

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = estimatedHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D canvas context');

  // Scale for crisp high-DPI rendering
  ctx.scale(scale, scale);

  // 1. Background (Pure White Paper)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, baseWidth, estimatedHeight);

  let currentY = padding;
  const primaryFont = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // 2. Draw Logo if available
  if (logoImg) {
    const maxLogoW = paperWidth === '58mm' ? 120 : 150;
    const maxLogoH = 60;
    let drawW = logoImg.naturalWidth || maxLogoW;
    let drawH = logoImg.naturalHeight || maxLogoH;

    const ratio = Math.min(maxLogoW / drawW, maxLogoH / drawH, 1);
    drawW = drawW * ratio;
    drawH = drawH * ratio;

    const logoX = (baseWidth - drawW) / 2;
    ctx.drawImage(logoImg, logoX, currentY, drawW, drawH);
    currentY += drawH + 12;
  }

  // 3. Store Name (Bold uppercase)
  const storeName = (profile.business_name || 'BisnisKu').trim();
  ctx.fillStyle = '#111827';
  ctx.font = `700 ${paperWidth === '58mm' ? 16 : 20}px ${primaryFont}`;
  currentY = drawWrappedText(ctx, storeName, centerX, currentY + 4, contentWidth, 24, 'center');

  // 4. Store Address, Phone, Instagram
  ctx.fillStyle = '#4B5563';
  ctx.font = `400 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;

  if (profile.address) {
    currentY = drawWrappedText(ctx, profile.address, centerX, currentY + 2, contentWidth, 16, 'center');
  }

  if (profile.phone) {
    ctx.textAlign = 'center';
    ctx.fillText(`Telp/WA: ${profile.phone}`, centerX, currentY + 2);
    currentY += 16;
  }

  if (profile.instagram) {
    ctx.textAlign = 'center';
    ctx.fillText(`IG: @${profile.instagram.replace('@', '')}`, centerX, currentY + 2);
    currentY += 16;
  }

  // Helper for drawing subtle divider line
  const drawDivider = (yPos: number) => {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, yPos);
    ctx.lineTo(baseWidth - padding, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  currentY += 6;
  drawDivider(currentY);
  currentY += 16;

  // 5. Transaction Metadata
  const paymentMethodLabel =
    transaction.payment_method === 'cash'
      ? 'Tunai'
      : transaction.payment_method === 'qris'
      ? 'QRIS'
      : transaction.payment_method === 'transfer'
      ? 'Transfer Bank'
      : 'Lainnya';

  const drawKeyValue = (key: string, val: string, isBoldVal = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280';
    ctx.font = `400 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
    ctx.fillText(key, padding, currentY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = `${isBoldVal ? '600' : '400'} ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
    ctx.fillText(val, baseWidth - padding, currentY);
    currentY += 18;
  };

  drawKeyValue('No. Nota', transaction.invoice_number, true);
  drawKeyValue('Waktu', formatDateTime(transaction.created_at || transaction.date));
  if (transaction.customer_name) {
    drawKeyValue('Pelanggan', transaction.customer_name);
  }
  if (transaction.notes) {
    drawKeyValue('Catatan', transaction.notes);
  }
  drawKeyValue('Pembayaran', paymentMethodLabel, true);

  currentY += 2;
  drawDivider(currentY);
  currentY += 16;

  // 6. Purchased Products List
  if (items.length > 0) {
    for (const item of items) {
      // Product Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111827';
      ctx.font = `600 ${paperWidth === '58mm' ? 12 : 13}px ${primaryFont}`;
      currentY = drawWrappedText(ctx, item.product_name, padding, currentY, contentWidth, 16, 'left');

      // Quantity x Unit Price = Subtotal
      ctx.fillStyle = '#6B7280';
      ctx.font = `400 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(`${item.quantity} × ${formatRupiah(item.unit_price)}`, padding, currentY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#111827';
      ctx.font = `600 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
      const itemSubtotal = item.subtotal || item.quantity * item.unit_price;
      ctx.fillText(formatRupiah(itemSubtotal), baseWidth - padding, currentY);

      currentY += 20;
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = `600 ${paperWidth === '58mm' ? 12 : 13}px ${primaryFont}`;
    ctx.fillText('Total Penjualan', padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(transaction.total_amount), baseWidth - padding, currentY);
    currentY += 20;
  }

  currentY += 2;
  drawDivider(currentY);
  currentY += 16;

  // 7. Financial Calculations (Subtotal, Diskon, Total, Cash, Change)
  const subtotalAmount =
    transaction.subtotal ||
    (discountAmount > 0 ? transaction.total_amount + discountAmount : transaction.total_amount);

  if (discountAmount > 0) {
    drawKeyValue('Subtotal', formatRupiah(subtotalAmount));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280';
    ctx.font = `400 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
    ctx.fillText('Diskon', padding, currentY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#EF4444';
    ctx.font = `500 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
    ctx.fillText(`-${formatRupiah(discountAmount)}`, baseWidth - padding, currentY);
    currentY += 18;
  }

  // TOTAL (Large & Bold)
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'left';
  ctx.font = `700 ${paperWidth === '58mm' ? 14 : 16}px ${primaryFont}`;
  ctx.fillText('TOTAL', padding, currentY + 2);

  ctx.textAlign = 'right';
  ctx.font = `700 ${paperWidth === '58mm' ? 15 : 18}px ${primaryFont}`;
  ctx.fillText(formatRupiah(transaction.total_amount), baseWidth - padding, currentY + 2);
  currentY += 24;

  // Cash received & change
  if (transaction.payment_method === 'cash' && transaction.cash_received) {
    const cash = transaction.cash_received;
    const change =
      transaction.change_amount !== undefined
        ? transaction.change_amount
        : Math.max(0, cash - transaction.total_amount);

    drawKeyValue('Tunai Diterima', formatRupiah(cash));
    drawKeyValue('Kembalian', formatRupiah(change), true);
  }

  currentY += 4;
  drawDivider(currentY);
  currentY += 16;

  // 8. Custom Footer
  const footerMessage = (profile.receipt_footer || 'Terima kasih atas kunjungan Anda!').trim();
  ctx.fillStyle = '#4B5563';
  ctx.font = `400 ${paperWidth === '58mm' ? 11 : 12}px ${primaryFont}`;
  currentY = drawWrappedText(ctx, footerMessage, centerX, currentY, contentWidth, 16, 'center');

  // 9. Branding
  ctx.fillStyle = '#9CA3AF';
  ctx.font = `400 ${paperWidth === '58mm' ? 9 : 10}px ${primaryFont}`;
  ctx.textAlign = 'center';
  ctx.fillText('Dicatat via BisnisKu', centerX, currentY + 6);

  return canvas;
}

/**
 * Convert Canvas to PNG Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Gagal mengonversi canvas ke Blob PNG'));
      }
    }, 'image/png', 0.95);
  });
}


