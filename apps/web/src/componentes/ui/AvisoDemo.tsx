import { CONTRASENA_DEMO } from '@huellitas/shared';
import { MODO_DEMO } from '@/lib/api';

/**
 * Banda que recuerda que los datos son simulados, con las credenciales
 * a la vista. Desaparece sola al apagar VITE_MODO_DEMO.
 */
export function AvisoDemo({ conCredenciales = false }: { readonly conCredenciales?: boolean }) {
  if (!MODO_DEMO) return null;

  return (
    <aside
      style={{
        background: 'var(--accent-tint)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 13,
        lineHeight: '20px',
      }}
    >
      <strong>Modo demostración.</strong> Los datos son de ejemplo y no se
      guardan en ningún lado.
      {conCredenciales && (
        <>
          {' '}
          Entra con <code>admin@huellitas.co</code>,{' '}
          <code>refugio@huellitas.co</code> o <code>adoptante@huellitas.co</code>,
          todos con la contraseña <code>{CONTRASENA_DEMO}</code>.
        </>
      )}
    </aside>
  );
}
