import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { ChatMessage } from '../types';
import { supabase, getSupabaseConfig } from '../lib/supabase';
import { getApiBaseUrl } from '../lib/api';
import {
  Send,
  User,
  RefreshCw,
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
          className={`font-semibold ${isUser ? 'text-[#F5F5F5]' : 'text-[#F5F5F5]'}`}
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
              ? 'bg-[#141416] text-[#22C55E] border border-[#242428]'
              : 'bg-[#1C1C20] text-[#22C55E] border border-[#242428]'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em
          key={`i-${keyIndex++}`}
          className={`italic ${isUser ? 'text-[#F5F5F5]' : 'text-[#8A8A91]'}`}
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
          <ul key={`ul-${keyPrefix}`} className="space-y-1 my-1.5 pl-0.5">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${keyPrefix}`} className="space-y-1 my-1.5 pl-0.5">
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
      elements.push(<div key={`space-${index}`} className="h-1.5" />);
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(`hr-${index}`);
      elements.push(<hr key={`hr-${index}`} className="my-2 border-[#242428]" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      flushList(`h4-${index}`);
      elements.push(
        <h5 key={`h4-${index}`} className="text-xs font-bold text-[#22C55E] mt-2 mb-1">
          {renderFormattedInline(trimmed.slice(5), isUser)}
        </h5>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushList(`h3-${index}`);
      elements.push(
        <h4 key={`h3-${index}`} className="text-xs sm:text-sm font-bold text-[#F5F5F5] mt-2 mb-1">
          {renderFormattedInline(trimmed.slice(4), isUser)}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(`h2-${index}`);
      elements.push(
        <h3 key={`h2-${index}`} className="text-sm sm:text-base font-bold text-[#F5F5F5] mt-2.5 mb-1.5">
          {renderFormattedInline(trimmed.slice(3), isUser)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(`h1-${index}`);
      elements.push(
        <h2 key={`h1-${index}`} className="text-base sm:text-lg font-bold text-[#F5F5F5] mt-3 mb-1.5">
          {renderFormattedInline(trimmed.slice(2), isUser)}
        </h2>
      );
      return;
    }

    // Bullet List (- or * or +)
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (inList !== 'bullet') {
        flushList(`switch-to-bullet-${index}`);
        inList = 'bullet';
      }
      listItems.push(
        <li key={`li-${index}`} className="flex items-start gap-2 text-xs leading-relaxed">
          <span className="text-[#22C55E] mt-1 text-[10px] select-none">•</span>
          <span className="flex-1 text-[#F5F5F5]">
            {renderFormattedInline(bulletMatch[1], isUser)}
          </span>
        </li>
      );
      return;
    }

    // Numbered List (1. 2. etc.)
    const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numberMatch) {
      if (inList !== 'number') {
        flushList(`switch-to-number-${index}`);
        inList = 'number';
      }
      listItems.push(
        <li key={`li-${index}`} className="flex items-start gap-2 text-xs leading-relaxed">
          <span className="text-[#8A8A91] font-mono text-[11px] select-none shrink-0 w-4 text-right">
            {numberMatch[1]}.
          </span>
          <span className="flex-1 text-[#F5F5F5]">
            {renderFormattedInline(numberMatch[2], isUser)}
          </span>
        </li>
      );
      return;
    }

    // Regular Paragraph line
    flushList(`p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-xs leading-relaxed text-[#F5F5F5]">
        {renderFormattedInline(trimmed, isUser)}
      </p>
    );
  });

  flushList('final');

  return <div className="space-y-1">{elements}</div>;
}

