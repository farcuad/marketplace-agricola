'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { registrarUsuarioConRol } from '@/src/lib/auth';
import { ShoppingCart, Store, Rabbit, Tractor, Sprout, Flag, Check, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';

type Rol = 'comprador' | 'vendedor';
type Step = 1 | 2;

// ─── Mapeo de errores Firebase → español ─────────────────────────────────────
function traducirError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico.',
    'auth/invalid-email':        'El correo electrónico no es válido.',
    'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres.',
    'auth/network-request-failed':'Error de conexión. Revisa tu internet.',
    'auth/too-many-requests':    'Demasiados intentos. Intenta de nuevo más tarde.',
  };
  return map[code] ?? 'Ocurrió un error. Inténtalo de nuevo.';
}

// ─── Validaciones ─────────────────────────────────────────────────────────────
function validarTelefono(tel: string): string {
  const limpio = tel.replace(/\D/g, '').replace(/^0/, '');
  if (!limpio) return 'El número de teléfono es obligatorio.';
  if (!/^(4(1[246]|2[46])\d{7})$/.test(limpio))
    return 'Número inválido. Formato venezolano: 0414, 0416, 0424, 0426, 0412.';
  return '';
}

function formatearTelefono(raw: string): string {
  // Mantiene solo números, remueve el 0 inicial si existe
  const nums = raw.replace(/\D/g, '');
  return nums;
}

// ─── Componente de indicador de pasos ─────────────────────────────────────────
function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
            style={{
              background: step >= n ? 'var(--color-primary)' : 'var(--color-border)',
              color: step >= n ? 'white' : 'var(--color-text-muted)',
              boxShadow: step === n ? '0 0 0 4px rgba(45,106,79,0.20)' : 'none',
            }}
          >
            {step > n ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : n}
          </div>
          {n < 2 && (
            <div
              className="w-12 h-0.5 mx-1 transition-all duration-300"
              style={{ background: step > n ? 'var(--color-primary)' : 'var(--color-border)' }}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        Paso {step} de 2
      </span>
    </div>
  );
}

// ─── Tarjeta de rol ────────────────────────────────────────────────────────────
interface RoleCardProps {
  rol: Rol;
  selected: boolean;
  onClick: () => void;
  emoji: React.ReactNode;
  title: string;
  description: string;
  perks: string[];
}

