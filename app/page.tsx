'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, getProducts, addProduct, getUserProfile } from '@/src/lib/firebase';
import type { Product, Category, CategoryConfig, UserProfile } from '@/src/types';
import SubirImagen from '@/src/components/loadImage';
import { Sprout, Rabbit, Tractor, Wrench, FlaskConical, Package, MapPin, User as UserIcon, Phone, Store, DollarSign, Rocket, PenLine, Check, Flag, SearchX } from 'lucide-react';

// ─── Configuración de categorías ──────────────────────────────────────────────
const CATEGORIES: CategoryConfig[] = [
  { id: 'todos', label: 'Todos', color: '#2d6a4f', bgGradient: 'linear-gradient(135deg,#1b4332,#2d6a4f)' },
  { id: 'animales', label: 'Animales', color: '#5c8a3c', bgGradient: 'linear-gradient(135deg,#3a6b1e,#5c8a3c)' },
  { id: 'tractores', label: 'Tractores', color: '#b45309', bgGradient: 'linear-gradient(135deg,#92400e,#b45309)' },
  { id: 'herramientas', label: 'Herramientas', color: '#64748b', bgGradient: 'linear-gradient(135deg,#475569,#64748b)' },
  { id: 'semillas', label: 'Semillas', color: '#0d9488', bgGradient: 'linear-gradient(135deg,#0f766e,#0d9488)' },
  { id: 'fertilizantes', label: 'Fertilizantes', color: '#6d28d9', bgGradient: 'linear-gradient(135deg,#5b21b6,#6d28d9)' },
  { id: 'otros', label: 'Otros', color: '#c2410c', bgGradient: 'linear-gradient(135deg,#9a3412,#c2410c)' },
];

function CategoryIcon({ id, size = 28 }: { id: string; size?: number }) {
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    todos: Sprout,
    animales: Rabbit,
    tractores: Tractor,
    herramientas: Wrench,
    semillas: Sprout,
    fertilizantes: FlaskConical,
    otros: Package,
  };
  const Icon = iconMap[id] ?? Package;
  return <Icon size={size} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryConfig(id: string): CategoryConfig {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: currency === 'VES' ? 'USD' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace('USD', '$');
}

function buildWhatsAppUrl(phone: string, productTitle: string) {
  const cleaned = phone.replace(/\D/g, '');
  const full = cleaned.startsWith('58') ? cleaned : `58${cleaned}`;
  const msg = encodeURIComponent(
    `Hola! Vi tu publicación en AgroMarket y estoy interesado/a en: *${productTitle}*. ¿Sigue disponible?`
  );
  return `https://wa.me/${full}?text=${msg}`;
}

