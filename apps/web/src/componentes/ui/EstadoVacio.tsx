import type { ReactNode } from 'react';

interface Props {
  readonly titulo: string;
  readonly descripcion: string;
  readonly accion?: ReactNode;
}

/** Ninguna pantalla vacia se queda muda: explica qué pasó y qué hacer. */
export function EstadoVacio({ titulo, descripcion, accion }: Props) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
    >
      <p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{titulo}</p>
      <p style={{ margin: 0, color: 'var(--ink-muted)' }}>{descripcion}</p>
      {accion && <div style={{ marginTop: 'var(--space-2)' }}>{accion}</div>}
    </div>
  );
}
