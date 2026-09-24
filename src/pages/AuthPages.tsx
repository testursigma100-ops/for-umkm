import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Sparkles, ArrowLeft, Mail, Lock, User, Store, CheckCircle, Loader2 } from 'lucide-react';

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
      setErrorMsg('Harap isi email dan kata sandi.');
      return;
    }

    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Gagal masuk. Periksa email dan kata sandi Anda.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email || !password || !name || !businessName) {
      setErrorMsg('Harap lengkapi seluruh kolom pendaftaran.');
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
      setErrorMsg(res.error || 'Gagal mendaftar akun.');
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
      setErrorMsg(res.error || 'Gagal mengirim email reset kata sandi.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#101013] border border-[#22222A] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#16161B] border border-[#22222A] text-[#10B981] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#F0F0F2]">
            {mode === 'login' && 'Masuk ke BisnisKu AI'}
            {mode === 'register' && 'Daftar Akun UMKM Baru'}
            {mode === 'forgot' && 'Reset Kata Sandi'}
          </h2>
          <p className="text-xs text-[#7A7A84]">
            "Jualan jalan, bisnis makin jelas."
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {infoMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="budi@kedai.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#7A7A84]">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('forgot');
                  }}
                  className="text-[11px] text-[#10B981] hover:underline"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'Memproses...' : 'Masuk Sekarang'}</span>
            </button>

            <div className="text-center pt-2 text-xs text-[#7A7A84]">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('register');
                }}
                className="text-[#10B981] font-semibold hover:underline"
              >
                Daftar Usaha Baru
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Nama Lengkap Pemilik
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Nama Usaha / Kedai F&B
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi & Roti Nusantara"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="owner@kedai.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'Mendaftarkan...' : 'Daftar & Hubungkan Usaha'}</span>
            </button>

            <div className="text-center pt-2 text-xs text-[#7A7A84]">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('login');
                }}
                className="text-[#10B981] font-semibold hover:underline"
              >
                Masuk di sini
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle className="w-10 h-10 text-[#10B981] mx-auto" />
                <h3 className="text-sm font-semibold text-[#F0F0F2]">
                  Instruksi Terkirim
                </h3>
                <p className="text-xs text-[#7A7A84]">
                  Tautan pemulihan kata sandi telah dikirim ke{' '}
                  <span className="text-[#F0F0F2] font-semibold">{email}</span>. Silakan periksa kotak masuk atau folder spam Anda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSent(false);
                    setMode('login');
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-black bg-[#10B981] rounded-lg"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-[#7A7A84]">
                  Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi.
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#7A7A84] mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7A7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="owner@kedai.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#16161B] border border-[#22222A] rounded-lg text-[#F0F0F2] placeholder-[#7A7A84] focus:outline-hidden focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-bold text-black bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isLoading ? 'Mengirim...' : 'Kirim Tautan Pemulihan'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('login');
                    }}
                    className="text-xs text-[#7A7A84] hover:text-[#F0F0F2] flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Halaman Masuk</span>
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
