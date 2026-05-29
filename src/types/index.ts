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
  rol: 'comprador' | 'vendedor';
  createdAt: string;
}

// ─── Configuración de categorías (UI) ─────────────────────────────────────────
export interface CategoryConfig {
  id: Category | 'todos';
  label: string;
  color: string;
  bgGradient: string;
}