export function ChatPage() {
  const { profile, dashboardSummary, products, transactions, expenses, business } = useBusiness();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Halo! Saya Asisten untuk **${profile.business_name || 'usaha Anda'}**.\n\nSaya telah terhubung langsung dengan data produk, penjualan, dan pengeluaran toko Anda. Mau tahu analisis performa atau perkembangan apa hari ini?`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const samplePrompts = [
    'Berapa omzet saya hari ini?',
    'Produk mana yang paling laku?',
    'Berapa laba saya bulan ini?',
    'Gimana kondisi bisnis saya?',
  ];

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const query = customPrompt || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `ai-${Date.now()}`;

    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMsg]);
    if (!customPrompt) setInputMessage('');
    setChatError(null);
    setIsLoading(true);

    try {
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ]);

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const cfg = getSupabaseConfig();

      const topByVolume = [...products]
        .map(p => {
          let qtySold = 0;
          let revSold = 0;
          transactions.forEach(t => {
            if (Array.isArray(t.items)) {
              t.items.forEach(it => {
                if (it.product_id === p.id || it.product_name === p.name) {
                  qtySold += Number(it.quantity || 0);
                  revSold += Number(it.subtotal || it.quantity * it.unit_price || 0);
                }
              });
            }
          });
          return { name: p.name, quantity_sold: qtySold, revenue: revSold };
        })
        .filter(p => p.quantity_sold > 0)
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, 5);

      const topByProfit = [...products]
        .map(p => {
          let profit = 0;
          transactions.forEach(t => {
            if (Array.isArray(t.items)) {
              t.items.forEach(it => {
                if (it.product_id === p.id || it.product_name === p.name) {
                  const itemProfit =
                    (Number(it.subtotal) || it.quantity * it.unit_price) -
                    (Number(it.subtotal_hpp) || it.quantity * (it.unit_hpp || p.hpp || 0));
                  profit += itemProfit;
                }
              });
            }
          });
          return { name: p.name, estimated_profit: profit };
        })
        .filter(p => p.estimated_profit > 0)
        .sort((a, b) => b.estimated_profit - a.estimated_profit)
        .slice(0, 5);

      const mappedProducts = products.map(p => ({
        name: p.name,
        category: p.category,
        selling_price: p.selling_price,
        hpp: p.hpp,
        unit_profit: p.selling_price - p.hpp,
        margin_percent:
          p.selling_price > 0 ? Math.round(((p.selling_price - p.hpp) / p.selling_price) * 100) : 0,
        stock: p.stock,
        unit: p.unit,
        min_stock: p.min_stock,
        is_low_stock: p.stock <= p.min_stock,
      }));

      const todayStr = new Date().toISOString().split('T')[0];
      const businessContext = {
        business_profile: {
          name: profile.business_name,
          owner: profile.owner_name,
          type: profile.business_type,
          address: profile.address,
        },
        financial_summary_today: {
          revenue: dashboardSummary.omzetToday,
          cogs_hpp: transactions
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

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (cfg.url) headers['x-supabase-url'] = cfg.url;
      if (cfg.anonKey) headers['x-supabase-anon-key'] = cfg.anonKey;

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/chat?stream=true`, {
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

        if (!accumulatedText) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      'Maaf, tidak menerima respons dari Asisten. Mohon coba ulangi pertanyaan Anda.',
                  }
                : m
            )
          );
        }
      } else {
        const data = await res.json();
        const reply =
          data.response ||
          data.text ||
          'Maaf, tidak dapat menghasilkan jawaban saat ini. Silakan coba kembali.';
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: reply } : m))
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      setChatError(err.message || 'Gagal menghubungi Asisten.');
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  'Terjadi gangguan saat memproses jawaban Asisten. Pastikan koneksi internet stabil dan coba kembali.',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-132px)] max-h-none max-w-4xl mx-auto pb-16 md:pb-0">
      {/* Chat Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242428] shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,.45)]" />
            <h1 className="text-sm font-semibold text-[#F5F5F5]">Asisten</h1>
            <span className="text-[8px] text-[#65706B]">BisnisKu</span>
          </div>
          <p className="mt-0.5 text-[9px] text-[#69716F]">Analisis bisnis berdasarkan data usahamu.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages([
              {
                id: 'msg-welcome-new',
                role: 'assistant',
                content: `Percakapan dibersihkan! Mau tanya apa sekarang seputar data **${profile.business_name || 'usaha Anda'}**?`,
                timestamp: new Date().toISOString(),
              },
            ]);
            setChatError(null);
          }}
          className="p-1.5 text-[#8A8A91] hover:text-[#F5F5F5] hover:bg-[#141416] rounded-lg transition-colors text-xs flex items-center gap-1 select-none"
          title="Bersihkan Percakapan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const isCopied = copiedId === msg.id;

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
                    ? 'bg-[#1C1C20] border border-[#242428] text-[#F5F5F5]'
                    : 'bg-[#141416] border border-[#242428] text-[#22C55E]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <BotMessageSquare className="w-3.5 h-3.5" />}
              </div>

              {/* Message bubble: User is lighter surface (#1C1C20), Assistant is dark card (#141416) */}
              <div
                className={`max-w-[92%] sm:max-w-[78%] rounded-lg px-3 py-2.5 text-[11px] leading-relaxed relative group ${
                  isUser
                    ? 'bg-[#1C1C20] border border-[#242428] text-[#F5F5F5]'
                    : 'bg-[#141416] border border-[#242428] text-[#F5F5F5]'
                }`}
              >
                <div className="allow-select">
                  <MarkdownContent content={msg.content} isUser={isUser} />
                </div>

                {/* Salin / Copy button for assistant responses */}
                {!isUser && msg.content && (
                  <div className="pt-1.5 mt-1.5 border-t border-[#242428]/60 flex items-center justify-end select-none">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="flex items-center gap-1 text-[9px] font-medium text-[#8A8A91] hover:text-[#22C55E] transition-colors py-0.5 px-1.5 rounded hover:bg-[#1C1C20]"
                      title="Salin jawaban Asisten"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[#22C55E]" />
                          <span className="text-[#22C55E]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
            <div className="bg-[#141416] border border-[#242428] rounded-xl px-4 py-3 text-xs text-[#8A8A91] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
              <span>Asisten sedang menganalisis data bisnismu...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {chatError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="pt-1.5 pb-1 shrink-0 select-none">
        <p className="text-[9px] text-[#69716F] mb-1">Coba tanya</p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 text-[9px] font-medium text-[#8A8A91] bg-[#141416] hover:text-[#F5F5F5] hover:bg-[#1C1C20] border border-[#242428] rounded-lg whitespace-nowrap transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="flex items-center gap-1.5 pt-1.5 border-t border-[#242428] shrink-0"
      >
        <input
          type="text"
          placeholder="Tanyakan analisis omzet, laba, produk terlaris..."
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-[11px] bg-[#141416] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E] transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="px-3.5 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0B0C] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 select-none"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </div>
  );
}
