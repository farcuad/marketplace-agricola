'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import type { UserProfile } from '@/src/types';
import {
  Store, ShoppingCart, ShoppingBag, Phone, X, ChevronLeft, Sprout,
} from 'lucide-react';

interface Props {
  profile: UserProfile | null;
  user: { uid: string } | null;
  onProfileUpdate?: (p: UserProfile) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV = [
  { href: '/mis-productos', label: 'Mis productos', icon: Store },
  { href: '/mis-ventas', label: 'Mis ventas', icon: ShoppingBag },
  { href: '/mis-compras', label: 'Mis compras', icon: ShoppingCart },
];

const BOTTOM_NAV = [
  { label: 'Configurar Teléfono', icon: Phone, action: 'phone' as const },
];

export default function DashboardAside({ profile, user, onProfileUpdate, mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname();
  const [desktopOpen, setDesktopOpen] = useState(true);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  const handleSavePhone = async () => {
    const cleaned = phoneInput.replace(/\D/g, '').replace(/^0/, '');
    if (!/^(4(1[246]|2[46])\d{7})$/.test(cleaned)) {
      setPhoneMsg('Número inválido. Debe ser venezolano (ej: 4141234567).');
      return;
    }
    if (!user) return;
    setPhoneSaving(true);
    setPhoneMsg('');
    try {
      await updateDoc(doc(db, 'users', user.uid), { telefono: cleaned });
      if (onProfileUpdate && profile) {
        onProfileUpdate({ ...profile, telefono: cleaned });
      }
      setPhoneMsg('Teléfono actualizado correctamente.');
      setTimeout(() => { setShowPhoneModal(false); setPhoneMsg(''); }, 1500);
    } catch {
      setPhoneMsg('Error al guardar. Intenta de nuevo.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const asideContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-16 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <span className="font-display font-bold text-sm" style={{ color: 'var(--color-primary-dark)' }}>
          Agro<span style={{ color: 'var(--color-accent)' }}>Market</span>
        </span>
        <button onClick={onMobileClose} className="md:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--color-primary)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text)',
              }}
            >
              <Icon size={18} />
              <span className={desktopOpen ? '' : 'hidden'}>{label}</span>
            </Link>
          );
        })}
        <div className="border-t my-2" style={{ borderColor: 'var(--color-border)' }} />
        {BOTTOM_NAV.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={() => { setPhoneInput(profile?.telefono ?? ''); setPhoneMsg(''); setShowPhoneModal(true); }}
            className="cursor-pointer flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-green-50"
            style={{ color: 'var(--color-text)' }}
          >
            <Icon size={18} />
            <span className={desktopOpen ? '' : 'hidden'}>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto py-4 px-3 text-center text-xs border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
        <p className="font-display font-semibold mb-0.5" style={{ color: 'var(--color-primary-dark)' }}><Sprout size={14} className="inline align-middle" /> AgroMarket</p>
        <p>AgroMarket Venezuela · © 2026</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop aside */}
      <aside
        className={`hidden md:flex flex-col border-r bg-white transition-all duration-300 ${desktopOpen ? 'w-60' : 'w-14'}`}
        style={{ borderColor: 'var(--color-border)', minHeight: '100vh' }}
      >
        {/* Collapse toggle
        <button
          onClick={() => setDesktopOpen(!desktopOpen)}
          className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full border bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
          aria-label={desktopOpen ? 'Colapsar men\u00fa' : 'Expandir men\u00fa'}
        >
          <ChevronLeft size={12} className={`transition-transform ${desktopOpen ? '' : 'rotate-180'}`} />
        </button> */}

        {asideContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-60 md:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="relative w-72 h-full bg-white shadow-xl animate-[slideInLeft_0.25s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {asideContent}
          </aside>
        </div>
      )}

      {/* ── Modal: Configurar teléfono ─────────────────────────────────── */}
      {showPhoneModal && (
        <div
          className="fixed inset-0 bg-[rgba(13,40,24,0.65)] backdrop-blur-[6px] z-70 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPhoneModal(false); setPhoneMsg(''); } }}
          role="dialog"
          aria-modal="true"
          aria-label="Configurar teléfono"
        >
          <div className="bg-white rounded-3xl max-w-[400px] w-full p-8 shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              Configurar teléfono
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Actualiza tu número de contacto para que los compradores puedan comunicarse por WhatsApp.
            </p>

            {phoneMsg && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm"
                style={{
                  background: phoneMsg.includes('actualizado') ? '#dcfce7' : '#fef2f2',
                  color: phoneMsg.includes('actualizado') ? '#166534' : '#dc2626',
                  border: '1px solid ' + (phoneMsg.includes('actualizado') ? '#bbf7d0' : '#fecaca'),
                }}
                role="alert"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {phoneMsg.includes('actualizado')
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></>
                  }
                </svg>
                {phoneMsg}
              </div>
            )}

            <label htmlFor="aside-phone-input" className="form-label">Número de teléfono (WhatsApp)</label>
            <input
              id="aside-phone-input"
              type="tel"
              placeholder="Ej: 4141234567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="form-input mb-5"
              disabled={phoneSaving}
            />

            <div className="flex gap-3">
              <button
                onClick={handleSavePhone}
                disabled={phoneSaving || !phoneInput.trim()}
                className="btn-primary flex-1 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phoneSaving ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Guardando...</>
                ) : 'Guardar'}
              </button>
              <button onClick={() => { setShowPhoneModal(false); setPhoneMsg(''); }} className="btn-outline py-3 px-5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
