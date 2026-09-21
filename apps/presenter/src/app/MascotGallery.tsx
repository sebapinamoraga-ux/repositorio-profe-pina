import { useMemo, useState } from 'react';
import { ArrowLeft, Filter } from 'lucide-react';
import {
  mascotTemplateMdx,
  type MascotPresence,
  type MascotTemplate,
} from '@aula/content-model';
import { mascotGallery } from './gallery';
import { mascotUrl } from './mascot-assets';

const presenceNames: Record<MascotPresence, string> = {
  sutil: 'Sutil',
  pedagogica: 'Pedagógica',
  marca: 'Marca',
};

function TemplateContent({ template }: { template: MascotTemplate }) {
  if (template.layout === 'grafico')
    return (
      <div
        className="template-graph"
        aria-label="Esquema de dos rectas secantes"
      >
        <svg viewBox="0 0 320 170" role="img" aria-label="Un punto común">
          <path className="gallery-axis" d="M28 12v132h270" />
          <path className="gallery-line-blue" d="M34 24l246 116" />
          <path className="gallery-line-yellow" d="M48 140L268 28" />
          <circle className="gallery-point" cx="165" cy="86" r="7" />
        </svg>
      </div>
    );
  return (
    <div
      className={
        template.layout === 'dos-columnas'
          ? 'template-columns'
          : 'template-preview-steps'
      }
    >
      {template.preview.map((item) => (
        <div key={item.title}>
          <b>{item.title}</b>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function TemplateSlide({
  template,
  compact = false,
}: {
  template: MascotTemplate;
  compact?: boolean;
}) {
  const level = presenceNames[template.mascot.nivel];
  return (
    <article
      className={`template-slide template-layout-${template.layout} ${compact ? 'is-compact' : ''}`}
      data-use={template.uso}
      aria-label={`${template.title}. Presencia ${level}. ${template.purpose}`}
    >
      <div className="template-slide-header">
        <span>
          <b>p.</b> PROFE PIÑA
        </span>
        <span>MATEMÁTICA Y FÍSICA</span>
      </div>
      <div className="template-slide-main">
        <p className="template-eyebrow">{template.eyebrow}</p>
        <h2>{template.heading}</h2>
        <div className="template-content">
          {template.layout !== 'portada' && <p>{template.body}</p>}
          <TemplateContent template={template} />
          <div className="template-callout">
            <b>{template.calloutTitle}</b>
            <span>{template.calloutBody}</span>
          </div>
        </div>
      </div>
      <img
        className={`template-mascot template-mascot-${template.mascot.nivel} template-mascot-${template.mascot.ubicacion}`}
        src={mascotUrl(template.mascot.pose)}
        alt={template.mascot.alt}
      />
      <div className="template-slide-footer">
        <span>{template.slideType}</span>
        <span>
          {level} · pose {String(template.mascot.pose).padStart(2, '0')}
        </span>
      </div>
    </article>
  );
}

export function MascotGallery({ returnHref }: { returnHref: string }) {
  const [phase, setPhase] = useState('todas');
  const [presence, setPresence] = useState<MascotPresence | 'todas'>('todas');
  const [selectedId, setSelectedId] = useState(
    mascotGallery.templates[0]?.id ?? '',
  );
  const visible = useMemo(
    () =>
      mascotGallery.templates.filter(
        (template) =>
          (presence === 'todas' || template.mascot.nivel === presence) &&
          (phase === 'todas' || template.phase === phase),
      ),
    [presence, phase],
  );
  const selected =
    visible.find((template) => template.id === selectedId) ?? visible[0];

  return (
    <main className="template-gallery">
      <header className="gallery-header">
        <a className="gallery-back" href={returnHref}>
          <ArrowLeft size={20} /> Volver a la clase
        </a>
        <div>
          <p className="gallery-kicker">
            Sistema de plantillas · versión {mascotGallery.version}
          </p>
          <h1>Presencia de Profe Piña</h1>
          <p>
            {mascotGallery.templates.length} plantillas reutilizables para
            distintos momentos de matemática y física.
          </p>
        </div>
      </header>

      <nav
        className="gallery-filters"
        aria-label="Filtrar por nivel de presencia"
      >
        <span>
          <Filter size={17} /> Nivel
        </span>
        {(['todas', 'sutil', 'pedagogica', 'marca'] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={presence === item}
            onClick={() => setPresence(item)}
          >
            {item === 'todas' ? 'Todas' : presenceNames[item]}
          </button>
        ))}
        <label>
          Momento de clase{' '}
          <select
            value={phase}
            onChange={(event) => setPhase(event.target.value)}
          >
            <option value="todas">Todos los momentos</option>
            <option value="inicio">Inicio</option>
            <option value="activacion">Activación</option>
            <option value="desarrollo">Desarrollo</option>
            <option value="practica">Práctica</option>
            <option value="cierre">Cierre</option>
          </select>
        </label>
      </nav>

      {selected ? (
        <section
          className="gallery-feature"
          aria-labelledby="gallery-selected-title"
        >
          <div className="gallery-feature-copy">
            <p className={`presence-tag presence-${selected.mascot.nivel}`}>
              {presenceNames[selected.mascot.nivel]}
            </p>
            <h2 id="gallery-selected-title">{selected.title}</h2>
            <p>{selected.purpose}</p>
            <dl>
              <div>
                <dt>Momento</dt>
                <dd>{selected.phase}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{selected.slideType}</dd>
              </div>
              <div>
                <dt>Mascota</dt>
                <dd>Pose {String(selected.mascot.pose).padStart(2, '0')}</dd>
              </div>
            </dl>
            <a
              className="gallery-download"
              download={`${selected.id}.mdx`}
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(mascotTemplateMdx(selected))}`}
            >
              Descargar plantilla
            </a>
            <p className="gallery-instructions">
              Incluye composición, mascota y contenido de ejemplo. Adapta el
              contenido, guarda el archivo en las diapositivas de tu clase y
              agrégalo a su listado.
            </p>
            <p className="gallery-instructions">
              Vista esquemática. Comprueba la composición final con tu contenido
              y todos sus pasos revelados.
            </p>
          </div>
          <TemplateSlide template={selected} />
        </section>
      ) : (
        <p role="status">
          No hay plantillas para esta combinación. Cambia el nivel o el momento.
        </p>
      )}

      <section className="gallery-grid" aria-label="Plantillas disponibles">
        {visible.map((template) => (
          <button
            key={template.id}
            type="button"
            className={
              template.id === selected?.id
                ? 'gallery-card is-selected'
                : 'gallery-card'
            }
            aria-pressed={template.id === selected?.id}
            onClick={() => setSelectedId(template.id)}
          >
            <TemplateSlide template={template} compact />
            <span className="gallery-card-copy">
              <b>{template.title}</b>
              <span>
                {template.slideType} · {presenceNames[template.mascot.nivel]}
              </span>
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
