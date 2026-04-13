/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  /**
   * Security headers aplicados a todas las rutas.
   *
   * X-Content-Type-Options: nosniff
   *   Impide que el browser "adivine" el tipo de contenido de una respuesta.
   *   Sin este header, un browser podría ejecutar un archivo .txt como JS si cree
   *   que lo es — un vector de ataque conocido como MIME sniffing.
   *
   * X-Frame-Options: DENY
   *   Prohíbe que la app sea embebida en un <iframe>.
   *   Previene ataques de clickjacking (el usuario cree que hace click en tu app
   *   pero en realidad interactúa con un iframe invisible encima de otra página).
   *
   * X-XSS-Protection: 1; mode=block
   *   Activa el filtro XSS integrado en browsers más viejos (IE/Edge legacy).
   *   En browsers modernos no tiene efecto, pero tampoco hace daño.
   *
   * Referrer-Policy: strict-origin-when-cross-origin
   *   Controla qué información de URL se envía en el header Referer.
   *   Con este valor, solo envía el origen (sin path ni query) cuando la
   *   navegación es cross-origin — evita filtrar rutas internas o tokens en URLs.
   *
   * Permissions-Policy
   *   Deshabilita explícitamente cámara, micrófono y geolocalización.
   *   Una app de nutrición no necesita ninguno de estos permisos.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
