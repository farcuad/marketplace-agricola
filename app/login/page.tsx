'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { loginUsuario } from '@/src/lib/auth';
import { Sprout, Rabbit, MapPin, MessageCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// ─── Mapeo de errores Firebase → español ─────────────────────────────────────
function traducirError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
    'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
  };
  return map[code] ?? 'Ocurrió un error. Inténtalo de nuevo.';
}

export default function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Si ya hay sesión activa, redirigir al home inmediatamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        router.replace('/');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsub;
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUsuario(email.trim(), password);
      router.replace('/');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(traducirError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMsg('');
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim(), {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });
      setResetMsg('Correo de restablecimiento enviado. Revisa tu bandeja de SPAM');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setResetMsg(traducirError(code));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* Layout 2 columnas */}
      <div className="flex flex-1">

        {/* Panel izquierdo — ilustración */}
        <aside
          className="hidden lg:flex flex-col items-center justify-center flex-1 p-12 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
          }}
        >
          {/* Patrón de fondo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          {/* Círculos decorativos */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style={{ background: 'var(--color-accent)' }} />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'var(--color-primary-xlight)' }} />

          <div className="relative text-center space-y-6 max-w-sm">
            <Sprout size={80} className="inline-block animate-float" style={{ color: 'var(--color-accent-light)' }} />
            <h2 className="font-display text-3xl font-bold text-white leading-tight">
              Bienvenido de<br />vuelta al campo
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Inicia sesión para ver tus publicaciones, contactar vendedores y gestionar tu perfil.
            </p>

            {/* Features */}
            {[
              { icon: Rabbit, text: 'Animales, tractores y más' },
              { icon: MapPin, text: 'Vendedores en toda Venezuela' },
              { icon: MessageCircle, text: 'Contacto directo por WhatsApp' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-left">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <f.icon size={20} className="text-white/85" />
                </span>
                <span className="text-white/85 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Panel derecho — formulario */}
        <main className="flex flex-1 items-center justify-center p-6 lg:max-w-lg xl:max-w-xl w-full">
          <div className="w-full max-w-md">

            <Link href="/" id="back-home-link" className="flex items-center gap-1.5 text-xs font-medium mb-6 px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50 w-fit" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
              <ArrowLeft size={14} />
              AgroMarket
            </Link>

            {/* Tarjeta */}
            <div className="auth-card p-8 sm:p-10">

              <div className="mb-8">
                <h1
                  className="font-display text-2xl sm:text-3xl font-bold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  Iniciar sesión
                </h1>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  ¿No tienes cuenta?{' '}
                  <Link
                    href="/registro"
                    id="go-to-registro-link"
                    className="font-semibold underline underline-offset-2 transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Regístrate gratis
                  </Link>
                </p>
              </div>

              {/* Error global */}
              {error && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                  role="alert"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="form-label">Correo electrónico</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label htmlFor="login-password" className="form-label">Contraseña</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingRight: '2.75rem' }}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      id="toggle-password-btn"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      id="forgot-password-btn"
                      onClick={() => setShowReset(true)}
                      className="text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading || !email || !password}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ marginTop: '8px' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Ingresando...
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>
            </div>

            {/* Link registro debajo */}
            <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Al continuar, aceptas los Términos de Uso y la Política de Privacidad de AgroMarket.
            </p>
          </div>
        </main>
      </div>

      {/* ── Modal: Restablecer contraseña ──────────────────────────────── */}
      {showReset && (
        <div
          className="fixed inset-0 bg-[rgba(13,40,24,0.65)] backdrop-blur-[6px] z-100 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowReset(false); setResetMsg(''); } }}
          role="dialog"
          aria-modal="true"
          aria-label="Restablecer contraseña"
        >
          <div className="bg-white rounded-3xl max-w-[420px] w-full p-8 shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              Restablecer contraseña
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <input
              type="email"
              placeholder="tu@correo.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="form-input mb-5"
              disabled={resetLoading}
            />

            {resetMsg && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm"
                style={{
                  background: resetMsg.includes('enviado') ? '#dcfce7' : '#fef2f2',
                  color: resetMsg.includes('enviado') ? '#166534' : '#dc2626',
                  border: `1px solid ${resetMsg.includes('enviado') ? '#bbf7d0' : '#fecaca'}`,
                }}
                role="alert"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {resetMsg.includes('enviado')
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></>
                  }
                </svg>
                {resetMsg}
              </div>
            )}


            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || !resetEmail.trim()}
                className="btn-primary flex-1 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Enviando...</>
                ) : 'Enviar enlace'}
              </button>
              <button
                onClick={() => { setShowReset(false); setResetMsg(''); }}
                className="btn-outline py-3 px-5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