// ─── Componente: Skeleton Loading ─────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border">
          <div className="bg-[linear-gradient(90deg,#e8f5e9_25%,#c8e6c9_50%,#e8f5e9_75%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl h-44 w-full" />
          <div className="p-4 space-y-3">
            <div className="bg-[linear-gradient(90deg,#e8f5e9_25%,#c8e6c9_50%,#e8f5e9_75%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl h-4 w-3/4" />
            <div className="bg-[linear-gradient(90deg,#e8f5e9_25%,#c8e6c9_50%,#e8f5e9_75%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl h-3 w-full" />
            <div className="bg-[linear-gradient(90deg,#e8f5e9_25%,#c8e6c9_50%,#e8f5e9_75%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl h-3 w-2/3" />
            <div className="bg-[linear-gradient(90deg,#e8f5e9_25%,#c8e6c9_50%,#e8f5e9_75%)] bg-size-[200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl h-6 w-1/2 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente: Tarjeta de producto ─────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  const cat = getCategoryConfig(product.category);

  return (
    <article
      className="group bg-white rounded-2xl overflow-hidden shadow-modal border border-border cursor-pointer transition-all duration-[0.28s] ease-[cubic-bezier(0.34,1.56,0.64,1)] relative hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-border-card hover:border-primary-light"
      onClick={() => onSelect(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(product)}
      aria-label={`Ver detalles de ${product.title}`}
    >
      <div className="absolute inset-0 bg-linear-to-t from-[rgba(27,67,50,0.10)] to-transparent opacity-0 transition-opacity duration-[0.25s] ease-in-out rounded-2xl pointer-events-none group-hover:opacity-100" aria-hidden="true" />

      {/* Imagen real o placeholder con gradiente */}
      <div
        className="w-full h-[180px] flex items-center justify-center text-[3.5rem] relative overflow-hidden"
        style={product.imageUrl ? { background: '#0d2818' } : { background: cat.bgGradient }}
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <CategoryIcon id={cat.id} size={56} />
        )}
        <span className="absolute top-2.5 left-2.5 bg-white/92 backdrop-blur-[6px] rounded-full px-2.5 py-[3px] text-[0.68rem] font-bold uppercase tracking-wider text-primary-dark">{cat.label}</span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        <h3
          className="font-semibold text-sm leading-snug line-clamp-2"
          style={{ color: 'var(--color-text)' }}
        >
          {product.title}
        </h3>

        <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
          {product.description}
        </p>

        <div className="flex items-center justify-between mt-1">
          <span className="font-display text-xl font-bold text-primary-dark">
            {formatPrice(product.price, product.currency)}
          </span>
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MapPin size={12} /> {product.location.split(',')[0]}
          </span>
        </div>

        <div
          className="text-xs font-medium mt-1"
          style={{ color: 'var(--color-primary-light)' }}
        >
          {product.vendorName}
        </div>
      </div>
    </article>
  );
}

// ─── Componente: Modal de producto ────────────────────────────────────────────
interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

