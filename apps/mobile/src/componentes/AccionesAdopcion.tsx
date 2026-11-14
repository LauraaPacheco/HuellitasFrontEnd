import { useState } from 'react';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronRight, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { File, Paths } from 'expo-file-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, EstadoSolicitud, formatearFecha, validarArchivoServidor, type SolicitudResumen } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { usarPaleta } from '@/temas';
import { Boton } from './Boton';
import { Campo } from './Campo';
const mensajeError = (e: unknown) => e instanceof ErrorHttp ? e.detalle ?? e.message : e instanceof Error ? e.message : 'No pudimos completar la operación.';
export function AccionesAdopcion({ solicitud: s }: { solicitud: SolicitudResumen }) {
  const paleta = usarPaleta(); const cache = useQueryClient();
  const [abierto,setAbierto]=useState(false);const [ocupado,setOcupado]=useState(false);const [tipo,setTipo]=useState('');
  const [pendiente,setPendiente]=useState<{ url: string; nombre: string; tipo: string }>();
  const [error,setError]=useState('');const [mensaje,setMensaje]=useState('');
  // Se consulta siempre: el boton de documentos solo aparece si ya hay alguno.
  const documentos=useQuery({queryKey:['soportes',s.id],queryFn:()=>api.adopcion.documentos(s.id),enabled:!MODO_DEMO,retry:false});
  async function asociar(url: string, clase: string) {
    await api.adopcion.asociarSoporte(s.id,clase,url);setPendiente(undefined);setMensaje('Documento adjuntado.');await cache.invalidateQueries({queryKey:['soportes',s.id]});
  }
  async function seleccionar() {
    if(ocupado)return;setError('');setMensaje('');
    if(!tipo.trim()){setError('Indica qué tipo de documento vas a adjuntar.');return;}
    setOcupado(true);
    try {
      const resultado=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png','image/webp'],multiple:false,copyToCacheDirectory:true});
      if(resultado.canceled)return;
      const archivo=resultado.assets[0]!;const bytes=archivo.size ?? (Platform.OS==='web'?archivo.file?.size:new File(archivo.uri).size) ?? 0;
      const problema=validarArchivoServidor(archivo.name,bytes);if(problema)throw new Error(problema);
      const form=new FormData();form.append('tipo','soportes');
      if(Platform.OS==='web') { if(!archivo.file)throw new Error('No pudimos leer el archivo seleccionado.');form.append('archivo',archivo.file); }
      else form.append('archivo',{uri:archivo.uri,name:archivo.name,type:archivo.mimeType??'application/octet-stream'} as unknown as Blob);
      const url=await api.archivos.subir(form);setPendiente({url,nombre:archivo.name,tipo:tipo.trim()});
      await asociar(url,tipo.trim());
    }catch(e){setError(mensajeError(e));}finally{setOcupado(false);}
  }
  async function reintentar() {if(!pendiente||ocupado)return;setOcupado(true);setError('');try{await asociar(pendiente.url,pendiente.tipo);}catch(e){setError(mensajeError(e));}finally{setOcupado(false);}}
  async function descargar() {
    if(ocupado)return;setOcupado(true);setError('');
    try { const blob=await api.adopcion.descargarConstancia(s.id);
      if(Platform.OS==='web'){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Constancia-${s.id}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      else {if(!await Sharing.isAvailableAsync())throw new Error('Este dispositivo no permite compartir archivos.');const file=new File(Paths.cache,`Constancia-${s.id}.pdf`);file.write(await pdfBase64(blob), { encoding: 'base64' });await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:'Constancia de adopción'});}
    }catch(e){setError(mensajeError(e));}finally{setOcupado(false);}
  }
  if(MODO_DEMO)return <Text style={{color:paleta.inkMuted,fontSize:12}}>Soportes y constancia requieren conexión al servidor real.</Text>;
  const cantidad=documentos.data?.length ?? 0;
  const abrir=()=>{setError('');setMensaje('');setAbierto(true);};
  const finalizada=s.estado===EstadoSolicitud.Finalizada;
  // Solo se muestra lo que existe: documentos ya cargados o la constancia.
  // Adjuntar volvera cuando el refugio pueda registrar requisitos que pidan
  // documentos (el backend todavia no los guarda).
  const hayAlgo=cantidad>0||finalizada||error!=='';
  if(!hayAlgo&&!abierto)return null;
  return <View style={{gap:10,borderTopWidth:1,borderTopColor:paleta.border,paddingTop:12}}>
    {finalizada&&<Boton titulo="Descargar constancia" cargando={ocupado} alPresionar={()=>void descargar()} />}
    {cantidad>0?<Pressable accessibilityRole="button" accessibilityLabel={`Ver documentos de la solicitud, ${cantidad}`} onPress={abrir}
      style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:10,minHeight:44,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:paleta.border,backgroundColor:pressed?paleta.surface300:paleta.surface100})}>
      <FileText size={18} strokeWidth={1.75} color={paleta.brandStrong} />
      <Text style={{flex:1,color:paleta.ink,fontSize:14,fontWeight:'600'}}>Documentos de la solicitud</Text>
      <View style={{minWidth:22,height:22,paddingHorizontal:6,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:paleta.brandTint}}><Text style={{color:paleta.brandStrong,fontSize:12,fontWeight:'700'}}>{cantidad}</Text></View>
      <ChevronRight size={16} color={paleta.inkMuted} />
    </Pressable>:null}
    {error!==''&&!abierto&&<Text accessibilityRole="alert" style={{color:paleta.danger}}>{error}</Text>}
    <Modal visible={abierto} transparent animationType="slide" onRequestClose={()=>{if(!ocupado)setAbierto(false);}}>
      <View style={{flex:1,backgroundColor:'#0009',justifyContent:'center',padding:20}}><ScrollView style={{maxHeight:'90%',backgroundColor:paleta.surface100,borderRadius:20}} contentContainerStyle={{padding:20,gap:16}} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={{color:paleta.ink,fontSize:20,fontWeight:'600'}}>Documentos · {s.codigo}</Text>
        {documentos.isPending?<EstadoCargando compacto mensaje="Cargando documentos…" />:documentos.isError?<><Text accessibilityRole="alert" style={{color:paleta.danger}}>{mensajeError(documentos.error)}</Text><Boton titulo="Reintentar consulta" alPresionar={()=>void documentos.refetch()} /></>:documentos.data?.length?documentos.data.map(d=><View key={d.documentoId} style={{gap:6}}><Text style={{color:paleta.inkMuted}}>{formatearFecha(d.fechaCarga)}</Text><Boton titulo={`Abrir ${d.tipo}`} variante="secundario" alPresionar={()=>{if(/^https:\/\//i.test(d.archivoUrl))void Linking.openURL(d.archivoUrl).catch(()=>setError('No pudimos abrir el documento.'));else setError('El enlace del documento no es válido.');}} /></View>):<Text style={{color:paleta.inkMuted}}>Todavía no hay documentos adjuntos.</Text>}
        {s.estado<=EstadoSolicitud.Aprobada&&<><Campo etiqueta="Tipo de documento" valor={tipo} alCambiar={setTipo} marcador="Por ejemplo: certificado" deshabilitado={ocupado||!!pendiente} /><Text style={{color:paleta.inkMuted,fontSize:13}}>PDF, JPG, PNG o WebP. Máximo 5 MB. Adjunta solo los documentos que te solicite el refugio.</Text>{pendiente?<><Text style={{color:paleta.inkMuted}}>El archivo {pendiente.nombre} se subió. Falta confirmar su asociación; reintentar no vuelve a subirlo.</Text><Boton titulo="Reintentar asociación" cargando={ocupado} alPresionar={()=>void reintentar()} /></>:<Boton titulo="Seleccionar y adjuntar archivo" cargando={ocupado} alPresionar={()=>void seleccionar()} />}</>}
        {mensaje!==''&&<Text accessibilityRole="alert" style={{color:paleta.brandStrong}}>{mensaje}</Text>}{error!==''&&<Text accessibilityRole="alert" style={{color:paleta.danger}}>{error}</Text>}
        <Boton titulo="Cerrar" variante="secundario" deshabilitado={ocupado} alPresionar={()=>setAbierto(false)} />
      </ScrollView></View>
    </Modal>
  </View>;
}

/** FileReader funciona también en React Native, donde Blob.arrayBuffer no siempre existe. */
function pdfBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No pudimos preparar el PDF.'));
    lector.onload = () => {
      const dato = String(lector.result ?? '');
      const separador = dato.indexOf(',');
      if (separador < 0) reject(new Error('El PDF no tiene contenido válido.'));
      else resolve(dato.slice(separador + 1));
    };
    lector.readAsDataURL(blob);
  });
}
