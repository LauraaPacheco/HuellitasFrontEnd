// Ejecutar desde la raíz: node tests/catalogos.test.mjs
// Usa esbuild, incluido por Vite, sin añadir dependencias de pruebas.
import { build } from 'esbuild';

const resultado = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: 'tsx',
    contents: `
      import assert from 'node:assert/strict';
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { opcionesElegibles, clavesCatalogos } from './apps/web/src/casos/catalogos';
      import { SelectorCatalogo } from './apps/web/src/componentes/ui/SelectorCatalogo/SelectorCatalogo';
      import { ClienteDemo } from './packages/shared/src/demo/clienteDemo';
      import { ServicioCatalogos } from './packages/shared/src/api/services/catalogos';
      import { ServicioMascotas } from './packages/shared/src/api/services/mascotas';

      const opciones = [
        { id: 1, nombre: 'Vigente', activo: true },
        { id: 2, nombre: 'Anterior', activo: false },
      ];
      assert.deepEqual(opcionesElegibles(opciones).map(o => o.id), [1]);
      assert.deepEqual(opcionesElegibles(opciones, 2).map(o => o.id), [1, 2]);
      assert.deepEqual(opcionesElegibles(undefined), []);
      assert.notDeepEqual(clavesCatalogos.razas(1), clavesCatalogos.razas(2));

      const pintar = (props = {}) => renderToStaticMarkup(
        <SelectorCatalogo id="catalogo" etiqueta="Raza" opciones={opciones}
          valor={undefined} alCambiar={() => {}} {...props} />
      );
      assert.match(pintar(), /Selecciona una opción/);
      assert.match(pintar({ cargando: true }), /Cargando…/);
      assert.match(pintar({ cargando: true }), /aria-busy="true"/);
      const bloqueado = pintar({ cargando: true, bloqueadoPor: 'Elige una especie' });
      assert.match(bloqueado, /Elige una especie/);
      assert.doesNotMatch(bloqueado, /Cargando…/);
      const vacio = pintar({ opciones: [] });
      assert.match(vacio, /Sin opciones disponibles/);
      assert.match(vacio, /disabled/);
      const fallo = pintar({ errorCarga: true, alReintentar: () => {} });
      assert.match(fallo, /No pudimos cargar las opciones/);
      assert.match(fallo, /Reintentar raza/);
      assert.doesNotMatch(fallo, /Sin opciones disponibles/);
      assert.match(pintar({ valor: 2 }), /value="2" disabled="" selected=""/);
      assert.match(pintar({ requerido: true }), /required=""/);

      const almacen = { obtener: async () => null, guardar: async () => {}, limpiar: async () => {} };
      const cliente = new ClienteDemo({ urlBase: '', almacen });
      const catalogos = new ServicioCatalogos(cliente);
      const mascotas = new ServicioMascotas(cliente, true);
      for (const metodo of ['especies', 'tamanos', 'colores', 'temperamentos']) {
        const lista = await catalogos[metodo]();
        assert.ok(lista.length > 0);
        assert.ok(lista.every(o => typeof o.id === 'number' && typeof o.nombre === 'string' && typeof o.activo === 'boolean'));
      }
      assert.ok((await catalogos.razas(1)).every(r => r.especieId === 1));
      assert.deepEqual(await catalogos.razas(0), []);
      assert.deepEqual(await catalogos.razas(), []);
      const criollosPerro = await mascotas.buscar({ razaId: 2 });
      assert.ok(criollosPerro.items.length > 0);
      assert.ok(criollosPerro.items.every(m => m.especie === 'Perro' && m.raza === 'Criollo'));
      const criollosGato = await mascotas.buscar({ razaId: 5 });
      assert.ok(criollosGato.items.length > 0);
      assert.ok(criollosGato.items.every(m => m.especie === 'Gato' && m.raza === 'Criollo'));
      const disponibles = await mascotas.buscar({ estado: 0 });
      assert.ok(disponibles.items.length > 0);
      assert.ok(disponibles.items.every(m => m.estado === 0));
      assert.equal((await mascotas.buscar({ especieId: 2, razaId: 2 })).total, 0);
      console.log('Catálogos: contratos demo, filtros y estados del selector verificados.');
    `,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  jsx: 'automatic',
  plugins: [{
    name: 'entorno-pruebas',
    setup(contexto) {
      contexto.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'api', namespace: 'pruebas' }));
      contexto.onLoad({ filter: /.*/, namespace: 'pruebas' }, () => ({ contents: 'export const api = {};' }));
      contexto.onResolve({ filter: /^@\/casos\/catalogos$/ }, () => ({ path: `${process.cwd()}/apps/web/src/casos/catalogos.ts` }));
      contexto.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    },
  }],
});
// El módulo temporal usa las mismas dependencias React que la app web.
const { writeFile, unlink } = await import('node:fs/promises');
const { pathToFileURL } = await import('node:url');
const temporal = `${process.cwd()}/apps/web/.catalogos-pruebas-${process.pid}.mjs`;
try {
  await writeFile(temporal, resultado.outputFiles[0].text);
  await import(pathToFileURL(temporal).href);
} finally {
  await unlink(temporal).catch(() => {});
}