function RoleCard({ rol, selected, onClick, emoji, title, description, perks }: RoleCardProps) {
  return (
    <button
      type="button"
      id={`role-${rol}`}
      onClick={onClick}
      className={`role-card w-full text-left ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: selected
              ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
              : 'var(--color-bg)',
            transition: 'background 0.3s ease',
          }}
        >
          {emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3
              className="font-display font-bold text-base"
              style={{ color: 'var(--color-text)' }}
            >
              {title}
            </h3>
            {/* Radio circle */}
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
              }}
            >
              {selected && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}
            </div>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
          <ul className="mt-2 space-y-1">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <svg className="w-3 h-3 shrink-0" style={{ color: 'var(--color-success)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function RegistroPage() {
  const router = useRouter();

  const [step,     setStep]     = useState<Step>(1);
  const [rol,      setRol]      = useState<Rol | ''>('');
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [telError, setTelError] = useState('');
  const [success,  setSuccess]  = useState(false);

  // Si ya hay sesión activa, redirigir
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/');
    });
    return unsub;
  }, [router]);

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setTelefono(raw);
    if (raw.length > 0) {
      setTelError(validarTelefono(raw));
    } else {
      setTelError('');
    }
  };

  const goToStep2 = () => {
    if (!rol) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar teléfono antes de enviar
    const telErr = validarTelefono(telefono);
    if (telErr) { setTelError(telErr); return; }
    if (!rol) return;

    setLoading(true);
    try {
      await registrarUsuarioConRol({
        email: email.trim(),
        password,
        nombre: nombre.trim(),
        telefono: formatearTelefono(telefono),
        rol,
      });
      setSuccess(true);
      setTimeout(() => router.replace('/'), 2000);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = (err as { message?: string }).message ?? '';
      setError(code ? traducirError(code) : msg || 'Error al registrarse.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Pantalla de éxito ────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="auth-card p-10 text-center max-w-sm w-full">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' }}
          >
            <Check size={40} className="text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            ¡Registro exitoso!
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Bienvenido/a a AgroMarket. Redirigiendo al marketplace...
          </p>
          <div
            className="mt-6 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: 'var(--color-primary)',
                animation: 'shimmer 2s linear forwards',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <header className="header-glass h-14 flex items-center px-6">
        <Link href="/" id="back-home-registro" className="flex items-center gap-2 group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" style={{ color: 'var(--color-primary)' }} />
          <span className="font-display font-bold text-base" style={{ color: 'var(--color-primary-dark)' }}>
            Agro<span style={{ color: 'var(--color-accent)' }}>Market</span>
          </span>
        </Link>
      </header>

      <div className="flex flex-1">

        {/* Panel lateral decorativo */}
        <aside
          className="hidden lg:flex flex-col items-center justify-center flex-1 p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0d2818 0%, #1b4332 50%, #2d6a4f 100%)' }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style={{ background: 'var(--color-accent)' }} />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'var(--color-primary-xlight)' }} />
          <div className="relative text-center space-y-5 max-w-sm">
            <div className="flex justify-center gap-4 mb-2">
              <Rabbit size={56} className="animate-float text-white/90" style={{ animationDelay: '0s' }} />
              <Tractor size={56} className="animate-float text-white/90" style={{ animationDelay: '0.5s' }} />
              <Sprout size={56} className="animate-float text-white/90" style={{ animationDelay: '1s' }} />
            </div>
            <h2 className="font-display text-3xl font-bold text-white leading-tight">
              Únete al mercado<br />agrícola de Venezuela
            </h2>
            <p className="text-white/70 text-base">
              Crea tu cuenta en segundos y empieza a comprar o vender productos del campo.
            </p>
            {/* Testimonial */}
            <div
              className="rounded-2xl p-4 text-left mt-4"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <p className="text-white/85 text-sm italic">
                &ldquo;Vendí mi toro Brahman en 2 días gracias a AgroMarket. ¡Increíble!&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
                >
                  J
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">José Rodríguez</p>
                  <p className="text-white/50 text-xs">Ganadero · Barinas</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Formulario */}
        <main className="flex flex-1 items-center justify-center p-6 lg:max-w-lg xl:max-w-xl w-full">
          <div className="w-full max-w-md">
            <div className="auth-card p-8 sm:p-10">

              <StepIndicator step={step} />

              {/* ── PASO 1: Elegir rol ──────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    ¿Cómo vas a usar<br />AgroMarket?
                  </h1>
                  <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                    Elige tu rol. Podrás cambiarlo más adelante.
                  </p>

                  <div className="space-y-3">
                    <RoleCard
                      rol="comprador"
                      selected={rol === 'comprador'}
                      onClick={() => setRol('comprador')}
                      emoji={<ShoppingCart size={32} className="text-white" />}
                      title="Comprador"
                      description="Busca y contacta vendedores de todo el país."
                      perks={['Ver todos los productos', 'Contacto por WhatsApp', 'Sin comisiones']}
                    />
                    <RoleCard
                      rol="vendedor"
                      selected={rol === 'vendedor'}
                      onClick={() => setRol('vendedor')}
                      emoji={<Store size={32} className="text-white" />}
                      title="Vendedor"
                      description="Publica tus animales, tractores o herramientas."
                      perks={['Publicaciones ilimitadas', 'Perfil de tienda', 'Recibe contactos por WhatsApp']}
                    />
                  </div>

                  <button
                    id="next-step-btn"
                    type="button"
                    disabled={!rol}
                    onClick={goToStep2}
                    className="btn-primary w-full py-3 text-base mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </button>

                  <p className="text-center text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/login" id="go-to-login-link" className="font-semibold underline underline-offset-2" style={{ color: 'var(--color-primary)' }}>
                      Inicia sesión
                    </Link>
                  </p>
                </div>
              )}

              {/* ── PASO 2: Datos del usuario ───────────────────────────── */}
              {step === 2 && (
                <div>
                  <button
                    id="back-step-btn"
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="flex items-center gap-1.5 text-sm font-medium mb-5 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </button>

                  <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    Crea tu cuenta
                  </h1>
                  <p className="text-sm mb-6 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Registrándose como
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(45,106,79,0.12)', color: 'var(--color-primary)' }}
                    >
                      {rol === 'vendedor' ? 'Vendedor' : 'Comprador'}
                    </span>
                  </p>

                  {/* Error */}
                  {error && (
                    <div
                      className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                      role="alert"
                    >
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                    {/* Nombre */}
                    <div>
                      <label htmlFor="reg-nombre" className="form-label">Nombre completo</label>
                      <input
                        id="reg-nombre"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder="Juan Rodríguez"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="form-input"
                        disabled={loading}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="reg-email" className="form-label">Correo electrónico</label>
                      <input
                        id="reg-email"
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

                    {/* Teléfono Venezuela */}
                    <div>
                      <label htmlFor="reg-telefono" className="form-label">
                        Teléfono WhatsApp
                        <span className="ml-1 text-xs font-normal normal-case" style={{ color: 'var(--color-text-muted)' }}>
                          (Venezuela +58)
                        </span>
                      </label>
                      <div className="relative flex">
                        {/* Prefijo fijo */}
                        <span
                          className="flex items-center px-3 text-sm font-semibold rounded-l-xl border border-r-0 select-none shrink-0"
                          style={{
                            background: '#f0f7ee',
                            borderColor: telError ? '#fecaca' : 'var(--color-border)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <Flag size={16} /> +58
                        </span>
                        <input
                          id="reg-telefono"
                          type="tel"
                          autoComplete="tel"
                          required
                          placeholder="4141234567"
                          value={telefono}
                          onChange={handleTelefonoChange}
                          maxLength={10}
                          className="form-input"
                          style={{
                            borderRadius: '0 12px 12px 0',
                            borderColor: telError ? '#fecaca' : undefined,
                          }}
                          disabled={loading}
                          aria-describedby="tel-hint"
                        />
                      </div>
                      {telError ? (
                        <p className="form-error">{telError}</p>
                      ) : (
                        <p id="tel-hint" className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Sin el 0 inicial · Ej: 4141234567
                        </p>
                      )}
                    </div>

                    {/* Contraseña */}
                    <div>
                      <label htmlFor="reg-password" className="form-label">Contraseña</label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showPwd ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="form-input"
                          style={{ paddingRight: '2.75rem' }}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          id="reg-toggle-pwd"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Indicador de fortaleza */}
                      {password && (
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3].map((lvl) => {
                            const strength = password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1;
                            const colors = ['#ef4444', '#f59e0b', '#22c55e'];
                            return (
                              <div
                                key={lvl}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{
                                  background: lvl <= strength ? colors[strength - 1] : 'var(--color-border)',
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      id="register-submit-btn"
                      type="submit"
                      disabled={loading || !nombre || !email || !password || !telefono || !!telError}
                      className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Creando cuenta...
                        </>
                      ) : (
                        <>
                          Crear cuenta
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Al registrarte, aceptas los Términos de Uso y la Política de Privacidad de AgroMarket.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
