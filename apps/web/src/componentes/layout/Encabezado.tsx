import type { ReactNode } from 'react';

interface Props {
  readonly titulo: string;
  readonly resumen?: string;
  readonly acciones?: ReactNode;
}

export function Encabezado({ titulo, resumen, acciones }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 'var(--space-5)',
      }}
    >
      <div>
        <h1 style={{ fontSize: 30 }}>{titulo}</h1>
        {resumen && (
          <p style={{ margin: '4px 0 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            {resumen}
          </p>
        )}
      </div>
      {acciones && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{acciones}</div>}
    </header>
  );
}
