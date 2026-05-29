"use client";
import { CldUploadButton } from "next-cloudinary";

export default function SubirImagen({ onSubidaExitosa }: { onSubidaExitosa: (url: string) => void }) {
    const handleUpload = (result: any) => {
        // Si la subida es exitosa, Cloudinary nos devuelve toda la info del archivo
        if (result?.event === "success" && result?.info && typeof result.info === "object" && "secure_url" in result.info) {
            const urlImagen = result.info.secure_url; // Esta es la URL pública optimizada
            console.log("Imagen subida con éxito a Cloudinary:", urlImagen);

            // Le pasamos la URL al componente padre (formulario del producto)
            onSubidaExitosa(urlImagen);
        }
    };

    return (
        <div style={{ padding: "10px", border: "1px dashed #ccc", borderRadius: "6px", textAlign: "center" }}>
            <p>Sube la foto del producto o animal:</p>

            <CldUploadButton
                // Reemplaza con el Upload Preset "Unsigned" que creaste en el Paso 2
                uploadPreset="marketplace_presets"
                onSuccess={handleUpload}
                options={{ maxFiles: 1, sources: ["local"] }}
                className="inline-flex items-center justify-center gap-2 bg-linear-to-br from-primary to-primary-dark text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:from-primary-light hover:to-primary transition-all duration-200 py-2 px-4 text-sm"
            >
                Seleccionar Imagen
            </CldUploadButton>
        </div>
    );
}