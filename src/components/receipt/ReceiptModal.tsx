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
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !transaction) return null;

  const businessTitle = profile.business_name || 'BisnisKu';
  const paymentMethodLabel =
    transaction.payment_method === 'cash'
      ? 'Tunai'
      : transaction.payment_method === 'qris'
      ? 'QRIS'
      : transaction.payment_method === 'transfer'
      ? 'Transfer Bank'
      : 'Lainnya';

  // Format receipt text for quick copy / WhatsApp sharing
  const generateReceiptText = () => {
    let text = `*${businessTitle.toUpperCase()}*\n`;
    if (profile.address) text += `${profile.address}\n`;
    if (profile.phone) text += `Telp: ${profile.phone}\n`;
    if (profile.instagram) text += `IG: @${profile.instagram.replace('@', '')}\n`;
    text += `--------------------------------\n`;
    text += `No. Nota : ${transaction.invoice_number}\n`;
    text += `Tanggal  : ${formatDateTime(transaction.created_at || transaction.date)}\n`;
    if (transaction.customer_name) text += `Pelanggan: ${transaction.customer_name}\n`;
    text += `Metode   : ${paymentMethodLabel}\n`;
    text += `--------------------------------\n`;

    if (Array.isArray(transaction.items)) {
      transaction.items.forEach(item => {
        text += `${item.product_name}\n`;
        text += `  ${item.quantity} x ${formatRupiah(item.unit_price)} = ${formatRupiah(item.subtotal || item.quantity * item.unit_price)}\n`;
      });
    }

    text += `--------------------------------\n`;
    text += `*TOTAL    : ${formatRupiah(transaction.total_amount)}*\n`;
    text += `--------------------------------\n`;
    text += `${profile.receipt_footer || 'Terima kasih sudah berbelanja!'}\n`;
    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3, // High DPI / Crisp
        backgroundColor: '#FFFFFF',
        logging: false,
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Struk_${transaction.invoice_number || Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Error generating receipt image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareWhatsApp = async () => {
    const text = generateReceiptText();
    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyText = () => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#151515] border border-[#252525] rounded-xl w-full max-w-md my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525] bg-[#111111] select-none shrink-0">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-[#22C55E]" />
            <h3 className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">
              Struk Transaksi Kasir
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#8A8A8A] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-[#0B0B0C]">
          {/* Authentic Clean Thermal Paper View (Pure B&W / Monospace) */}
          <div
            ref={receiptRef}
            id="printable-thermal-receipt"
            className="w-full max-w-[320px] bg-white text-black p-5 font-mono text-[11px] leading-tight shadow-md select-text"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5 mb-3">
              <h2 className="text-sm font-bold tracking-tight uppercase">
                {businessTitle}
              </h2>
              {profile.address && (
                <p className="text-[10px] text-gray-700 leading-tight">
                  {profile.address}
                </p>
              )}
              {profile.phone && (
                <p className="text-[10px] text-gray-700">
                  Telp: {profile.phone}
                </p>
              )}
              {profile.instagram && (
                <p className="text-[10px] text-gray-700">
                  IG: @{profile.instagram.replace('@', '')}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Meta Info */}
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
                  <span>{transaction.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Pembayaran:</span>
                <span className="font-semibold">{paymentMethodLabel}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Purchased Items List */}
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

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-xs font-bold pt-0.5">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupiah(transaction.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Metode Bayar:</span>
                <span>{paymentMethodLabel}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2.5" />

            {/* Receipt Footer Message */}
            <div className="text-center text-[10px] text-gray-600 space-y-0.5 pt-0.5">
              <p className="font-medium">
                {profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}
              </p>
              <p className="text-[8px] text-gray-400 pt-1">
                Dicatat via BisnisKu
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cetak, Simpan Gambar, Bagikan */}
        <div className="p-3 bg-[#111111] border-t border-[#252525] space-y-2 select-none shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* Cetak Struk */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Cetak Struk</span>
            </button>

            {/* Simpan Gambar (PNG) */}
            <button
              type="button"
              disabled={isGeneratingImage}
              onClick={handleSaveImage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Simpan Gambar</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Bagikan ke WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0B0C] rounded-lg text-xs font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Kirim WhatsApp</span>
            </button>

            {/* Salin Teks Struk */}
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
