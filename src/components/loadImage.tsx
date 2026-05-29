"use client";
import { useRef, useState } from "react";

export default function SubirImagen({ onSubidaExitosa }: { onSubidaExitosa: (url: string) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [subiendo, setSubiendo] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendo(true);

        // Creamos el paquete de datos para enviarlo directo por HTTP
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "marketplace_presets"); // Tu preset unsigned

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.secure_url) {
                onSubidaExitosa(data.secure_url);
            } else {
                console.error("Error en la respuesta de Cloudinary:", data);
            }
        } catch (err) {
            console.error("Error de red al subir a Cloudinary:", err);
        } finally {
            setSubiendo(false);
        }
    };

    return (
        <div style={{ padding: "10px", border: "1px dashed #ccc", borderRadius: "6px", textAlign: "center" }}>
            <p className="mb-2 text-sm text-gray-600">Sube la foto del producto o animal:</p>

            {/* 1. Input nativo de HTML que se salta el widget y abre el sistema de archivos directo */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden" // Súper oculto, nadie lo ve
            />

            {/* 2. Tu botón de Tailwind que activa el input oculto al hacer clic */}
            <button
                type="button"
                disabled={subiendo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 bg-linear-to-br from-primary to-primary-dark text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:from-primary-light hover:to-primary transition-all duration-200 py-2 px-4 text-sm disabled:opacity-50"
            >
                {subiendo ? "Subiendo..." : "Seleccionar Imagen"}
            </button>
        </div>
    );
}