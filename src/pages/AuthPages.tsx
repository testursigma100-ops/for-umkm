import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Logo } from '../components/common/Logo';
import { ArrowLeft, Mail, Lock, User, Store, CheckCircle, Loader2 } from 'lucide-react';

interface AuthPagesProps {
  onSuccess: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

export function AuthPages({ onSuccess, initialMode = 'login' }: AuthPagesProps) {
  const { user, login, register, resetPassword } = useBusiness();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // If user is already authenticated, skip auth screen and navigate to dashboard
  useEffect(() => {
    if (user.isAuthenticated) {
      onSuccess();
    }
  }, [user.isAuthenticated, onSuccess]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email || !password) {
      setErrorMsg('Harap isi alamat email dan kata sandi.');
      return;
    }

    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email || !password || !name || !businessName) {
      setErrorMsg('Harap lengkapi seluruh kolom pendaftaran usaha.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    const res = await register(name, email, password, businessName);
    setIsLoading(false);

    if (res.success) {
      if (res.message) {
        setInfoMsg(res.message);
        setMode('login');
      } else {
        onSuccess();
      }
    } else {
      setErrorMsg(res.error || 'Gagal mendaftar akun usaha.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email) {
      setErrorMsg('Masukkan alamat email terdaftar.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(email);
    setIsLoading(false);

    if (res.success) {
      setForgotSent(true);
    } else {
      setErrorMsg(res.error || 'Gagal mengirim email pemulihan kata sandi.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 sm:py-10">
      <div className="bg-[#141416] border border-[#242428] rounded-2xl p-6 sm:p-7 shadow-lg space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="text-[#22C55E] flex items-center justify-center mx-auto mb-1">
            <Logo size={40} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5]">
            {mode === 'login' && 'Masuk ke BisnisKu'}
            {mode === 'register' && 'Daftar Akun BisnisKu'}
            {mode === 'forgot' && 'Pemulihan Kata Sandi'}
          </h2>
          <p className="text-xs text-[#8A8A91]">
            {mode === 'login' && 'Kelola penjualan, kasir, dan laporan keuangan toko.'}
            {mode === 'register' && 'Mulai kelola kasir dan keuangan usaha dengan mudah.'}
            {mode === 'forgot' && 'Masukkan email terdaftar untuk reset kata sandi.'}
          </p>
        </div>

        {/* Mode Selector Tabs (Masuk vs Daftar) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-[#0B0B0C] border border-[#242428] rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setInfoMsg('');
                setMode('login');
              }}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-[#141416] text-[#F5F5F5] font-semibold'
                  : 'text-[#8A8A91] hover:text-[#F5F5F5]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setInfoMsg('');
                setMode('register');
              }}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-[#141416] text-[#F5F5F5] font-semibold'
                  : 'text-[#8A8A91] hover:text-[#F5F5F5]'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs">
            {infoMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="nama@kedai.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#8A8A91]">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('forgot');
                  }}
                  className="text-[11px] text-[#8A8A91] hover:text-[#F5F5F5]"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#0B0B0C]" />}
              <span>{isLoading ? 'Memproses...' : 'Masuk ke Aplikasi'}</span>
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Nama Usaha / Kedai
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi & Roti Nusantara"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="owner@kedai.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#0B0B0C]" />}
              <span>{isLoading ? 'Mendaftarkan...' : 'Daftar Akun Usaha'}</span>
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-3 py-3">
                <CheckCircle className="w-9 h-9 text-[#22C55E] mx-auto" />
                <h3 className="text-sm font-semibold text-[#F5F5F5]">
                  Tautan Telah Dikirim
                </h3>
                <p className="text-xs text-[#8A8A91]">
                  Tautan pemulihan kata sandi telah dikirim ke{' '}
                  <span className="text-[#F5F5F5] font-semibold">{email}</span>. Silakan periksa kotak masuk atau spam email Anda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    setMode('login');
                  }}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] rounded-lg"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#8A8A91] mb-1">
                    Alamat Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8A8A91] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="nama@kedai.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1A1A1E] border border-[#242428] rounded-lg text-[#F5F5F5] placeholder-[#8A8A91] focus:outline-hidden focus:border-[#22C55E]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-[#0B0B0C] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#0B0B0C]" />}
                  <span>{isLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('login');
                    }}
                    className="text-xs text-[#8A8A91] hover:text-[#F5F5F5] flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Masuk</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
