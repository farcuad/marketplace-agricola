'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import {
  auth,
  getUserProfile,
  getProductsByVendor,
  addProduct,
  updateProductStatus,
  deleteProduct,
} from '@/src/lib/firebase';
import type { Product, UserProfile, Category } from '@/src/types';
import SubirImagen from '@/src/components/loadImage';
import { Sprout, Package, MapPin, Check, CheckCircle, Pause, PartyPopper, Trash2, Hand, PenLine, Rocket, ShoppingCart, Plus, X } from 'lucide-react';

// ─── Config ────────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'animales', label: 'Animales' },
  { value: 'tractores', label: 'Tractores' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'semillas', label: 'Semillas' },
  { value: 'fertilizantes', label: 'Fertilizantes' },
  { value: 'otros', label: 'Otros' },
];

const STATUS_META: Record<
  Product['status'],
  { label: string; color: string; bg: string }
> = {
  activo: { label: 'Activo', color: '#16a34a', bg: '#dcfce7' },
  vendido: { label: 'Vendido', color: '#2563eb', bg: '#dbeafe' },
  pausado: { label: 'Pausado', color: '#d97706', bg: '#fef3c7' },
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: currency === 'VES' ? 'USD' : currency,
    minimumFractionDigits: 0,
  })
    .format(price)
    .replace('USD', '$');
}

// ─── Componente: Tarjeta de producto del vendedor ─────────────────────────────
interface VendorCardProps {
  product: Product;
  onStatusChange: (id: string, status: Product['status']) => void;
  onDelete: (id: string) => void;
}

