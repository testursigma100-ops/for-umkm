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
  const padding = paperWidth === '58mm' ? 24 : 36;
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
  let estimatedHeight = 0;
  estimatedHeight += padding; // top padding

  if (logoImg) {
    estimatedHeight += 70; // logo + gap
  }

  estimatedHeight += 36; // store name
  if (profile.address) estimatedHeight += 32;
  if (profile.phone) estimatedHeight += 20;
  if (profile.instagram) estimatedHeight += 20;

  estimatedHeight += 25; // divider 1
  estimatedHeight += 90; // metadata (no nota, tanggal, metode, etc.)
  if (transaction.customer_name) estimatedHeight += 20;
  if (transaction.notes) estimatedHeight += 20;

  estimatedHeight += 25; // divider 2

  const items = Array.isArray(transaction.items) ? transaction.items : [];
  estimatedHeight += Math.max(1, items.length) * 42; // items list

  estimatedHeight += 25; // divider 3
  estimatedHeight += 50; // financial lines (total)
  if (transaction.discount && transaction.discount > 0) estimatedHeight += 36;
  if (transaction.payment_method === 'cash' && transaction.cash_received) estimatedHeight += 40;

  estimatedHeight += 25; // divider 4
  estimatedHeight += 50; // footer message
  estimatedHeight += 30; // branding
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
  const primaryFont = '"Courier New", Courier, monospace, "Plus Jakarta Sans", sans-serif';

  // 2. Draw Logo if available
  if (logoImg) {
    const maxLogoW = paperWidth === '58mm' ? 120 : 160;
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
  const storeName = (profile.business_name || 'BisnisKu').trim().toUpperCase();
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${paperWidth === '58mm' ? 16 : 19}px ${primaryFont}`;
  currentY = drawWrappedText(ctx, storeName, centerX, currentY + 4, contentWidth, 24, 'center');

  // 4. Store Address, Phone, Instagram
  ctx.fillStyle = '#333333';
  ctx.font = `normal ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;

  if (profile.address) {
    currentY = drawWrappedText(ctx, profile.address, centerX, currentY + 2, contentWidth, 18, 'center');
  }

  if (profile.phone) {
    ctx.textAlign = 'center';
    ctx.fillText(`Telp/WA: ${profile.phone}`, centerX, currentY + 2);
    currentY += 18;
  }

  if (profile.instagram) {
    ctx.textAlign = 'center';
    ctx.fillText(`IG: @${profile.instagram.replace('@', '')}`, centerX, currentY + 2);
    currentY += 18;
  }

  // Helper for drawing dashed divider
  const drawDivider = (yPos: number) => {
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, yPos);
    ctx.lineTo(baseWidth - padding, yPos);
    ctx.stroke();
    ctx.setLineDash([]); // reset
  };

  currentY += 8;
  drawDivider(currentY);
  currentY += 18;

  // 5. Transaction Metadata
  const paymentMethodLabel =
    transaction.payment_method === 'cash'
      ? 'Tunai'
      : transaction.payment_method === 'qris'
      ? 'QRIS'
      : transaction.payment_method === 'transfer'
      ? 'Transfer Bank'
      : 'Lainnya';

  ctx.font = `normal ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
  ctx.fillStyle = '#222222';

  const drawKeyValue = (key: string, val: string, isBoldVal = false) => {
    ctx.textAlign = 'left';
    ctx.font = `normal ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
    ctx.fillText(key, padding, currentY);

    ctx.textAlign = 'right';
    if (isBoldVal) {
      ctx.font = `bold ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
    }
    ctx.fillText(val, baseWidth - padding, currentY);
    currentY += 18;
  };

  drawKeyValue('No. Nota:', transaction.invoice_number, true);
  drawKeyValue('Waktu:', formatDateTime(transaction.created_at || transaction.date));
  if (transaction.customer_name) {
    drawKeyValue('Pelanggan:', transaction.customer_name);
  }
  if (transaction.notes) {
    drawKeyValue('Catatan:', transaction.notes);
  }
  drawKeyValue('Pembayaran:', paymentMethodLabel, true);

  currentY += 4;
  drawDivider(currentY);
  currentY += 18;

  // 6. Purchased Products List
  if (items.length > 0) {
    for (const item of items) {
      // Product Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${paperWidth === '58mm' ? 12 : 14}px ${primaryFont}`;
      currentY = drawWrappedText(ctx, item.product_name, padding, currentY, contentWidth, 18, 'left');

      // Quantity x Unit Price = Subtotal
      ctx.fillStyle = '#333333';
      ctx.font = `normal ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(`  ${item.quantity} x ${formatRupiah(item.unit_price)}`, padding, currentY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
      const itemSubtotal = item.subtotal || item.quantity * item.unit_price;
      ctx.fillText(formatRupiah(itemSubtotal), baseWidth - padding, currentY);

      currentY += 20;
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${paperWidth === '58mm' ? 12 : 14}px ${primaryFont}`;
    ctx.fillText('Total Penjualan', padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(transaction.total_amount), baseWidth - padding, currentY);
    currentY += 20;
  }

  currentY += 2;
  drawDivider(currentY);
  currentY += 18;

  // 7. Financial Calculations (Subtotal, Diskon, Total, Cash, Change)
  const discountAmount = transaction.discount || 0;
  const subtotalAmount =
    transaction.subtotal ||
    (discountAmount > 0 ? transaction.total_amount + discountAmount : transaction.total_amount);

  if (discountAmount > 0) {
    drawKeyValue('Subtotal:', formatRupiah(subtotalAmount));
    ctx.fillStyle = '#DC2626'; // red for discount
    drawKeyValue('Diskon:', `-${formatRupiah(discountAmount)}`);
    ctx.fillStyle = '#222222';
  }

  // TOTAL (Large & Bold)
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = `bold ${paperWidth === '58mm' ? 14 : 17}px ${primaryFont}`;
  ctx.fillText('TOTAL:', padding, currentY + 2);

  ctx.textAlign = 'right';
  ctx.font = `bold ${paperWidth === '58mm' ? 15 : 18}px ${primaryFont}`;
  ctx.fillText(formatRupiah(transaction.total_amount), baseWidth - padding, currentY + 2);
  currentY += 24;

  // Cash received & change
  if (transaction.payment_method === 'cash' && transaction.cash_received) {
    const cash = transaction.cash_received;
    const change =
      transaction.change_amount !== undefined
        ? transaction.change_amount
        : Math.max(0, cash - transaction.total_amount);

    ctx.fillStyle = '#333333';
    drawKeyValue('Tunai Diterima:', formatRupiah(cash));
    ctx.fillStyle = '#000000';
    drawKeyValue('Kembalian:', formatRupiah(change), true);
  }

  currentY += 6;
  drawDivider(currentY);
  currentY += 18;

  // 8. Custom Footer
  const footerMessage = (profile.receipt_footer || 'Terima kasih atas kunjungan Anda!').trim();
  ctx.fillStyle = '#444444';
  ctx.font = `normal ${paperWidth === '58mm' ? 11 : 13}px ${primaryFont}`;
  currentY = drawWrappedText(ctx, footerMessage, centerX, currentY, contentWidth, 18, 'center');

  // 9. Branding
  ctx.fillStyle = '#888888';
  ctx.font = `normal ${paperWidth === '58mm' ? 9 : 11}px ${primaryFont}`;
  ctx.textAlign = 'center';
  ctx.fillText('Dicatat via BisnisKu', centerX, currentY + 8);

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


