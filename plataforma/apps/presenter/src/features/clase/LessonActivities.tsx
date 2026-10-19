import { useState } from 'react';
import type { Activity } from '@aula/content-model';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { activityUses } from '../../content/ops';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Layout';
import { ActivityForm, ActivityRow } from '../recursos/Activities';

/** Actividades que usan las láminas de esta clase; el banco completo está en Actividades y PAES. */
export function LessonActivities({
  lessonId,
  onNavigate,
}: {
  lessonId: string;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const [editing, setEditing] = useState<Activity | null>(null);
  const list = Object.values(content.bundle.activities)
    .filter((activity) =>
      activityUses(content.bundle, activity.id).some((use) => use.lesson.id === lessonId),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="ws-page">
      <div className="row">
        <p className="muted grow">
          {list.length
            ? `${list.length} ${list.length === 1 ? 'actividad aparece' : 'actividades aparecen'} en las láminas de esta clase con el bloque «Pregunta PAES».`
            : 'Ninguna lámina de esta clase usa una actividad del banco.'}
        </p>
        <Button size="sm" onClick={() => onNavigate('actividades')}>
          Ir al banco de actividades
        </Button>
      </div>
      {list.length > 0 ? (
        <ul className="activity-list">
          {list.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              lessonId={lessonId}
              onEdit={() => setEditing(activity)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : (
        <Card variant="dashed">
          <p>
            Para agregar una, elige una lámina en «Láminas» y usa la plantilla de pregunta, o
            crea la actividad en el banco.
          </p>
        </Card>
      )}
      {editing && (
        <ActivityForm
          key={editing.id}
          initial={editing}
          isNew={false}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
