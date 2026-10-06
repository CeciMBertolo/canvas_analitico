"use client";

import { useEffect, useMemo, useState } from "react";
import { METRICS, type Category, type Metric, type Photo } from "@/lib/types";

const CATEGORY: Record<Category, { label: string; color: string }> = {
  casual: { label: "Casual", color: "#ff6b4a" },
  profesional: { label: "Profesional", color: "#5ed4c7" },
  diseno: { label: "Diseño", color: "#f5c451" },
};

const LABELS: Record<Metric, string> = {
  mediana_luminancia: "Luminancia",
  dispersion_luminancia: "Contraste",
  prop_sombras: "Sombras",
  prop_altas_luces: "Altas luces",
  matiz_dominante_deg: "Matiz dominante",
  saturacion_media: "Saturación",
  dominancia_cromatica: "Dominancia cromática",
};

type View = "plano" | "distribucion" | "grilla";
type PlotMode = "imagenes" | "burbujas";

function formatValue(metric: Metric, value: number) {
  return metric === "matiz_dominante_deg" ? `${value.toFixed(1)}°` : value.toFixed(3);
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {METRICS.map((metric) => <option key={metric} value={metric}>{LABELS[metric]}</option>)}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <span>0 resultados</span>
      <p>No hay fotografías que coincidan con estos filtros.</p>
    </div>
  );
}

function Scatter({ data, xMetric, yMetric, mode, thumbnailSize, onSelect }: {
  data: Photo[];
  xMetric: Metric;
  yMetric: Metric;
  mode: PlotMode;
  thumbnailSize: number;
  onSelect: (photo: Photo) => void;
}) {
  const width = 1200, height = 480;
  const pad = { left: 72, right: 28, top: 24, bottom: 56 };
  const valuesX = data.map((photo) => photo[xMetric]);
  const valuesY = data.map((photo) => photo[yMetric]);
  const minX = Math.min(...valuesX), maxX = Math.max(...valuesX);
  const minY = Math.min(...valuesY), maxY = Math.max(...valuesY);
  const markRadius = mode === "imagenes" ? thumbnailSize / 2 : 9;
  const sx = (value: number) => pad.left + markRadius + ((value - minX) / (maxX - minX || 1)) * (width - pad.left - pad.right - markRadius * 2);
  const sy = (value: number) => height - pad.bottom - markRadius - ((value - minY) / (maxY - minY || 1)) * (height - pad.top - pad.bottom - markRadius * 2);
  const ticks = Array.from({ length: 5 }, (_, i) => i / 4);
  const groups = new Map<string, Photo[]>();
  data.forEach((photo) => {
    const key = `${photo[xMetric].toFixed(6)}:${photo[yMetric].toFixed(6)}`;
    groups.set(key, [...(groups.get(key) ?? []), photo]);
  });
  const positions = data.map((photo) => {
    const key = `${photo[xMetric].toFixed(6)}:${photo[yMetric].toFixed(6)}`;
    const group = groups.get(key) ?? [photo];
    const index = group.indexOf(photo);
    const spread = group.length > 1 ? Math.min(thumbnailSize * 0.6, 30) : 0;
    const angle = (index / group.length) * Math.PI * 2;
    return {
      photo,
      x: sx(photo[xMetric]) + Math.cos(angle) * spread,
      y: sy(photo[yMetric]) + Math.sin(angle) * spread,
    };
  });

  return (
    <div className="chart-wrap">
      <svg className="scatter" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${LABELS[xMetric]} por ${LABELS[yMetric]}`}>
        {ticks.map((t) => {
          const x = pad.left + t * (width - pad.left - pad.right);
          const y = pad.top + t * (height - pad.top - pad.bottom);
          return <g key={t} className="grid"><line x1={x} y1={pad.top} x2={x} y2={height - pad.bottom} /><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} /></g>;
        })}
        <line className="axis" x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
        <line className="axis" x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} />
        {ticks.map((t) => (
          <g key={`labels-${t}`} className="tick">
            <text x={pad.left + t * (width - pad.left - pad.right)} y={height - 34} textAnchor="middle">{(minX + t * (maxX - minX)).toFixed(2)}</text>
            <text x={55} y={height - pad.bottom - t * (height - pad.top - pad.bottom) + 4} textAnchor="end">{(minY + t * (maxY - minY)).toFixed(2)}</text>
          </g>
        ))}
        <text className="axis-label" x={(width + pad.left - pad.right) / 2} y={height - 8} textAnchor="middle">{LABELS[xMetric]}</text>
        <text className="axis-label" transform={`translate(17 ${(height + pad.top - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle">{LABELS[yMetric]}</text>
        {positions.map(({ photo, x, y }) => mode === "imagenes" ? (
          <g
            key={`${photo.id_imagen}-${photo.autor_id}`}
            className="image-point"
            onClick={() => onSelect(photo)}
            tabIndex={0}
            role="button"
            aria-label={`Abrir foto ${photo.id_imagen}`}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(photo); }}
          >
            <title>{CATEGORY[photo.tipo_manovich].label} · {formatValue(xMetric, photo[xMetric])} / {formatValue(yMetric, photo[yMetric])}</title>
            <image href={photo.miniatura || photo.imagen} x={x - thumbnailSize / 2} y={y - thumbnailSize / 2} width={thumbnailSize} height={thumbnailSize} preserveAspectRatio="xMidYMid slice" />
            <rect x={x - thumbnailSize / 2} y={y - thumbnailSize / 2} width={thumbnailSize} height={thumbnailSize} fill="none" />
          </g>
        ) : (
          <circle
            key={`${photo.id_imagen}-${photo.autor_id}`}
            className="point"
            cx={x}
            cy={y}
            r="7"
            fill={CATEGORY[photo.tipo_manovich].color}
            onClick={() => onSelect(photo)}
            tabIndex={0}
            role="button"
            aria-label={`Abrir foto ${photo.id_imagen}`}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(photo); }}
          ><title>{CATEGORY[photo.tipo_manovich].label} · {formatValue(xMetric, photo[xMetric])} / {formatValue(yMetric, photo[yMetric])}</title></circle>
        ))}
      </svg>
    </div>
  );
}

