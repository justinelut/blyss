import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blyss",
    short_name: "Blyss",
    description:
      "A Kenya-focused marketplace for digital products and subscriptions.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0e0c",
    theme_color: "#0f0e0c",
    icons: [
      {
        src: "/blyss-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/blyss-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
