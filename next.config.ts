import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Evita que Next genere archivos de instrucciones ajenos al proyecto.
  agentRules: false,
} satisfies NextConfig & { agentRules: boolean };

export default nextConfig;
