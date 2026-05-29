// src/lib/auth.ts
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { UserProfile } from "@/src/types";

// ─── Registro ─────────────────────────────────────────────────────────────────

interface RegistroParams {
  email: string;
  password: string;
  nombre: string;
  /** Número venezolano sin +58, ej: 4141234567 */
  telefono: string;
  rol: "comprador" | "vendedor";
}

/**
 * Registra un usuario en Firebase Auth y guarda su perfil con rol en Firestore.
 */
export const registrarUsuarioConRol = async ({
  email,
  password,
  nombre,
  telefono,
  rol,
}: RegistroParams) => {
  // Validar formato teléfono Venezuela (04XX o 4XX sin prefijo)
  const telefonoLimpio = telefono.replace(/\D/g, "").replace(/^0/, "");
  if (!/^(4(1[246]|2[46])\d{7})$/.test(telefonoLimpio)) {
    throw new Error(
      "Número inválido. Debe ser un número venezolano válido (ej: 4141234567)"
    );
  }

  // 1. Crear usuario en Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  // 2. Guardar perfil en Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    nombre,
    email,
    telefono: telefonoLimpio,
    rol,
    createdAt: new Date().toISOString(),
  } satisfies UserProfile);

  return { success: true, user };
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Inicia sesión con email y contraseña.
 */
export const loginUsuario = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return { success: true, user: credential.user };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Cierra la sesión del usuario actual.
 */
export const logoutUsuario = async () => {
  await signOut(auth);
};

// ─── Auth state observer ──────────────────────────────────────────────────────

/**
 * Escucha cambios en el estado de autenticación.
 * @returns función de cleanup para desuscribirse
 */
export const observarAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ─── Perfil de usuario ────────────────────────────────────────────────────────

/**
 * Obtiene el perfil completo del usuario desde Firestore.
 */
export const obtenerPerfil = async (
  uid: string
): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};