"use client";
import { useState } from "react";
import { registrarUsuarioConRol } from "@/src/lib/auth";

interface FormData {
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  rol: "comprador" | "vendedor";
}

export default function RegistroPage() {
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    rol: "comprador",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registrarUsuarioConRol({
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        telefono: formData.telefono,
        rol: formData.rol,
      });
      alert("¡Usuario registrado con éxito!");
    } catch (err) {
      setError((err as Error).message || "Ocurrió un error al registrar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="auth-card p-8 sm:p-10 w-full max-w-md">
        <h1 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Crear cuenta</h1>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-5 text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} role="alert">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="reg-nombre" className="form-label">Nombre completo</label>
            <input id="reg-nombre" type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Juan Rodríguez" className="form-input w-full" />
          </div>

          <div>
            <label htmlFor="reg-email" className="form-label">Correo electrónico</label>
            <input id="reg-email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="tu@correo.com" className="form-input w-full" />
          </div>

          <div>
            <label htmlFor="reg-password" className="form-label">Contraseña</label>
            <input id="reg-password" type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Mínimo 6 caracteres" className="form-input w-full" />
          </div>

          <div>
            <label htmlFor="reg-telefono" className="form-label">Teléfono WhatsApp</label>
            <input id="reg-telefono" type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required placeholder="4141234567" className="form-input w-full" />
          </div>

          <div>
            <label htmlFor="reg-rol" className="form-label">¿Qué deseas hacer?</label>
            <select id="reg-rol" name="rol" value={formData.rol} onChange={handleChange} className="form-input w-full">
              <option value="comprador">Quiero comprar (Productos, ganado, etc.)</option>
              <option value="vendedor">Quiero vender (Tengo una finca / animales)</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
