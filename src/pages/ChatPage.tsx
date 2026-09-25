import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { ChatMessage } from '../types';
import { supabase, getSupabaseConfig } from '../lib/supabase';
import { formatRupiah } from '../utils/formatters';
import {
  Send,
  BotMessageSquare,
  User,
  Sparkles,
  RefreshCw,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  isUser?: boolean;
}

function renderFormattedInline(text: string, isUser = false): React.ReactNode {
  // Regex to match **bold**, `code`, and *italic*
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong
          key={`b-${keyIndex++}`}
          className={`font-semibold ${isUser ? 'text-black' : 'text-white'}`}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${keyIndex++}`}
          className={`px-1 py-0.5 rounded font-mono text-[11px] ${
            isUser
              ? 'bg-black/10 text-black border border-black/20'
              : 'bg-[#1C1C22] text-[#10B981] border border-[#2A2A35]'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em
          key={`i-${keyIndex++}`}
          className={`italic ${isUser ? 'text-black/90' : 'text-[#E0E0E6]'}`}
        >
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function MarkdownContent({ content, isUser = false }: MarkdownContentProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inList: 'bullet' | 'number' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (inList && listItems.length > 0) {
      if (inList === 'bullet') {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="space-y-1.5 my-1.5 pl-0.5">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${keyPrefix}`} className="space-y-1.5 my-1.5 pl-0.5">
            {listItems}
          </ol>
        );
      }
      listItems = [];
      inList = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for empty line
    if (!trimmed) {
      flushList(`empty-${index}`);
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(`hr-${index}`);
      elements.push(<hr key={`hr-${index}`} className="my-2.5 border-[#22222A]" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      flushList(`h4-${index}`);
      elements.push(
        <h5 key={`h4-${index}`} className="text-xs font-bold text-[#10B981] mt-2 mb-1">
          {renderFormattedInline(trimmed.slice(5), isUser)}
        </h5>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushList(`h3-${index}`);
      elements.push(
        <h4 key={`h3-${index}`} className="text-xs sm:text-sm font-bold text-[#F0F0F2] mt-2.5 mb-1 flex items-center gap-1.5">
          {renderFormattedInline(trimmed.slice(4), isUser)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(`h2-${index}`);
      elements.push(
        <h3 key={`h2-${index}`} className="text-sm font-bold text-white mt-3 mb-1.5">
          {renderFormattedInline(trimmed.slice(3), isUser)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(`h1-${index}`);
      elements.push(
        <h2 key={`h1-${index}`} className="text-sm sm:text-base font-bold text-white mt-3.5 mb-2">
          {renderFormattedInline(trimmed.slice(2), isUser)}
        </h2>
      );
      return;
    }

    // Bullet List (- item, * item, • item, + item)
    const bulletMatch = trimmed.match(/^([-*•+])\s+(.+)$/);
    if (bulletMatch) {
      if (inList !== 'bullet') {
        flushList(`before-bullet-${index}`);
        inList = 'bullet';
      }
      listItems.push(
        <li key={`bullet-${index}`} className="flex items-start gap-2 text-xs leading-relaxed text-[#D1D1DB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
          <span className="flex-1">{renderFormattedInline(bulletMatch[2], isUser)}</span>
        </li>
      );
      return;
    }

    // Numbered List (1. item)
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberMatch) {
      if (inList !== 'number') {
        flushList(`before-number-${index}`);
        inList = 'number';
      }
      listItems.push(
        <li key={`num-${index}`} className="flex items-start gap-2 text-xs leading-relaxed text-[#D1D1DB]">
          <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/15 px-1.5 py-0.5 rounded shrink-0">
            {numberMatch[1]}
          </span>
          <span className="flex-1">{renderFormattedInline(numberMatch[2], isUser)}</span>
        </li>
      );
      return;
    }

    // Regular paragraph text
    flushList(`para-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-xs leading-relaxed text-[#E4E4E9]">
        {renderFormattedInline(trimmed, isUser)}
      </p>
    );
  });

  flushList('final');

  return <div className="space-y-1">{elements}</div>;
}

export function ChatPage() {
  const { profile, business, products, transactions, expenses, dashboardSummary, user } = useBusiness();

  // Initial welcome message from Copilot
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Halo Bos ${profile.owner_name || 'Owner'}! Saya **BisnisKu Copilot**, asisten keuangan & operasional AI untuk **${profile.business_name || 'Bisnis Anda'}**.\n\nSaya terhubung langsung dengan data penjualan riil, margin produk, stok, dan pengeluaran Anda. Apa yang ingin dianalisis hari ini?`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Suggested prompt pills as requested
  const samplePrompts = [
    'Hari ini gue untung berapa?',
    'Produk mana paling menguntungkan?',
    'Produk mana paling laris?',
    'Kenapa laba gue turun?',
    'Kalau diskon 10%, masih untung nggak?',
    'Kalau besok jual 100 cup, kira-kira untung berapa?',
    'Produk mana yang harus gue restock?',
    'Bikinin caption promo untuk produk ini.',
  ];

  // Send message to server Gemini endpoint with real Supabase business context
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    setChatError(null);
    const userMsgId = 'msg-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Prepare assistant placeholder message for streaming
    const assistantMsgId = 'msg-ai-' + (Date.now() + 1);
    setMessages(prev => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      // 1. Get Supabase auth token if session exists
      let token = '';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        token = sessionData?.session?.access_token || '';
      } catch {
        // Continue with context payload
      }

      const cfg = getSupabaseConfig();

      // 2. Prepare real compact business context from authenticated state
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Calculate sale items volume and profit rankings
      const itemMap: Record<string, { name: string; quantity: number; revenue: number; grossProfit: number }> = {};
      transactions.forEach(t => {
        if (Array.isArray(t.items)) {
          t.items.forEach(it => {
            const name = (it.product_name || 'Produk').trim();
            if (!itemMap[name]) {
              itemMap[name] = { name, quantity: 0, revenue: 0, grossProfit: 0 };
            }
            const qty = Number(it.quantity || 1);
            const sub = Number(it.subtotal || 0);
            const subHpp = Number(it.subtotal_hpp || (qty * Number(it.unit_hpp || 0)));
            itemMap[name].quantity += qty;
            itemMap[name].revenue += sub;
            itemMap[name].grossProfit += (sub - subHpp);
          });
        }
      });

      const topByVolume = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      const topByProfit = Object.values(itemMap).sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);

      const mappedProducts = products.map(p => {
        const price = Number(p.selling_price || 0);
        const hpp = Number(p.hpp || 0);
        const profit = price - hpp;
        const margin = price > 0 ? Math.round((profit / price) * 1000) / 10 : 0;
        return {
          name: p.name,
          category: p.category,
          selling_price: price,
          hpp,
          profit_per_unit: profit,
          margin_pct: margin,
          current_stock: p.stock,
          unit: p.unit,
          min_stock: p.min_stock,
          is_low_stock: p.stock <= p.min_stock,
        };
      });

      const businessContext = {
        store_profile: {
          business_name: profile.business_name || business?.name || 'Bisnis Anda',
          owner_name: profile.owner_name || 'Bos',
          business_type: profile.business_type || 'F&B',
          address: profile.address || '',
        },
        today_real_metrics: {
          date: todayStr,
          omzet: dashboardSummary.omzetToday,
          hpp: transactions
            .filter(t => (t.date ? t.date.split('T')[0] : '') === todayStr)
            .reduce((sum, t) => sum + (t.total_hpp || 0), 0),
          gross_profit: dashboardSummary.omzetToday - transactions
            .filter(t => (t.date ? t.date.split('T')[0] : '') === todayStr)
            .reduce((sum, t) => sum + (t.total_hpp || 0), 0),
          operational_expenses: dashboardSummary.expensesToday,
          net_profit: dashboardSummary.estimatedProfitToday,
          transaction_count: dashboardSummary.transactionsCountToday,
        },
        products_catalog: mappedProducts,
        low_stock_alerts: mappedProducts.filter(p => p.is_low_stock),
        top_selling_products_by_volume: topByVolume,
        top_selling_products_by_profit: topByProfit,
        recent_expenses: expenses.slice(0, 10).map(e => ({
          name: e.name,
          amount: e.amount,
          category: e.category,
          date: e.date,
        })),
        total_lifetime_transactions: transactions.length,
      };

      // 3. Setup streaming fetch request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (cfg.url) headers['x-supabase-url'] = cfg.url;
      if (cfg.anonKey) headers['x-supabase-anon-key'] = cfg.anonKey;

      const res = await fetch('/api/chat?stream=true', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: query.trim(),
          history: messages.slice(-6).filter(m => m.id !== assistantMsgId),
          businessId: business?.id,
          businessContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }

      // Check if response is streaming SSE
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                  )
                );
              }
            } catch {
              // Ignore non-JSON stream ping
            }
          }
        }

        if (!accumulatedText.trim()) {
          throw new Error('Jawaban kosong dari server.');
        }
      } else {
        // Fallback standard JSON
        const data = await res.json();
        const text = data.reply || 'Maaf, saya tidak dapat menjawab saat ini.';
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: text } : m
          )
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);

      // Provide accurate grounded reply based on real business state
      const fallbackReply = `Halo Bos, koneksi Copilot sempat terputus sesaat. Rekap riil toko saat ini:\n\n• **Omzet Hari Ini**: ${formatRupiah(dashboardSummary.omzetToday)}\n• **Pengeluaran Hari Ini**: ${formatRupiah(dashboardSummary.expensesToday)}\n• **Laba Bersih**: ${formatRupiah(dashboardSummary.estimatedProfitToday)}\n• **Transaksi**: ${dashboardSummary.transactionsCountToday} pesanan\n\nSilakan klik tombol kirim lagi untuk mencoba kembali.`;

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: fallbackReply,
              }
            : m
        )
      );
      setChatError('Koneksi terganggu. Data ditampilkan dari rekap riil sistem.');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-135px)] md:h-[calc(100vh-100px)] pb-16 md:pb-0">
      {/* Header */}
      <div className="pb-3 border-b border-[#22222A] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#16161B] border border-[#22222A] flex items-center justify-center text-[#10B981]">
            <BotMessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[#F0F0F2]">
                Tanya Bisnis AI Copilot
              </h1>
              <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded">
                Grounded Real Data
              </span>
            </div>
            <p className="text-xs text-[#7A7A84]">
              Data {profile.business_name || 'usaha Anda'} terkoneksi otomatis
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: 'msg-welcome-new',
                role: 'assistant',
                content: `Chat dibersihkan! Mau tanya apa sekarang seputar data penjualan atau operasional **${profile.business_name || 'usaha Anda'}**?`,
                timestamp: new Date().toISOString(),
              },
            ]);
            setChatError(null);
          }}
          className="p-1.5 text-[#7A7A84] hover:text-[#F0F0F2] hover:bg-[#101013] rounded-lg transition-colors text-xs flex items-center gap-1"
          title="Bersihkan Percakapan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map(msg => {
          const isUser = msg.role === 'user';

          // Skip rendering empty assistant bubbles before first token arrives
          if (!isUser && !msg.content && isLoading) {
            return null;
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-[#10B981] text-black font-bold'
                    : 'bg-[#16161B] border border-[#22222A] text-[#10B981]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <BotMessageSquare className="w-3.5 h-3.5" />}
              </div>

              {/* Message bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#10B981] text-black font-medium'
                    : 'bg-[#101013] border border-[#22222A] text-[#F0F0F2]'
                }`}
              >
                <MarkdownContent content={msg.content} isUser={isUser} />
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#16161B] border border-[#22222A] flex items-center justify-center text-[#10B981] shrink-0">
              <BotMessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#101013] border border-[#22222A] rounded-xl px-4 py-3 text-xs text-[#7A7A84] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span>Copilot sedang menganalisis data riil bisnismu...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {chatError && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts pills */}
      <div className="pt-2 pb-2">
        <p className="text-[10px] text-[#7A7A84] mb-1.5 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Pertanyaan Cepat Rekomendasi:</span>
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 text-[11px] font-medium text-[#F0F0F2] bg-[#101013] hover:bg-[#16161B] border border-[#22222A] hover:border-[#10B981]/50 rounded-lg whitespace-nowrap transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 pt-2 border-t border-[#22222A]"
      >
        <input
          type="text"
          placeholder="Tanyakan apapun ke Copilot (misal: laba hari ini, ide promo, stok)..."
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 text-xs bg-[#101013] border border-[#22222A] rounded-xl text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </div>
  );
}
