// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import type { Category, Product, UserProfile } from "@/src/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Evita errores de inicialización duplicada durante el desarrollo (Hot Reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Instancias principales
const db       = getFirestore(app);
const auth     = getAuth(app);
const storage  = getStorage(app);

// Analytics solo en el cliente
let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== "undefined") {
  isSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

// ─── Storage: compresión de imagen (solo cliente) ─────────────────────────────

/**
 * Comprime una imagen en el navegador usando Canvas → WebP.
 * Reduce el tamaño hasta maxPx px en el lado más largo y aplica quality (0-1).
 */
async function compressImage(
  file: File,
  maxPx = 1200,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compresión fallida"))),
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Imagen inválida"));
    img.src = url;
  });
}

/**
 * Sube una imagen al Storage de Firebase con compresión automática WebP.
 *
 * @param file        - Archivo de imagen original (cualquier formato)
 * @param uid         - UID del vendedor (organiza carpeta en Storage)
 * @param onProgress  - Callback con porcentaje de progreso 0-100
 * @returns URL pública de descarga desde Firebase Storage
 */
export async function uploadProductImage(
  file: File,
  uid: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const compressed = await compressImage(file);
  const path       = `products/${uid}/${Date.now()}.webp`;
  const ref        = storageRef(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref, compressed, {
      contentType: "image/webp",
      customMetadata: { uploadedBy: uid },
    });

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

// ─── Firestore: Productos ──────────────────────────────────────────────────────

/**
 * Obtiene productos activos del marketplace.
 * Filtra por categoría si se especifica. Ordena por fecha descendente (cliente).
 *
 * Nota: se usa un solo where() para evitar requerir índices compuestos.
 * El filtro de status y el ordenamiento se aplican en el cliente.
 */
export async function getProducts(category?: Category): Promise<Product[]> {
  try {
    const constraints: QueryConstraint[] = category
      ? [where("category", "==", category)]
      : [];

    const q =
      constraints.length > 0
        ? query(collection(db, "products"), ...constraints)
        : query(collection(db, "products"));

    const snap = await getDocs(q);

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Product))
      .filter((p) => p.status === "activo")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch (err) {
    console.error("getProducts:", err);
    return [];
  }
}

/**
 * Obtiene todos los productos de un vendedor específico (incluye pausados/vendidos).
 */
export async function getProductsByVendor(vendorId: string): Promise<Product[]> {
  try {
    const q = query(
      collection(db, "products"),
      where("vendorId", "==", vendorId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Product))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch (err) {
    console.error("getProductsByVendor:", err);
    return [];
  }
}

/**
 * Obtiene un producto por su ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
  } catch (err) {
    console.error("getProductById:", err);
    return null;
  }
}

/**
 * Agrega un nuevo producto al marketplace.
 * @returns El ID del documento creado en Firestore.
 */
export async function addProduct(
  product: Omit<Product, "id">
): Promise<string> {
  const docRef = await addDoc(collection(db, "products"), {
    ...product,
    createdAt: new Date().toISOString(),
    status: "activo",
  });
  return docRef.id;
}

/**
 * Cambia el estado de un producto (activo | vendido | pausado).
 */
export async function updateProductStatus(
  productId: string,
  status: Product["status"]
): Promise<void> {
  await updateDoc(doc(db, "products", productId), { status });
}

/**
 * Elimina permanentemente un producto del marketplace.
 */
export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, "products", productId));
}

// ─── Firestore: Usuarios ───────────────────────────────────────────────────────

/**
 * Obtiene el perfil de un usuario desde la colección "users".
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    console.error("getUserProfile:", err);
    return null;
  }
}

export { db, analytics, auth, storage };