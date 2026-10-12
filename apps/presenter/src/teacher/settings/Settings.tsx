import type { View } from '../../store/schema';
import { Button } from '../../ui/Button';
import { Card, Page, PageHeader } from '../../ui/Layout';
import { useUi } from '../../ui/UiProvider';
import { ConnectionSettings } from './Connection';

/**
 * Ajustes de este dispositivo: la conexión con GitHub para editar el contenido y el acceso
 * docente local. Las cuentas y la sincronización de datos privados llegan en la etapa 2.
 */
export function Settings({
  onNavigate,
  onChangeRole,
  onLock,
}: {
  onNavigate: (view: View) => void;
  onChangeRole: () => void;
  onLock: () => void;
}) {
  const { confirm } = useUi();
  const lock = async () => {
    if (
      await confirm({
        title: '¿Bloquear el acceso docente en este navegador?',
        body: 'Tus cursos, comentarios y cambios sin guardar quedan en este navegador.',
        ok: 'Bloquear',
      })
    )
      onLock();
  };
  return (
    <Page width="narrow">
      <PageHeader
        kicker="Ajustes"
        title="Este dispositivo"
        lead="Conexión con el repositorio y acceso docente. Tus cursos, sesiones y comentarios quedan en este navegador y nunca se suben al repositorio."
      />
      <ConnectionSettings onNavigate={onNavigate} />
      <section aria-labelledby="ajustes-acceso" className="settings-section">
        <h2 id="ajustes-acceso" className="settings-title">
          Acceso docente
        </h2>
        <Card>
          <div className="account-id">
            <span aria-hidden="true" className="avatar">
              PP
            </span>
            <span>
              <b>Profe Piña</b>
              <span>Acceso local: un bloqueo de este navegador, sin cuenta.</span>
            </span>
          </div>
          <div className="row">
            <Button onClick={onChangeRole}>Cambiar de rol</Button>
            <Button onClick={() => void lock()}>Bloquear este navegador</Button>
          </div>
        </Card>
      </section>
    </Page>
  );
}
