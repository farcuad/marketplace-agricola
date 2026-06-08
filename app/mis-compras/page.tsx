'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, getUserProfile, getBuyerOrders } from '@/src/lib/firebase';
import type { Order, UserProfile } from '@/src/types';
import DashboardAside from '@/src/components/DashboardAside';
import DashboardHeader from '@/src/components/DashboardHeader';
import { Sprout, ShoppingCart, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_META: Record<Order['estado'], { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  contactado: { label: 'Contactado', color: '#d97706', bg: '#fef3c7', icon: Clock },
  completado: { label: 'Completado', color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price).replace('USD', '\$');
}

interface OrderCardProps { order: Order }

function OrderCard({ order }: OrderCardProps) {
  const meta = STATUS_META[order.estado];
  const Icon = meta.icon;
  return (
    <div className="bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-md" style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug mb-1" style={{ color: 'var(--color-text)' }}>{order.nombre_producto}</h3>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{order.nombre_vendedor}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ml-2 flex items-center gap-1" style={{ color: meta.color, background: meta.bg }}>
            <Icon size={12} /> {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="price-tag text-base">{formatPrice(order.total_estimado)}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>x{order.cantidad_solicitada}</span>
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-mono">{order.id_orden}</span>
          <span className="ml-2">{new Date(order.fecha_contacto).toLocaleDateString('es-VE')}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /><div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function MisComprasPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  const loadOrders = useCallback(async (uid: string) => {
    setOrdersLoading(true);
    try { const data = await getBuyerOrders(uid); setOrders(data); } finally { setOrdersLoading(false); }
  }, []);

  useEffect(() => { if (user) loadOrders(user.uid); }, [user, loadOrders]);

  const handleLogout = async () => { await signOut(auth); router.replace('/'); };

  const stats = [
    { label: 'Total', value: orders.length, icon: ShoppingCart },
    { label: 'Contactados', value: orders.filter((o) => o.estado === 'contactado').length, icon: Clock },
    { label: 'Completados', value: orders.filter((o) => o.estado === 'completado').length, icon: CheckCircle },
    { label: 'Cancelados', value: orders.filter((o) => o.estado === 'cancelado').length, icon: XCircle },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <Sprout size={72} className="mb-4 animate-float" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cargando tu historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <DashboardAside profile={profile} user={user} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} onProfileUpdate={setProfile} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={user} onMenuOpen={() => setMobileOpen(true)} onLogout={handleLogout} />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="flex justify-between items-center gap-3 flex-wrap gap-y-2 mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Mis compras <ShoppingCart size={24} className="inline" />
            </h1>
            <Link href="/" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Ir al Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="auth-card p-4 flex items-center gap-3">
                <s.icon size={24} />
                <div>
                  <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="font-display text-lg font-bold mb-5" style={{ color: 'var(--color-text)' }}>
              Historial de compras
              {!ordersLoading && <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>({orders.length})</span>}
            </h2>
            {ordersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : orders.length === 0 ? (
              <div className="auth-card p-14 text-center">
                <ShoppingCart size={48} style={{ color: 'var(--color-text-muted)' }} />
                <p className="mt-4 font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Sin compras aún</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>Cuando contactes a un vendedor por WhatsApp, aparecerá aquí</p>
                <Link href="/" className="btn-primary mt-6">Ir al marketplace</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {orders.map((order) => (<OrderCard key={order.id} order={order} />))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