function ProductModal({ product, onClose }: ProductModalProps) {
  const cat = getCategoryConfig(product.category);
  const waUrl = buildWhatsAppUrl(product.vendorPhone, product.title);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-[rgba(13,40,24,0.65)] backdrop-blur-[6px] z-100 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${product.title}`}
    >
      <div className="bg-white rounded-3xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        {/* Header del modal — imagen real o emoji con gradiente */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            background: product.imageUrl ? '#0d2818' : cat.bgGradient,
            height: '220px',
            borderRadius: '24px 24px 0 0',
          }}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }}
            />
          ) : (
            <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }}>
              <CategoryIcon id={cat.id} size={56} />
            </span>
          )}
          <button
            onClick={onClose}
            id="modal-close-btn"
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
            style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1 }}
            aria-label="Cerrar modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span
            className="absolute bottom-4 left-4 text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.40)', zIndex: 1 }}
          >
            {cat.label}
          </span>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          <div>
            <h2
              className="font-display text-xl font-bold leading-tight mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              {product.title}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-2xl font-bold text-primary-dark">
                {formatPrice(product.price, product.currency)}
              </span>
              <span
                className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{
                  background: 'rgba(45,106,79,0.10)',
                  color: 'var(--color-primary)',
                }}
              >
                {product.currency}
              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-2xl text-sm leading-relaxed"
            style={{ background: '#f0f7ee', color: 'var(--color-text)' }}
          >
            {product.description}
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: '#f8fdf8', border: '1px solid var(--color-border)' }}
            >
              <MapPin size={16} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Ubicación</p>
                <p className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{product.location}</p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: '#f8fdf8', border: '1px solid var(--color-border)' }}
            >
              <UserIcon size={16} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Vendedor</p>
                <p className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>{product.vendorName}</p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 p-3 rounded-xl col-span-2"
              style={{ background: '#f8fdf8', border: '1px solid var(--color-border)' }}
            >
              <Phone size={16} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Teléfono</p>
                <p className="font-medium text-xs" style={{ color: 'var(--color-text)' }}>+58 {product.vendorPhone}</p>
              </div>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            id={`whatsapp-${product.id}`}
            className="inline-flex items-center justify-center gap-2.5 py-[14px] px-7 rounded-xl bg-linear-to-br from-whatsapp to-[#128c7e] text-white font-bold text-base border-none cursor-pointer transition-all duration-250 no-underline w-full hover:translate-y-[-3px]hover:shadow-[0_8px_28px_rgba(37,211,102,0.40)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal: Home ───────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'todos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado del modal de publicación
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishPrice, setPublishPrice] = useState('');
  const [publishCurrency, setPublishCurrency] = useState<'USD' | 'VES'>('USD');
  const [publishCategory, setPublishCategory] = useState<Category>('animales');
  const [publishLocation, setPublishLocation] = useState('');
  const [publishImageUrl, setPublishImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Observer de autenticación
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    return unsub;
  }, []);

  // Cargar productos desde Firestore
  useEffect(() => {
    let active = true;

    async function fetchProducts() {
      try {
        const data = await getProducts(activeCategory === 'todos' ? undefined : activeCategory);
        if (!active) return;
        setProducts(data);
      } catch {
        if (!active) return;
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      active = false;
    };
  }, [activeCategory]);

  // Filtrado por búsqueda (client-side)
  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.vendorName.toLowerCase().includes(q)
    );
  });

  const handleLogout = async () => {
    await signOut(auth);
    setUserMenuOpen(false);
  };

  const resetPublishForm = () => {
    setPublishTitle('');
    setPublishDescription('');
    setPublishPrice('');
    setPublishCurrency('USD');
    setPublishCategory('animales');
    setPublishLocation('');
    setPublishImageUrl('');
    setPublishError('');
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setPublishing(true);
    setPublishError('');

    try {
      await addProduct({
        title: publishTitle.trim(),
        description: publishDescription.trim(),
        price: parseFloat(publishPrice),
        currency: publishCurrency,
        category: publishCategory,
        location: publishLocation.trim(),
        imageUrl: publishImageUrl,
        vendorId: user.uid,
        vendorName: userProfile.nombre,
        vendorPhone: userProfile.telefono,
        createdAt: new Date().toISOString(),
        status: 'activo',
      });

      resetPublishForm();
      setShowPublishModal(false);
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 4000);

      // Recargar productos
      const data = await getProducts(activeCategory === 'todos' ? undefined : activeCategory);
      setProducts(data);
    } catch (err) {
      console.error('Error al publicar:', err);
      setPublishError('Error al publicar el producto. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-border-card/60 shadow-[0_2px_16px_rgba(27,67,50,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" id="logo-link" className="flex items-center gap-2 shrink-0">
            <Sprout size={24} style={{ color: 'var(--color-primary)' }} />
            <span
              className="font-display font-bold text-lg hidden sm:block"
              style={{ color: 'var(--color-primary-dark)' }}
            >
              Agro<span style={{ color: 'var(--color-accent)' }}>Market</span>
            </span>
          </Link>

          {/* Barra de búsqueda (desktop) */}
          <div className="flex-1 max-w-xl mx-auto hidden sm:block">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-text-muted)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-desktop"
                type="search"
                placeholder="Buscar animales, tractores, herramientas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-border bg-background text-[0.9rem] text-text transition-all duration-200 outline-none font-sans focus:border-primary-light focus:bg-white focus:shadow-[0_0_0_4px_rgba(64,145,108,0.12)] placeholder:text-[#9ca3af] py-3 pr-4 pl-10"
                style={{ paddingLeft: '2.5rem' }}
                aria-label="Buscar productos"
              />
            </div>
          </div>

          {/* Auth buttons / user menu */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {user ? (
              <div className="flex items-center gap-2">
                {userProfile?.rol === 'vendedor' && (
                  <button
                    id="publish-btn-header"
                    onClick={() => { setShowPublishModal(true); resetPublishForm(); }}
                    className="inline-flex items-center justify-center gap-2 bg-linear-to-br from-primary to-primary-dark text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,106,79,0.35)] hover:from-primary-light hover:to-primary transition-all duration-200 py-2 px-4 text-sm whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Publicar
                  </button>
                )}
                <div className="relative">
                  <button
                    id="user-menu-btn"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-(--color-border)"
                    style={{ color: 'var(--color-primary-dark)' }}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {user.email?.[0].toUpperCase()}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden border"
                      style={{ background: 'white', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card-hover)' }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Cuenta</p>
                        <p className="text-sm truncate font-medium" style={{ color: 'var(--color-text)' }}>{user.email}</p>
                      </div>
                      <Link
                        href="/mis-productos"
                        id="mis-productos-link"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all hover:bg-green-50"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <Store size={16} /> Mis productos
                      </Link>
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-medium transition-all hover:bg-red-50 text-red-600 border-t"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login" id="login-link" className="inline-flex items-center justify-center gap-2 bg-transparent text-primary font-semibold text-sm border-2 border-primary rounded-xl hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-[0_4px_16px_rgba(45,106,79,0.25)] transition-all duration-200 py-2 px-4 whitespace-nowrap">
                  Iniciar sesión
                </Link>
                <Link href="/registro" id="register-link" className="inline-flex items-center justify-center gap-2 bg-linear-to-br from-primary to-primary-dark text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,106,79,0.35)] hover:from-primary-light hover:to-primary transition-all duration-200 py-2 px-4 text-sm whitespace-nowrap">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Búsqueda móvil */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-muted)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search-mobile"
              type="search"
              placeholder="Buscar en AgroMarket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-border bg-white text-text transition-all duration-200 outline-none font-sans focus:border-primary-light focus:bg-white focus:shadow-[0_0_0_4px_rgba(64,145,108,0.12)] placeholder:text-[#9ca3af] py-3 pr-4 pl-10 text-sm"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </header>



      {/* ── BANNER DE ÉXITO ──────────────────────────────────────────────── */}
      {publishSuccess && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div
            className="flex items-center gap-3 p-4 rounded-2xl text-sm font-semibold animate-fade-in"
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
        </div>
      )}

      {/* ── CATEGORÍAS ──────────────────────────────────────────────────── */}
      <section className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => {
                  setLoading(true);
                  setActiveCategory(cat.id as Category | 'todos');
                }}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-[0.22s] ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap min-w-[90px] ${activeCategory === cat.id ? "border-primary bg-linear-to-br from-primary-dark to-primary text-white -translate-y-1 shadow-card-hover" : "border-transparent bg-white shadow-card hover:-translate-y-1 hover:shadow-card-hover"}`}
                aria-pressed={activeCategory === cat.id}
              >
                <CategoryIcon id={cat.id} size={28} />
                <span className="text-[0.7rem] font-semibold tracking-[0.03em] uppercase">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── GRID DE PRODUCTOS ────────────────────────────────────────────── */}
      <main className="flex-1 py-4 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Encabezado de sección */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                {activeCategory === 'todos'
                  ? 'Todos los productos'
                  : getCategoryConfig(activeCategory).label}
                {!loading && (
                  <span
                    className="ml-2 text-sm font-normal"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ({filtered.length})
                  </span>
                )}
              </h2>
              {searchQuery && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Resultados para &quot;<strong>{searchQuery}</strong>&quot;
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <SearchX size={64} style={{ color: 'var(--color-text-muted)' }} />
              <p className="mt-4 font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                No encontramos resultados
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Intenta con otra búsqueda o categoría
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-4 text-center text-sm"
        style={{
          background: 'var(--color-primary-dark)',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        <p className="font-display font-semibold text-white mb-1">
          <Sprout size={16} className="inline align-middle" /> AgroMarket Venezuela
        </p>
        <p>© 2026 · El marketplace agrícola de Venezuela · Todos los derechos reservados</p>
      </footer>

      {/* ── MODAL DETALLES ────────────────────────────────────────────────── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* ── MODAL PUBLICAR PRODUCTO ─────────────────────────────────────── */}
      {showPublishModal && (
        <div
          className="fixed inset-0 bg-[rgba(13,40,24,0.65)] backdrop-blur-[6px] z-100 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPublishModal(false); resetPublishForm(); } }}
          role="dialog"
          aria-modal="true"
          aria-label="Publicar producto"
        >
          <div className="bg-white rounded-3xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-modal animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            {/* Header */}
            <div className="relative flex items-center justify-center overflow-hidden bg-linear-to-br from-primary-dark to-primary h-[100px] rounded-t-3xl">
              <div className="text-center">
                <PenLine size={40} className="text-white/90" />
                <h2 className="font-display text-xl font-bold text-white mt-2">Nueva publicación</h2>
              </div>
              <button
                onClick={() => { setShowPublishModal(false); resetPublishForm(); }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
                style={{ background: 'rgba(0,0,0,0.35)' }}
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {publishError && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                  role="alert"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                  </svg>
                  {publishError}
                </div>
              )}

              <form onSubmit={handlePublish} className="space-y-5" noValidate>
                {/* Imagen */}
                <div>
                  <label className="form-label">Foto del producto</label>
                  {publishImageUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 group animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publishImageUrl} alt="Previsualización" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <button
                          type="button"
                          onClick={() => setPublishImageUrl('')}
                          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                          style={{ background: 'rgba(239,68,68,0.85)' }}
                        >
                          Quitar imagen
                        </button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 px-4 py-2 text-xs text-white truncate" style={{ background: 'rgba(0,0,0,0.50)' }}>
                        <Check size={12} className="inline align-middle" /> Imagen lista
                      </div>
                    </div>
                  ) : (
                    <SubirImagen onSubidaExitosa={(url) => setPublishImageUrl(url)} />
                  )}
                </div>

                {/* Título + Categoría */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pub-title" className="form-label">Título del producto</label>
                    <input
                      id="pub-title"
                      type="text"
                      required
                      maxLength={80}
                      placeholder="Ej: Toro Brahman reproductor"
                      value={publishTitle}
                      onChange={(e) => setPublishTitle(e.target.value)}
                      className="form-input"
                      disabled={publishing}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{publishTitle.length}/80</p>
                  </div>
                  <div>
                    <label htmlFor="pub-category" className="form-label">Categoría</label>
                    <select
                      id="pub-category"
                      value={publishCategory}
                      onChange={(e) => setPublishCategory(e.target.value as Category)}
                      className="form-input"
                      disabled={publishing}
                    >
                      {CATEGORIES.filter((c) => c.id !== 'todos').map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label htmlFor="pub-desc" className="form-label">Descripción detallada</label>
                  <textarea
                    id="pub-desc"
                    required
                    rows={3}
                    maxLength={600}
                    placeholder="Describe tu producto: características, estado, edad, peso..."
                    value={publishDescription}
                    onChange={(e) => setPublishDescription(e.target.value)}
                    className="form-input resize-none"
                    disabled={publishing}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{publishDescription.length}/600</p>
                </div>

                {/* Precio + Moneda + Ubicación */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="pub-price" className="form-label">Precio</label>
                    <input
                      id="pub-price"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="1200"
                      value={publishPrice}
                      onChange={(e) => setPublishPrice(e.target.value)}
                      className="form-input"
                      disabled={publishing}
                    />
                  </div>
                  <div>
                    <label htmlFor="pub-currency" className="form-label">Moneda</label>
                    <select
                      id="pub-currency"
                      value={publishCurrency}
                      onChange={(e) => setPublishCurrency(e.target.value as 'USD' | 'VES')}
                      className="form-input"
                      disabled={publishing}
                    >
                      <option value="USD"><DollarSign size={14} className="inline" /> USD</option>
                      <option value="VES"><Flag size={14} className="inline" /> VES</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pub-location" className="form-label">Ubicación</label>
                    <input
                      id="pub-location"
                      type="text"
                      required
                      placeholder="Barinas, Venezuela"
                      value={publishLocation}
                      onChange={(e) => setPublishLocation(e.target.value)}
                      className="form-input"
                      disabled={publishing}
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    id="publish-submit-btn"
                    type="submit"
                    disabled={publishing || !publishTitle || !publishDescription || !publishPrice || !publishLocation}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-7 rounded-xl bg-linear-to-br from-primary-dark to-primary text-white font-bold text-base border-none cursor-pointer transition-all duration-250 hover:translate-y-[-3px] hover:shadow-card-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {publishing ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Publicando...
                      </>
                    ) : (
                      <><Rocket size={18} /> Publicar en el marketplace</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPublishModal(false); resetPublishForm(); }}
                    className="py-3 px-5 rounded-xl border-2 font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
