import { StyleSheet, Text, View } from 'react-native';
import { Cake, Cat, Dog, Mars, PawPrint, Ruler, ShieldCheck, Tag, Venus, type LucideIcon } from 'lucide-react-native';
import { ETIQUETA_SEXO, Sexo } from '@huellitas/shared';
import { espaciado, radios, usarPaleta } from '@/temas';

export interface DatoMascota {
  readonly etiqueta: string;
  readonly valor: string;
  readonly icono: LucideIcon;
}

interface Origen {
  readonly especie: string;
  readonly raza: string | null;
  readonly edadAproximada: number | null;
  readonly sexo: Sexo;
  readonly tamano?: string | null;
  readonly esterilizada?: boolean;
}

/** Especie, raza, edad, sexo y, si los hay, tamaño y esterilización. */
export function datosMascota(m: Origen): DatoMascota[] {
  const especie = m.especie || 'Sin especie';
  const datos: DatoMascota[] = [
    { etiqueta: 'Especie', valor: especie, icono: /perro/i.test(especie) ? Dog : /gato/i.test(especie) ? Cat : PawPrint },
    { etiqueta: 'Raza', valor: m.raza ?? 'Sin raza definida', icono: Tag },
    {
      etiqueta: 'Edad',
      valor: m.edadAproximada === null ? 'Sin dato' : `${m.edadAproximada} ${m.edadAproximada === 1 ? 'año' : 'años'}`,
      icono: Cake,
    },
    { etiqueta: 'Sexo', valor: ETIQUETA_SEXO[m.sexo], icono: m.sexo === Sexo.Hembra ? Venus : Mars },
  ];
  if (m.tamano) datos.push({ etiqueta: 'Tamaño', valor: m.tamano, icono: Ruler });
  if (m.esterilizada !== undefined) {
    datos.push({
      etiqueta: 'Esterilización',
      valor: m.esterilizada ? (m.sexo === Sexo.Hembra ? 'Esterilizada' : 'Esterilizado') : 'Sin esterilizar',
      icono: ShieldCheck,
    });
  }
  return datos;
}

/**
 * Los datos de una mascota de dos en dos, cada uno con su icono en un
 * círculo verde suave. Es el mismo bloque en la tarjeta del catálogo y en
 * la ficha, y sigue el de Mi cuenta en la web.
 */
export function DatosMascota({ datos, fondo }: { readonly datos: readonly DatoMascota[]; readonly fondo?: string }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.datos, { backgroundColor: fondo ?? paleta.surface100 }]}>
      {datos.map(({ etiqueta, valor, icono: Icono }) => (
        <View key={etiqueta} style={estilos.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
          <View style={[estilos.icono, { backgroundColor: paleta.brandTint }]}>
            <Icono size={16} strokeWidth={1.75} color={paleta.brandStrong} />
          </View>
          <View style={estilos.textos}>
            <Text style={[estilos.etiqueta, { color: paleta.inkMuted }]}>{etiqueta}</Text>
            <Text numberOfLines={1} style={[estilos.valor, { color: paleta.ink }]}>{valor}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  datos: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaciado.s3, padding: espaciado.s3, borderRadius: radios.md },
  dato: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, paddingRight: espaciado.s2 },
  icono: { width: 32, height: 32, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  etiqueta: { fontSize: 11, lineHeight: 14 },
  valor: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
});