function Histogram({ data, metric }: { data: Photo[]; metric: Metric }) {
  const bins = 16;
  const values = data.map((photo) => photo[metric]);
  const min = Math.min(...values), max = Math.max(...values);
  const series = (Object.keys(CATEGORY) as Category[]).map((category) => {
    const counts = Array(bins).fill(0) as number[];
    data.filter((photo) => photo.tipo_manovich === category).forEach((photo) => {
      const index = Math.min(bins - 1, Math.floor(((photo[metric] - min) / (max - min || 1)) * bins));
      counts[index]++;
    });
    return { category, counts };
  });
  const tallest = Math.max(...series.flatMap((item) => item.counts));

  return (
    <div className="histogram" aria-label={`Distribución de ${LABELS[metric]}`}>
      {Array.from({ length: bins }, (_, bin) => (
        <div className="bin" key={bin} title={`${(min + bin / bins * (max - min)).toFixed(2)}–${(min + (bin + 1) / bins * (max - min)).toFixed(2)}`}>
          {series.map(({ category, counts }) => (
            <span key={category} style={{ height: `${(counts[bin] / (tallest || 1)) * 100}%`, background: CATEGORY[category].color }} />
          ))}
        </div>
      ))}
      <div className="range"><span>{formatValue(metric, min)}</span><span>{formatValue(metric, max)}</span></div>
    </div>
  );
}