function VendorProductCard({ product, onStatusChange, onDelete }: VendorCardProps) {
  const meta = STATUS_META[product.status];
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-md"
      style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Imagen */}
      <div className="relative h-44 overflow-hidden" style={{ background: '#0d2818' }}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1b4332, #40916c)' }}
          >
            <Package size={56} className="text-white/70" />
          </div>
        )}
        {/* Badge de estado */}
        <span
          className="absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3
          className="font-semibold text-sm line-clamp-2 mb-1 leading-snug"
          style={{ color: 'var(--color-text)' }}
        >
          {product.title}
        </h3>
        <div className="flex items-center justify-between mb-3">
          <span className="price-tag text-base">{formatPrice(product.price, product.currency)}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <MapPin size={12} /> {product.location.split(',')[0]}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <select
            value={product.status}
            onChange={(e) => onStatusChange(product.id, e.target.value as Product['status'])}
            className="form-input flex-1"
            style={{ padding: '7px 10px', fontSize: '0.75rem' }}
            aria-label={`Estado de ${product.title}`}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="vendido">Vendido</option>
          </select>
          <button
            onClick={() => onDelete(product.id)}
            id={`delete-${product.id}`}
            className="px-3 rounded-xl text-sm border transition-all hover:bg-red-50"
            style={{ color: '#ef4444', borderColor: '#fecaca' }}
            aria-label={`Eliminar ${product.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Skeleton ─────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="skeleton h-44 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function MisProductosPage() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Productos
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // UI
  const [showForm, setShowForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [category, setCategory] = useState<Category>('animales');
  const [location, setLocation] = useState('');

  // Imagen Cloudinary URL
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Cargar auth + perfil ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // ── Cargar productos del vendedor ─────────────────────────────────────────
  const loadProducts = useCallback(async (uid: string) => {
    Promise.resolve().then(() => setProductsLoading(true));
    try {
      const data = await getProductsByVendor(uid);
      setProducts(data);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadProducts(user.uid);
  }, [user, loadProducts]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setCategory('animales');
    setCurrency('USD');
    setUploadedImageUrl('');
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const imageUrl = uploadedImageUrl;

      // 2. Crear documento en Firestore
      await addProduct({
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        currency,
        category,
        location: location.trim(),
        imageUrl,
        vendorId: user.uid,
        vendorName: profile.nombre,
        vendorPhone: profile.telefono,
        createdAt: new Date().toISOString(),
        status: 'activo',
      });

      resetForm();
      setShowForm(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);

      // Recargar lista
      await loadProducts(user.uid);

    } catch (err) {
      console.error('Error al publicar:', err);
      setSubmitError('Error al publicar el producto. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cambiar estado de producto ────────────────────────────────────────────
  const handleStatusChange = async (productId: string, status: Product['status']) => {
    try {
      await updateProductStatus(productId, status);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status } : p))
      );
    } catch {
      alert('Error al actualizar el estado. Inténtalo de nuevo.');
    }
  };

  // ── Eliminar producto ─────────────────────────────────────────────────────
  const handleDelete = async (productId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.')) return;
    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      alert('Error al eliminar el producto.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/');
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats: { label: string; value: number; icon: React.ComponentType<{ size?: number }> }[] = [
    { label: 'Total', value: products.length, icon: Package },
    { label: 'Activos', value: products.filter((p) => p.status === 'activo').length, icon: CheckCircle },
    { label: 'Vendidos', value: products.filter((p) => p.status === 'vendido').length, icon: PartyPopper },
    { label: 'Pausados', value: products.filter((p) => p.status === 'pausado').length, icon: Pause },
  ];

  // ── Pantalla de carga inicial ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="text-center">
          <Sprout size={72} className="mb-4 animate-float" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Cargando tu panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="header-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            id="back-marketplace"
            className="flex items-center gap-2 group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              style={{ color: 'var(--color-primary)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-display font-bold text-base" style={{ color: 'var(--color-primary-dark)' }}>
              Agro<span style={{ color: 'var(--color-accent)' }}>Market</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>
              {user?.email}
            </span>
            <button
              id="header-logout-btn"
              onClick={handleLogout}
              className="btn-outline text-sm py-1.5 px-3"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">

        {/* ── ENCABEZADO ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              Hola, {profile?.nombre?.split(' ')[0] ?? 'Vendedor'} <Hand size={24} className="inline" />
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {profile?.rol === 'vendedor'
                ? 'Gestiona tus publicaciones en el marketplace'
                : 'Tu cuenta está registrada como comprador'}
            </p>
          </div>

          {profile?.rol === 'vendedor' && (
            <button
              id="open-publish-modal-btn"
              onClick={() => { setShowForm(true); resetForm(); }}
              className="btn-primary"
            >
              <Plus size={16} />
              Publicar producto
            </button>
          )}
        </div>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="auth-card p-4 flex items-center gap-3"
            >
              <s.icon size={24} />
              <div>
                <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── BANNER DE ÉXITO ─────────────────────────────────────────── */}
        {submitSuccess && (
          <div
            className="flex items-center gap-3 p-4 rounded-2xl mb-6 text-sm font-semibold animate-fade-in"
            style={{
              background: 'rgba(82,183,136,0.15)',
              color: '#166534',
              border: '1px solid rgba(82,183,136,0.4)',
            }}
            role="status"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¡Producto publicado exitosamente! Ya está visible en el marketplace.
          </div>
        )}

        {/* ── MODAL DE PUBLICACIÓN ───────────────────────────────────── */}
        {showForm && profile?.rol === 'vendedor' && (
          <div
            className="fixed inset-0 bg-[rgba(13,40,24,0.65)] backdrop-blur-[6px] z-100 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}
            role="dialog"
            aria-modal="true"
            aria-label="Publicar producto"
          >
            <div className="bg-white rounded-3xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
              {/* Header */}
              <div className="relative flex items-center justify-center overflow-hidden bg-linear-to-br from-primary-dark to-primary h-[100px] rounded-t-3xl">
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-white mt-1">Nueva publicación</h2>
                </div>
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {submitError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm"
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                    role="alert"
                  >
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                    </svg>
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Imagen */}
                  <div>
                    <label className="form-label">Foto del producto</label>
                    {uploadedImageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 group animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadedImageUrl} alt="Previsualización" className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                          <button
                            type="button"
                            onClick={() => setUploadedImageUrl('')}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                            style={{ background: 'rgba(239,68,68,0.85)' }}
                          >
                            Quitar imagen
                          </button>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 px-4 py-2 text-xs text-white truncate" style={{ background: 'rgba(0,0,0,0.50)' }}>
                          <Check size={12} className="inline align-middle" /> Imagen lista en Cloudinary
                        </div>
                      </div>
                    ) : (
                      <SubirImagen onSubidaExitosa={(url) => setUploadedImageUrl(url)} />
                    )}
                  </div>

                  {/* Título + Categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prod-title" className="form-label">Título del producto</label>
                      <input id="prod-title" type="text" required maxLength={80} placeholder="Ej: Toro Brahman reproductor, 3 años" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" disabled={submitting} />
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{title.length}/80</p>
                    </div>
                    <div>
                      <label htmlFor="prod-category" className="form-label">Categoría</label>
                      <select id="prod-category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="form-input" disabled={submitting}>
                        {CATEGORY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label htmlFor="prod-desc" className="form-label">Descripción detallada</label>
                    <textarea id="prod-desc" required rows={3} maxLength={600} placeholder="Describe tu producto: características, estado, edad, peso, condiciones de venta..." value={description} onChange={(e) => setDescription(e.target.value)} className="form-input resize-none" disabled={submitting} />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{description.length}/600 caracteres</p>
                  </div>

                  {/* Precio + Moneda + Ubicación */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="prod-price" className="form-label">Precio</label>
                      <input id="prod-price" type="number" required min="0" step="0.01" placeholder="1200" value={price} onChange={(e) => setPrice(e.target.value)} className="form-input" disabled={submitting} />
                    </div>
                    <div>
                      <label htmlFor="prod-currency" className="form-label">Moneda</label>
                      <select id="prod-currency" value={currency} onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES')} className="form-input" disabled={submitting}>
                        <option value="USD">USD – Dólares</option>
                        <option value="VES">VES – Bolívares</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prod-location" className="form-label">Ubicación</label>
                      <input id="prod-location" type="text" required placeholder="Ej: Barinas, Venezuela" value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" disabled={submitting} />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-2">
                    <button id="publish-product-btn" type="submit" disabled={submitting || !title || !description || !price || !location} className="btn-primary flex-1 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed">
                      {submitting ? (
                        <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Publicando...</>
                      ) : (
                        <><Rocket size={18} /> Publicar en el marketplace</>
                      )}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-outline py-3 px-5">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── GRID DE PRODUCTOS ────────────────────────────────────────── */}
        <div>
          <h2
            className="font-display text-lg font-bold mb-5"
            style={{ color: 'var(--color-text)' }}
          >
            Mis publicaciones
            {!productsLoading && (
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                ({products.length})
              </span>
            )}
          </h2>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <ProductSkeleton />
              <ProductSkeleton />
              <ProductSkeleton />
            </div>
          ) : products.length === 0 ? (
            <div className="auth-card p-14 text-center">
              <Package size={48} style={{ color: 'var(--color-text-muted)' }} />
              <p className="mt-4 font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                Sin publicaciones aún
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Publica tu primer producto y llega a compradores de todo Venezuela
              </p>
              {profile?.rol === 'vendedor' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary mt-6"
                  id="first-product-btn"
                >
                  Publicar mi primer producto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <VendorProductCard
                  key={product.id}
                  product={product}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── AVISO PARA COMPRADORES ───────────────────────────────────── */}
        {profile?.rol === 'comprador' && (
          <div className="auth-card p-10 text-center mt-10">
            <ShoppingCart size={48} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="font-display text-xl font-bold mt-4 mb-2" style={{ color: 'var(--color-text)' }}>
              Tu cuenta es de Comprador
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              Para publicar y vender productos necesitas una cuenta de Vendedor.
            </p>
            <Link href="/" id="back-to-market-btn" className="btn-primary">
              Volver al marketplace
            </Link>
          </div>
        )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        className="py-6 px-4 text-center text-xs"
        style={{ background: 'var(--color-primary-dark)', color: 'rgba(255,255,255,0.5)' }}
      >
        <p className="font-display font-semibold text-white mb-0.5"><Sprout size={16} className="inline align-middle" /> AgroMarket Venezuela</p>
        <p>Panel de Vendedor · © 2026</p>
      </footer>
    </div>
  );
}
