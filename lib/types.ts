export const METRICS = [
  "mediana_luminancia",
  "dispersion_luminancia",
  "prop_sombras",
  "prop_altas_luces",
  "matiz_dominante_deg",
  "saturacion_media",
  "dominancia_cromatica",
] as const;

export type Metric = (typeof METRICS)[number];
export type Category = "casual" | "profesional" | "diseno";

export type Photo = {
  id_imagen: string;
  autor_id: string;
  tipo_manovich: Category;
  confianza_etiqueta: "alta" | "media" | "baja";
  caso_limite: boolean;
  justificacion_etiqueta: string;
  imagen: string;
  miniatura: string;
} & Record<Metric, number>;
