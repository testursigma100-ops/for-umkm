import React, { useRef, useState } from 'react';
import { Transaction, BusinessProfile } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  Share2,
  X,
  Check,
  Loader2,
  Copy,
  Receipt as ReceiptIcon,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  profile: BusinessProfile;
}

export function ReceiptModal({ isOpen, onClose, transaction, profile }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  if (!isOpen || !transaction) return null;

  // Real store identity from Business Profile (NEVER hardcoded)
  const businessName = profile.business_name?.trim() || 'BisnisKu';
  const paymentMethodLabel =
    transaction.payment_method === 'cash'
      ? 'Tunai'
      : transaction.payment_method === 'qris'
      ? 'QRIS'
      : transaction.payment_method === 'transfer'
      ? 'Transfer Bank'
      : 'Lainnya';

  // Financial details
  const subtotalAmount =
    transaction.subtotal !== undefined
      ? transaction.subtotal
      : Array.isArray(transaction.items) && transaction.items.length > 0
      ? transaction.items.reduce((sum, item) => sum + Number(item.subtotal || item.quantity * item.unit_price), 0)
      : transaction.total_amount;

  const discountAmount = transaction.discount || 0;
  const totalAmount = transaction.total_amount;
  const cashReceived = transaction.cash_received;
  const changeAmount = transaction.change_amount;

  // Format text representation for clipboard / WhatsApp fallback
  const generateReceiptText = () => {
    let text = `================================\n`;
    text += `*${businessName.toUpperCase()}*\n`;
    if (profile.address) text += `${profile.address}\n`;
    if (profile.phone) text += `Telp: ${profile.phone}\n`;
    if (profile.instagram) text += `IG: @${profile.instagram.replace('@', '')}\n`;
    text += `================================\n`;
    text += `No. Nota : ${transaction.invoice_number}\n`;
    text += `Tanggal  : ${formatDateTime(transaction.created_at || transaction.date)}\n`;
    if (transaction.customer_name) text += `Pelanggan: ${transaction.customer_name}\n`;
    if (transaction.notes) text += `Catatan  : ${transaction.notes}\n`;
    text += `Metode   : ${paymentMethodLabel}\n`;
    text += `--------------------------------\n`;

    if (Array.isArray(transaction.items) && transaction.items.length > 0) {
      transaction.items.forEach(item => {
        text += `${item.product_name}\n`;
        text += `  ${item.quantity} x ${formatRupiah(item.unit_price)} = ${formatRupiah(item.subtotal || item.quantity * item.unit_price)}\n`;
      });
    }

    text += `--------------------------------\n`;
    if (discountAmount > 0) {
      text += `Subtotal : ${formatRupiah(subtotalAmount)}\n`;
      text += `Diskon   : -${formatRupiah(discountAmount)}\n`;
    }
    text += `*TOTAL    : ${formatRupiah(totalAmount)}*\n`;

    if (transaction.payment_method === 'cash' && cashReceived !== undefined && cashReceived > 0) {
      text += `Bayar    : ${formatRupiah(cashReceived)}\n`;
      text += `Kembali  : ${formatRupiah(changeAmount !== undefined ? changeAmount : Math.max(0, cashReceived - totalAmount))}\n`;
    }

    text += `================================\n`;
    text += `${profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}\n`;
    text += `Dicatat via BisnisKu\n`;
    return text;
  };

  // Helper to rasterize receipt into Canvas and return blob
  const rasterizeReceiptToBlob = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    const canvas = await html2canvas(receiptRef.current, {
      scale: 3, // High DPI / Crisp raster image rendering
      backgroundColor: '#FFFFFF',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png', 0.95);
    });
  };

  // 1. ACTION: SIMPAN SEBAGAI GAMBAR (Direct PNG Download)
  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingImage(true);
    try {
      const blob = await rasterizeReceiptToBlob();
      if (!blob) throw new Error('Gagal merender gambar canvas.');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Struk_${transaction.invoice_number || Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackMsg({ text: 'Gambar struk (PNG) berhasil disimpan!', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Error generating receipt image:', err);
      setFeedbackMsg({ text: 'Gagal membuat gambar struk.', type: 'info' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. ACTION: BAGIKAN (Web Share API as PNG File with safe fallback)
  const handleShare = async () => {
    if (!receiptRef.current) return;
    setIsSharing(true);

    try {
      const blob = await rasterizeReceiptToBlob();
      const fileName = `Struk_${transaction.invoice_number || 'receipt'}.png`;
      const receiptText = generateReceiptText();

      let sharedAsFile = false;

      if (blob && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Struk Transaksi - ${businessName}`,
            text: `Struk pembelian di ${businessName} (${transaction.invoice_number})`,
            files: [file],
          });
          sharedAsFile = true;
          setFeedbackMsg({ text: 'Struk berhasil dibagikan!', type: 'success' });
        }
      }

      if (!sharedAsFile) {
        // Fallback: Copy text + download PNG image + open WhatsApp
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        await navigator.clipboard.writeText(receiptText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);

        setFeedbackMsg({
          text: 'Gambar struk diunduh & teks disalin ke clipboard untuk dibagikan!',
          type: 'info',
        });

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptText)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Copy text fallback
        const receiptText = generateReceiptText();
        navigator.clipboard.writeText(receiptText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);
        setFeedbackMsg({ text: 'Teks struk berhasil disalin ke clipboard.', type: 'success' });
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // 3. ACTION: CETAK (Thermal Print Compact 58mm/80mm)
  const handlePrint = () => {
    window.print();
  };

  // 4. ACTION: SALIN TEKS
  const handleCopyText = () => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setFeedbackMsg({ text: 'Teks struk berhasil disalin!', type: 'success' });
    setTimeout(() => {
      setCopiedText(false);
      setFeedbackMsg(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#151515] border border-[#252525] rounded-xl w-full max-w-md my-auto shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525] bg-[#111111] select-none shrink-0">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-[#22C55E]" />
            <h3 className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">
              Struk Transaksi Kasir
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Paper Width Selector */}
            <div className="flex items-center bg-[#1C1C1E] border border-[#252525] rounded-md p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  paperWidth === '80mm' ? 'bg-[#252525] text-[#F5F5F5]' : 'text-[#8A8A8A] hover:text-[#F5F5F5]'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  paperWidth === '58mm' ? 'bg-[#252525] text-[#F5F5F5]' : 'text-[#8A8A8A] hover:text-[#F5F5F5]'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-medium text-center border-b select-none ${
              feedbackMsg.type === 'success'
                ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Scrollable Receipt Canvas Preview Area */}
        <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-[#0B0B0C]">
          {/* Authentic Portrait Thermal Raster View (Exact 576px / 384px raster equivalent) */}
          <div
            ref={receiptRef}
            id="printable-thermal-receipt"
            className={`w-full bg-white text-black font-mono text-[11px] leading-tight shadow-lg select-text transition-all ${
              paperWidth === '58mm'
                ? 'max-w-[270px] p-4 text-[10px] thermal-58mm'
                : 'max-w-[340px] p-5 text-[11px]'
            }`}
          >
            {/* Store Logo & Header */}
            <div className="text-center space-y-1 mb-2.5">
              {profile.logo_url && (
                <div className="flex justify-center pb-1">
                  <img
                    src={profile.logo_url}
                    alt="Logo Usaha"
                    crossOrigin="anonymous"
                    className="max-h-12 max-w-[120px] object-contain filter grayscale contrast-125"
                  />
                </div>
              )}

              <h2 className="text-sm font-bold tracking-tight uppercase leading-snug break-words">
                {businessName}
              </h2>

              {profile.address && (
                <p className="text-[10px] text-gray-700 leading-tight break-words">
                  {profile.address}
                </p>
              )}

              {profile.phone && (
                <p className="text-[10px] text-gray-700">
                  Telp/WA: {profile.phone}
                </p>
              )}

              {profile.instagram && (
                <p className="text-[10px] text-gray-700">
                  IG: @{profile.instagram.replace('@', '')}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Transaction Metadata */}
            <div className="space-y-0.5 text-[10px] text-gray-800">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-semibold">{transaction.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDateTime(transaction.created_at || transaction.date)}</span>
              </div>
              {transaction.customer_name && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-medium">{transaction.customer_name}</span>
                </div>
              )}
              {transaction.notes && (
                <div className="flex justify-between">
                  <span>Catatan:</span>
                  <span>{transaction.notes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Pembayaran:</span>
                <span className="font-semibold">{paymentMethodLabel}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Product Items Table */}
            <div className="space-y-1.5 py-0.5">
              {Array.isArray(transaction.items) && transaction.items.length > 0 ? (
                transaction.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-gray-900 break-words">
                      {item.product_name}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-700 pl-1">
                      <span>
                        {item.quantity} x {formatRupiah(item.unit_price)}
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        {formatRupiah(item.subtotal || item.quantity * item.unit_price)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>Total Transaksi</span>
                  <span>{formatRupiah(transaction.total_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Financial Summary Calculation */}
            <div className="space-y-1 text-[11px]">
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-gray-700">
                    <span>Subtotal:</span>
                    <span className="tabular-nums">{formatRupiah(subtotalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-red-600">
                    <span>Diskon:</span>
                    <span className="tabular-nums">-{formatRupiah(discountAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xs font-bold pt-0.5">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupiah(totalAmount)}</span>
              </div>

              {transaction.payment_method === 'cash' && cashReceived !== undefined && cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-gray-700 pt-0.5">
                    <span>Tunai:</span>
                    <span className="tabular-nums">{formatRupiah(cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-800 font-semibold">
                    <span>Kembalian:</span>
                    <span className="tabular-nums">
                      {formatRupiah(changeAmount !== undefined ? changeAmount : Math.max(0, cashReceived - totalAmount))}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2.5" />

            {/* Custom Store Footer Message */}
            <div className="text-center text-[10px] text-gray-600 space-y-0.5 pt-0.5">
              <p className="font-medium break-words">
                {profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}
              </p>
              <p className="text-[8px] text-gray-400 pt-1">
                Dicatat via BisnisKu
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="p-3 bg-[#111111] border-t border-[#252525] space-y-2 select-none shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* 1. Simpan sebagai Gambar (PNG) */}
            <button
              type="button"
              disabled={isGeneratingImage || isSharing}
              onClick={handleSaveImage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
                  <span>Merender PNG...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Simpan Gambar</span>
                </>
              )}
            </button>

            {/* 2. Cetak Struk (Thermal 58mm/80mm) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Cetak Struk</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 3. Bagikan Struk (PNG Image via Web Share API) */}
            <button
              type="button"
              disabled={isSharing || isGeneratingImage}
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0B0C] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0B0C]" />
                  <span>Mempersiapkan...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Bagikan Gambar</span>
                </>
              )}
            </button>

            {/* 4. Salin Teks Struk */}
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#8A8A8A] hover:text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-[#22C55E]">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
