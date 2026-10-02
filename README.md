# Canvas Analítico

Explorador web de un corpus de 207 fotografías clasificadas como **casuales**, **profesionales** o **de diseño**, inspirado en la analítica cultural de Lev Manovich. La aplicación permite comparar luz, contraste y color sin depender de Streamlit ni de un servidor Python.

## Qué cambió

- La interfaz fue reconstruida con Next.js y TypeScript, lista para Vercel.
- El dataset se carga automáticamente al abrir la página: no hay rutas locales ni botón “Recargar datos”.
- Los cuatro scripts Python se reemplazaron por un solo pipeline TypeScript.
- Cada imagen publicada usa un hash como identificador y formato WebP optimizado.
- Los archivos originales, los nombres de archivo y la tabla con datos personales permanecen fuera de Git.

## Experiencia de exploración

La aplicación incluye tres vistas conectadas por los mismos filtros:

- **Plano:** cruza dos variables visuales en un gráfico interactivo.
- **Distribuciones:** compara cómo se reparte una variable entre las tres categorías.
- **Grilla:** recorre el corpus visualmente y abre la ficha analítica de cada fotografía.

Los filtros permiten combinar tipo de fotografía, confianza de la etiqueta y casos límite. Al seleccionar una imagen se muestran sus siete valores medidos y la justificación cualitativa de su autor o autora.

## Pipeline unificado

`pipeline/index.ts` hace todo el procesamiento en una sola ejecución:

1. Recorre el corpus original y corrige la orientación EXIF.
2. Convierte cada fotografía a WebP de 900 × 900 px para la aplicación.
3. Asigna un ID anónimo mediante SHA-256 del archivo original.
4. Calcula las variables sobre una muestra RGB de 512 × 512 px.
5. Asocia la metadata aunque los nombres tengan tildes, extensiones o variantes históricas.
6. Normaliza categorías, confianza y casos límite.
7. Escribe `public/data/dataset.json`, consumido directamente por el frontend.

Variables calculadas:

| Variable | Interpretación |
| --- | --- |
| `mediana_luminancia` | Nivel tonal central de la imagen |
| `dispersion_luminancia` | Desvío estándar de la luminancia |
| `prop_sombras` | Proporción con luminancia menor a 0,10 |
| `prop_altas_luces` | Proporción con luminancia mayor a 0,90 |
| `matiz_dominante_deg` | Media circular del matiz ponderada por saturación |
| `saturacion_media` | Intensidad cromática media |
| `dominancia_cromatica` | Peso del color cuantizado más frecuente |

El muestreo a 512 px conserva la estructura global de luz y color y reduce significativamente el tiempo de procesamiento respecto de medir todos los píxeles de la imagen publicada.

## Uso local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

### Volver a generar el dataset

Ubicá las imágenes dentro de `data/raw/` —pueden estar organizadas en las carpetas `casual`, `profesional` y `diseno`— y la metadata privada en `data/referencias.csv`.

```bash
npm run pipeline
```

También se pueden indicar otras rutas:

```bash
npm run pipeline -- \
  --input /ruta/al/corpus \
  --metadata /ruta/a/referencias.csv
```

Luego se recomienda ejecutar:

```bash
npm test
npm run build
```

## Privacidad

Nunca deben versionarse:

- `data/raw/`: fotografías originales, que pueden conservar EXIF.
- `data/referencias.csv`: contiene los nombres originales y datos de autoría.
- `data/trazabilidad_privado.json`: relación entre nombre original e ID anónimo.

Estos archivos ya están incluidos en `.gitignore`. El repositorio solo publica las imágenes procesadas con nombres anónimos y el dataset necesario para la visualización.

## Despliegue en Vercel

1. Importar este repositorio desde el panel de Vercel.
2. Mantener **Next.js** como framework detectado.
3. Usar `npm run build` como comando de build.
4. No hacen falta variables de entorno ni servicios externos.

La salida es completamente estática, por lo que el corpus se sirve rápidamente desde la red de distribución de Vercel.

## Estructura

```text
app/                 interfaz y estilos
lib/                 tipos compartidos
pipeline/            procesamiento, asociación y pruebas
public/corpus/        imágenes WebP anónimas
public/data/          dataset publicado
data/                 fuentes privadas ignoradas por Git
```

## Contexto académico

El proyecto nació como trabajo integrador de Procesamiento de Imágenes de la Tecnicatura en Ciencia de Datos e Inteligencia Artificial del IFTS N.° 24. Esta versión separa el producto web del repositorio grupal original y conserva únicamente su objetivo analítico y su corpus autorizado.
