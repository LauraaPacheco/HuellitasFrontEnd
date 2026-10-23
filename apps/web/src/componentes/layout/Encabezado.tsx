import type { ReactNode } from 'react';

interface Props {
  readonly titulo: string;
  readonly resumen?: string;
  readonly acciones?: ReactNode;
}

export function Encabezado({ titulo, resumen, acciones }: Props) {
  return (
    <header className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {resumen && (
          <p style={{ margin: '4px 0 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            {resumen}
          </p>
        )}
      </div>
      {acciones && <div className="encabezado__acciones">{acciones}</div>}
    </header>
  );
}
