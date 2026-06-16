// ─── Categorías del marketplace ───────────────────────────────────────────────
export type Category =
  | 'animales'
  | 'tractores'
  | 'herramientas'
  | 'semillas'
  | 'fertilizantes'
  | 'otros';

// ─── Producto ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: 'USD' | 'VES' | 'COP';
  category: Category;
  imageUrl?: string;
  location: string;
  locationLat?: number;
  locationLng?: number;
  categoryDetails?: Record<string, string>;
  likes: number;
  dislikes: number;
  vendorId: string;
  vendorName: string;
  /** Número sin prefijo +58, ej: 4141234567 */
  vendorPhone: string;
  createdAt: string;
  status: 'activo' | 'vendido' | 'pausado';
}

// ─── Perfil de usuario ─────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  nombre: string;
  email: string;
  /** Número sin prefijo +58, ej: 4141234567 */
  telefono: string;
  rol: 'comprador' | 'vendedor' | 'ambos';
  createdAt: string;
}

// ─── Orden / Venta ─────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  id_orden: string;
  productId: string;
  nombre_producto: string;
  precio_unitario: number;
  cantidad_solicitada: number;
  total_estimado: number;
  imageUrl?: string;
  id_vendedor: string;
  nombre_vendedor: string;
  id_comprador: string;
  nombre_comprador: string;
  fecha_contacto: string;
  estado: 'contactado' | 'completado' | 'cancelado';
}

// ─── Comentario en publicación ──────────────────────────────────────────────────
export interface Comment {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// ─── Voto (like/dislike) ────────────────────────────────────────────────────────
export interface Rating {
  id: string;
  productId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: string;
}

// ─── Configuración de categorías (UI) ─────────────────────────────────────────
export interface CategoryConfig {
  id: Category | 'todos';
  label: string;
  color: string;
  bgGradient: string;
}
