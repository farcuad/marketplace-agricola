import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite cargar imágenes desde Firebase Storage con next/image (opcional)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Formatos modernos para optimización automática
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
