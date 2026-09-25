import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Transaction, BusinessProfile } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { renderReceiptToCanvas, canvasToBlob } from '../../utils/receiptCanvas';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [receiptImgSrc, setReceiptImgSrc] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Store active canvas in ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const businessName = (profile.business_name || 'BisnisKu').trim();

  // Render Canvas as the single source of truth
  useEffect(() => {
    if (!isOpen || !transaction) {
      setReceiptImgSrc('');
      canvasRef.current = null;
      return;
    }

    let isMounted = true;
    setIsGenerating(true);

    renderReceiptToCanvas(transaction, profile, { paperWidth, scale: 2 })
      .then(canvas => {
        if (!isMounted) return;
        canvasRef.current = canvas;
        const dataUrl = canvas.toDataURL('image/png');
        setReceiptImgSrc(dataUrl);
        setIsGenerating(false);
      })
      .catch(err => {
        console.error('Error rendering receipt canvas:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, transaction, profile, paperWidth]);

  if (!isOpen || !transaction) return null;

  // Format textual receipt strictly for clipboard & WhatsApp fallback
  const getReceiptFormattedText = () => {
    const paymentMethodLabel =
      transaction.payment_method === 'cash'
        ? 'Tunai'
        : transaction.payment_method === 'qris'
        ? 'QRIS'
        : transaction.payment_method === 'transfer'
        ? 'Transfer Bank'
        : 'Lainnya';

    const discountAmount = transaction.discount || 0;
    const subtotalAmount =
      transaction.subtotal ||
      (discountAmount > 0 ? transaction.total_amount + discountAmount : transaction.total_amount);

    let text = `================================\n`;
    text += `*${businessName.toUpperCase()}*\n`;
    if (profile.address) text += `${profile.address}\n`;
    if (profile.phone) text += `Telp/WA: ${profile.phone}\n`;
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
    text += `*TOTAL    : ${formatRupiah(transaction.total_amount)}*\n`;

    if (transaction.payment_method === 'cash' && transaction.cash_received) {
      text += `Bayar    : ${formatRupiah(transaction.cash_received)}\n`;
      const change =
        transaction.change_amount !== undefined
          ? transaction.change_amount
          : Math.max(0, transaction.cash_received - transaction.total_amount);
      text += `Kembali  : ${formatRupiah(change)}\n`;
    }

    text += `================================\n`;
    text += `${profile.receipt_footer || 'Terima kasih atas kunjungan Anda!'}\n`;
    text += `Dicatat via BisnisKu\n`;
    return text;
  };

  // Helper to save base64 image to native cache & get file URI
  const getNativeImageUri = async (canvas: HTMLCanvasElement, fileName: string) => {
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    const uriResult = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    return uriResult.uri;
  };

  // 1. Simpan Gambar PNG langsung dari Canvas
  const handleSaveImage = async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);

    try {
      const fileName = `Struk_${transaction.invoice_number || Date.now()}.png`;

      // Native Capacitor Android Save Flow
      if (Capacitor.isNativePlatform()) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        const fileUri = await getNativeImageUri(canvasRef.current, fileName);

        // Share/save via native share sheet or cache
        await Share.share({
          title: `Simpan Struk - ${businessName}`,
          text: `Struk pembelian (${transaction.invoice_number})`,
          url: fileUri,
          dialogTitle: 'Simpan Gambar Struk',
        });

        setFeedbackMsg({ text: 'Gambar struk berhasil disimpan!', type: 'success' });
        return;
      }

      // Standard Web Browser Download
      const blob = await canvasToBlob(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackMsg({ text: 'Gambar struk PNG berhasil diunduh!', type: 'success' });
    } catch (err) {
      console.error('Save image error:', err);
      if (receiptImgSrc && !Capacitor.isNativePlatform()) {
        const link = document.createElement('a');
        link.href = receiptImgSrc;
        link.download = `Struk_${transaction.invoice_number || Date.now()}.png`;
        link.click();
        setFeedbackMsg({ text: 'Gambar struk PNG berhasil diunduh!', type: 'success' });
      } else {
        setFeedbackMsg({ text: 'Gagal menyimpan gambar struk.', type: 'info' });
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // 2. Bagikan Gambar via Web Share API / Native Capacitor Share
  const handleShare = async () => {
    if (!canvasRef.current || isSharing) return;
    setIsSharing(true);

    try {
      const fileName = `Struk_${transaction.invoice_number || Date.now()}.png`;
      const receiptText = getReceiptFormattedText();

      // Native Capacitor Android Share Flow
      if (Capacitor.isNativePlatform()) {
        const fileUri = await getNativeImageUri(canvasRef.current, fileName);

        await Share.share({
          title: `Struk Transaksi - ${businessName}`,
          text: `Struk pembelian di ${businessName} (${transaction.invoice_number})`,
          url: fileUri,
          dialogTitle: 'Bagikan Struk Transaksi',
        });

        setFeedbackMsg({ text: 'Struk berhasil dibagikan!', type: 'success' });
        return;
      }

      // Standard Web Browser Share Flow
      let sharedSuccess = false;
      const blob = await canvasToBlob(canvasRef.current);

      if (navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Struk Transaksi - ${businessName}`,
            text: `Struk pembelian di ${businessName} (${transaction.invoice_number})`,
            files: [file],
          });
          sharedSuccess = true;
          setFeedbackMsg({ text: 'Struk berhasil dibagikan!', type: 'success' });
        }
      }

      // Safe Fallback: Download PNG + copy text + open WhatsApp
      if (!sharedSuccess) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await navigator.clipboard.writeText(receiptText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);

        setFeedbackMsg({
          text: 'Gambar struk diunduh & teks struk disalin ke clipboard!',
          type: 'info',
        });

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptText)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const receiptText = getReceiptFormattedText();
        navigator.clipboard.writeText(receiptText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);
        setFeedbackMsg({ text: 'Teks struk disalin ke clipboard.', type: 'success' });
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // 3. Cetak thermal
  const handlePrint = async () => {
    if (Capacitor.isNativePlatform() && canvasRef.current) {
      try {
        const fileName = `Struk_${transaction.invoice_number || Date.now()}.png`;
        const fileUri = await getNativeImageUri(canvasRef.current, fileName);

        await Share.share({
          title: `Cetak Struk - ${businessName}`,
          url: fileUri,
          dialogTitle: 'Pilih Layanan Cetak / Aplikasi',
        });
      } catch (err) {
        console.error('Native print share error:', err);
        window.print();
      }
      return;
    }

    window.print();
  };

  // 4. Salin teks
  const handleCopyText = () => {
    const text = getReceiptFormattedText();
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
            {/* Thermal Paper Width Switcher */}
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

        {/* Canvas Image Preview Area */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#0B0B0C]">
          {isGenerating && !receiptImgSrc ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-[#8A8A8A]">
              <Loader2 className="w-6 h-6 animate-spin text-[#22C55E]" />
              <span>Membuat struk gambar canvas...</span>
            </div>
          ) : receiptImgSrc ? (
            <div id="printable-thermal-receipt" className="flex justify-center w-full">
              <img
                src={receiptImgSrc}
                alt={`Struk ${transaction.invoice_number}`}
                className={`w-full shadow-2xl rounded-xs bg-white transition-all ${
                  paperWidth === '58mm' ? 'max-w-[270px]' : 'max-w-[340px]'
                }`}
              />
            </div>
          ) : null}
        </div>

        {/* Action Controls Bar */}
        <div className="p-3 bg-[#111111] border-t border-[#252525] space-y-2 select-none shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {/* 1. Simpan sebagai Gambar (PNG) */}
            <button
              type="button"
              disabled={isSaving || isGenerating}
              onClick={handleSaveImage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Simpan Gambar</span>
                </>
              )}
            </button>

            {/* 2. Cetak Struk (Thermal) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Cetak Struk</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 3. Bagikan Gambar */}
            <button
              type="button"
              disabled={isSharing || isGenerating}
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0B0C] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]"
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
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F1F1F] hover:bg-[#282828] border border-[#252525] text-[#8A8A8A] hover:text-[#F5F5F5] rounded-lg text-xs font-medium transition-colors active:scale-[0.98]"
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