function Detail({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Detalle de fotografía">
        <button className="close" onClick={onClose} aria-label="Cerrar detalle">×</button>
        <img className="detail-image" src={photo.imagen} alt={`Fotografía clasificada como ${CATEGORY[photo.tipo_manovich].label}`} />
        <div className="detail-body">
          <div className="eyebrow"><span style={{ background: CATEGORY[photo.tipo_manovich].color }} />{CATEGORY[photo.tipo_manovich].label} · {photo.confianza_etiqueta}</div>
          <h2>Lectura de la imagen</h2>
          <div className="metric-grid">
            {METRICS.map((metric) => <div key={metric}><span>{LABELS[metric]}</span><strong>{formatValue(metric, photo[metric])}</strong></div>)}
          </div>
          <h3>Justificación</h3>
          <p>{photo.justificacion_etiqueta}</p>
          <footer>ID {photo.id_imagen} · Autor/a {photo.autor_id}{photo.caso_limite ? " · Caso límite" : ""}</footer>
        </div>
      </aside>
    </div>
  );
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("plano");
  const [categories, setCategories] = useState<Category[]>(["casual", "profesional", "diseno"]);
  const [confidence, setConfidence] = useState("todas");
  const [onlyLimits, setOnlyLimits] = useState(false);
  const [xMetric, setXMetric] = useState<Metric>("mediana_luminancia");
  const [yMetric, setYMetric] = useState<Metric>("dispersion_luminancia");
  const [histMetric, setHistMetric] = useState<Metric>("dispersion_luminancia");
  const [plotMode, setPlotMode] = useState<PlotMode>("imagenes");
  const [thumbnailSize, setThumbnailSize] = useState(52);
  const [selected, setSelected] = useState<Photo | null>(null);

  useEffect(() => {
    fetch("/data/dataset.json")
      .then((response) => { if (!response.ok) throw new Error("No se pudo leer el dataset"); return response.json(); })
      .then((data: Photo[]) => setPhotos(data))
      .catch(() => setError("No se pudo cargar el corpus. Volvé a intentar en unos instantes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => photos.filter((photo) =>
    categories.includes(photo.tipo_manovich) &&
    (confidence === "todas" || photo.confianza_etiqueta === confidence) &&
    (!onlyLimits || photo.caso_limite)
  ), [photos, categories, confidence, onlyLimits]);

  const toggleCategory = (category: Category) => setCategories((current) =>
    current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
  );

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Canvas Analítico, inicio"><span className="brand-mark"><i /><i /><i /></span><span>Canvas<br />Analítico</span></a>
        <nav aria-label="Vistas">
          {(["plano", "distribucion", "grilla"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "distribucion" ? "Distribuciones" : item[0].toUpperCase() + item.slice(1)}</button>)}
        </nav>
        <div className="corpus-count"><strong>{photos.length || "—"}</strong><span>fotografías<br />en el corpus</span></div>
      </header>

      <section className="intro" id="top">
        <div><p className="kicker">Analítica cultural · Lev Manovich</p><h1>Mirar las imágenes también es <em>medirlas.</em></h1></div>
        <p className="intro-copy">Explorá cómo la luz, el color y el contraste se distribuyen entre fotografías casuales, profesionales y de diseño.</p>
      </section>

      <section className="workspace">
        <aside className="filters">
          <div className="section-number">01</div><h2>Filtrar corpus</h2>
          <div className="filter-group"><span className="filter-title">Tipo de fotografía</span>{(Object.keys(CATEGORY) as Category[]).map((category) => <label className="check" key={category}><input type="checkbox" checked={categories.includes(category)} onChange={() => toggleCategory(category)} /><i style={{ background: CATEGORY[category].color }} /><span>{CATEGORY[category].label}</span><b>{photos.filter((photo) => photo.tipo_manovich === category).length}</b></label>)}</div>
          <label className="field"><span>Confianza de etiqueta</span><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="todas">Todas</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
          <label className="switch"><input type="checkbox" checked={onlyLimits} onChange={(event) => setOnlyLimits(event.target.checked)} /><span /><b>Solo casos límite</b></label>
          <button className="reset" onClick={() => { setCategories(["casual", "profesional", "diseno"]); setConfidence("todas"); setOnlyLimits(false); }}>Restablecer filtros</button>
        </aside>

        <div className="visualization">
          <div className="viz-head">
            <div><div className="section-number">02</div><h2>{view === "plano" ? "Plano de variables" : view === "distribucion" ? "Distribuciones" : "Archivo visual"}</h2><p>{filtered.length} fotografías visibles</p></div>
            {view === "plano" && <div className="axis-selects"><Select label="Eje X" value={xMetric} onChange={(value) => setXMetric(value as Metric)} /><Select label="Eje Y" value={yMetric} onChange={(value) => setYMetric(value as Metric)} /></div>}
            {view === "distribucion" && <div className="axis-selects"><Select label="Variable" value={histMetric} onChange={(value) => setHistMetric(value as Metric)} /></div>}
          </div>

          {loading && <div className="loading"><span />Preparando el corpus…</div>}
          {error && <div className="empty"><span>Error de carga</span><p>{error}</p></div>}
          {!loading && !error && filtered.length === 0 && <EmptyState />}
          {!loading && filtered.length > 0 && view === "plano" && <>
            <div className="plot-controls">
              <div className="mode-control" role="group" aria-label="Representación del plano">
                <span>Modo</span>
                <button aria-pressed={plotMode === "imagenes"} onClick={() => setPlotMode("imagenes")}>Miniaturas</button>
                <button aria-pressed={plotMode === "burbujas"} onClick={() => setPlotMode("burbujas")}>Burbujas</button>
              </div>
              <label className={`size-control ${plotMode === "burbujas" ? "disabled" : ""}`}><span>Tamaño de miniatura <b>{thumbnailSize}px</b></span><input type="range" min="28" max="84" step="4" value={thumbnailSize} disabled={plotMode === "burbujas"} onChange={(event) => setThumbnailSize(Number(event.target.value))} /></label>
            </div>
            <Scatter data={filtered} xMetric={xMetric} yMetric={yMetric} mode={plotMode} thumbnailSize={thumbnailSize} onSelect={setSelected} />
          </>}
          {!loading && filtered.length > 0 && view === "distribucion" && <><Histogram data={filtered} metric={histMetric} /><div className="legend">{(Object.keys(CATEGORY) as Category[]).map((category) => <span key={category}><i style={{ background: CATEGORY[category].color }} />{CATEGORY[category].label}</span>)}</div></>}
          {!loading && filtered.length > 0 && view === "grilla" && <div className="gallery">{[...filtered].sort((a, b) => a[xMetric] - b[xMetric]).map((photo) => <button key={`${photo.id_imagen}-${photo.autor_id}`} onClick={() => setSelected(photo)}><img src={photo.imagen} alt="" loading="lazy" /><span style={{ background: CATEGORY[photo.tipo_manovich].color }}>{CATEGORY[photo.tipo_manovich].label}</span></button>)}</div>}
          <div className="viz-foot"><span>Seleccioná un punto o una imagen para ver su ficha.</span><span>Datos cargados automáticamente</span></div>
        </div>
      </section>

      <section className="method">
        <div><div className="section-number">03</div><h2>Qué estamos midiendo</h2></div>
        <div className="method-grid">{METRICS.slice(0, 4).map((metric, index) => <article key={metric}><span>0{index + 1}</span><h3>{LABELS[metric]}</h3><p>{metric === "mediana_luminancia" ? "El nivel tonal central: qué tan clara u oscura es la imagen." : metric === "dispersion_luminancia" ? "La variación entre tonos, una aproximación al contraste visual." : metric === "prop_sombras" ? "La proporción de píxeles que cae en el extremo oscuro." : "La presencia relativa de píxeles muy luminosos."}</p></article>)}</div>
      </section>

      <footer className="page-footer"><span>Canvas Analítico</span><p>Un instrumento de exploración visual para leer el corpus más allá de sus etiquetas.</p><span>2026</span></footer>
      {selected && <Detail photo={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
