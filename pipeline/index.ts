import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import sharp from "sharp";
import {
  calculateMetrics, canonicalParts, compact, imageId,
  normalizeBoolean, normalizeCategory, normalizeConfidence,
} from "./core";

type Args = { input: string; metadata: string; output: string; publicDir: string };
type Trace = { source: string; stem: string; id: string; category: string; image: string; thumbnail: string };
type Row = Record<string, string>;

function args(): Args {
  const values = process.argv.slice(2);
  const get = (name: string, fallback: string) => {
    const index = values.indexOf(`--${name}`);
    return index >= 0 ? values[index + 1] : fallback;
  };
  return {
    input: get("input", "data/raw"),
    metadata: get("metadata", "data/referencias.csv"),
    output: get("output", "public/data/dataset.json"),
    publicDir: get("images", "public/corpus"),
  };
}

async function walk(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const full = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat().filter((file) => /\.(jpe?g|png|webp|heic)$/i.test(file)).sort();
}

function categoryFor(file: string) {
  const normalized = normalizeCategory(path.basename(file).split("_")[0]);
  if (["casual", "profesional", "diseno"].includes(normalized)) return normalized;
  return normalizeCategory(path.basename(path.dirname(file)));
}

function findMatch(row: Row, traces: Trace[]) {
  const requested = row.id_imagen ?? "";
  const exact = traces.filter((item) => compact(item.stem) === compact(requested));
  if (exact.length === 1) return exact[0];

  const wanted = canonicalParts(requested);
  const author = compact(row.autor_id ?? "");
  const matches = traces.filter((item) => {
    const got = canonicalParts(item.stem);
    const category = wanted.category || normalizeCategory(row.tipo_manovich ?? "");
    const authorMatches = got.author === wanted.author || got.author === author ||
      (!!got.author && !!author && (got.author.startsWith(author) || author.startsWith(got.author)));
    return got.category === category && got.number === wanted.number && authorMatches;
  });
  return matches.length === 1 ? matches[0] : undefined;
}

async function run() {
  const config = args();
  const files = await walk(config.input);
  if (!files.length) throw new Error(`No se encontraron imágenes en ${config.input}`);
  await mkdir(config.publicDir, { recursive: true });

  console.log(`Procesando ${files.length} imágenes…`);
  const traces: Trace[] = [];
  const metrics = new Map<string, ReturnType<typeof calculateMetrics>>();

  for (const [index, file] of files.entries()) {
    const source = await readFile(file);
    const id = imageId(source);
    const category = categoryFor(file);
    if (!["casual", "profesional", "diseno"].includes(category)) {
      throw new Error(`Categoría no reconocida para ${file}`);
    }
    const output = path.join(config.publicDir, category, `${id}.webp`);
    const thumbnailOutput = path.join(config.publicDir, "thumbs", category, `${id}.webp`);
    await mkdir(path.dirname(output), { recursive: true });
    await mkdir(path.dirname(thumbnailOutput), { recursive: true });
    const image = sharp(source, { failOn: "warning" }).rotate().resize(900, 900, { fit: "fill" });
    await image.clone().webp({ quality: 82, effort: 5 }).toFile(output);
    await image.clone().resize(128, 128, { fit: "fill" }).webp({ quality: 70, effort: 4 }).toFile(thumbnailOutput);
    const { data } = await image.clone().resize(512, 512, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    metrics.set(id, calculateMetrics(data));
    traces.push({
      source: path.relative(config.input, file).replaceAll("\\", "/"),
      stem: path.parse(file).name,
      id,
      category,
      image: `/corpus/${category}/${id}.webp`,
      thumbnail: `/corpus/thumbs/${category}/${id}.webp`,
    });
    if ((index + 1) % 25 === 0 || index + 1 === files.length) console.log(`  ${index + 1}/${files.length}`);
  }

  const rows = parse(await readFile(config.metadata, "utf8"), {
    columns: (header: string[]) => header.map((value) => value.trim()),
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Row[];

  const missing: string[] = [];
  const dataset = rows.flatMap((row) => {
    const match = findMatch(row, traces);
    if (!match) { missing.push(row.id_imagen); return []; }
    return [{
      id_imagen: match.id,
      autor_id: compact(row.autor_id).toUpperCase(),
      tipo_manovich: normalizeCategory(row.tipo_manovich) || match.category,
      confianza_etiqueta: normalizeConfidence(row.confianza_etiqueta),
      caso_limite: normalizeBoolean(row.caso_limite),
      justificacion_etiqueta: row.justificacion_etiqueta.trim(),
      imagen: match.image,
      miniatura: match.thumbnail,
      ...metrics.get(match.id),
    }];
  });

  if (missing.length) throw new Error(`No se asociaron ${missing.length} filas: ${missing.join(", ")}`);
  await mkdir(path.dirname(config.output), { recursive: true });
  await writeFile(config.output, JSON.stringify(dataset));
  await writeFile("data/trazabilidad_privado.json", JSON.stringify(traces, null, 2));
  console.log(`Dataset listo: ${dataset.length} filas → ${config.output}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
