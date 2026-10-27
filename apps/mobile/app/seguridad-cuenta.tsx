import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { OpcionesPerfil } from '@/componentes/OpcionesPerfil';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { usarPaleta } from '@/temas';

export default function SeguridadCuenta() {
  const paleta=usarPaleta(); const router=useRouter(); const {usuario,cerrarSesion}=useSesion();
  const [accion,setAccion]=useState<'password'|'correo'|'desactivar'>('password'); const [actual,setActual]=useState(''); const [nueva,setNueva]=useState(''); const [confirmacion,setConfirmacion]=useState(''); const [correo,setCorreo]=useState(''); const [error,setError]=useState(''); const [ocupado,setOcupado]=useState(false); const [modal,setModal]=useState(false); const [resultado,setResultado]=useState('');
  async function ejecutar() {
    if(ocupado)return; setError('');
    if(!actual){setError('Escribe tu contraseña actual.');return;}
    if(accion==='password'&&(nueva.length<8||nueva!==confirmacion)){setError('La nueva contraseña debe tener al menos 8 caracteres y coincidir con su confirmación.');return;}
    if(accion==='correo'&&!esCorreoValido(correo)){setError('Escribe un correo válido.');return;}
    setOcupado(true);
    try {
      if(accion==='password')await api.usuarios.cambiarPassword(actual,nueva);
      else if(accion==='correo')await api.usuarios.cambiarCorreo(correo.trim(),actual);
      else await api.usuarios.desactivarCuenta(actual);
      setResultado(accion==='correo'?'Revisa tu nuevo correo para confirmar el cambio antes de iniciar sesión.':accion==='desactivar'?'Tu cuenta se desactivó.':'Tu contraseña cambió. Inicia sesión nuevamente.');
      setActual('');setNueva('');setConfirmacion('');setModal(false);await cerrarSesion();
    } catch(e){setError(e instanceof ErrorHttp?e.detalle??e.message:'No pudimos completar el cambio. Inténtalo de nuevo.');}finally{setOcupado(false);}
  }
  if(resultado)return <View style={{padding:24,gap:20,backgroundColor:paleta.surface100,flex:1}}><Text accessibilityRole="alert" style={{color:paleta.ink}}>{resultado}</Text><Boton titulo="Ir a iniciar sesión" alPresionar={()=>router.replace('/login')} /></View>;
  if(!usuario)return <AvisoSesion mensaje="Inicia sesión para gestionar tu cuenta." />;
  return <ScrollView contentContainerStyle={{padding:24,gap:20}} style={{backgroundColor:paleta.surface100}} keyboardShouldPersistTaps="handled">
    <OpcionesPerfil etiqueta="Seguridad de tu cuenta" opciones={[{valor:'password',etiqueta:'Contraseña'},{valor:'correo',etiqueta:'Correo'},{valor:'desactivar',etiqueta:'Desactivar cuenta'}]} valor={accion} deshabilitado={ocupado} alCambiar={v=>{setAccion(v);setError('');setActual('');}} />
    {MODO_DEMO&&<Text style={{color:paleta.inkMuted}}>Los cambios de seguridad están disponibles al conectarte al servidor; la demo no modifica credenciales.</Text>}
    <Campo etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} esContrasena autoComplete="password" deshabilitado={ocupado||MODO_DEMO} />
    {accion==='password'&&<><Campo etiqueta="Nueva contraseña" valor={nueva} alCambiar={setNueva} esContrasena autoComplete="new-password" deshabilitado={ocupado||MODO_DEMO} /><Campo etiqueta="Confirmar nueva contraseña" valor={confirmacion} alCambiar={setConfirmacion} esContrasena autoComplete="new-password" deshabilitado={ocupado||MODO_DEMO} /></>}
    {accion==='correo'&&<><Campo etiqueta="Nuevo correo" valor={correo} alCambiar={setCorreo} tipoTeclado="email-address" autoCapitalize="none" deshabilitado={ocupado||MODO_DEMO} /><Text style={{color:paleta.inkMuted}}>Necesitarás confirmar el nuevo correo para volver a ingresar.</Text></>}
    {accion==='desactivar'&&<Text style={{color:paleta.inkMuted}}>Desactivarás el acceso a tu cuenta. Se cerrará tu sesión.</Text>}
    {!!error&&<Text accessibilityRole="alert" style={{color:paleta.danger}}>{error}</Text>}
    <Boton titulo={accion==='password'?'Cambiar contraseña':accion==='correo'?'Cambiar correo':'Desactivar cuenta'} deshabilitado={MODO_DEMO} cargando={ocupado} alPresionar={()=>accion==='desactivar'?setModal(true):void ejecutar()} />
    <Modal visible={modal} transparent animationType="fade" onRequestClose={()=>{if(!ocupado)setModal(false);}}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0009'}}><View style={{padding:24,gap:20,borderRadius:16,backgroundColor:paleta.surface100}}><Text style={{color:paleta.ink,fontWeight:'700'}}>¿Confirmas la desactivación de tu cuenta?</Text><Text style={{color:paleta.inkMuted}}>Se cerrará tu sesión y no podrás ingresar con esta cuenta.</Text>{!!error&&<Text accessibilityRole="alert" style={{color:paleta.danger}}>{error}</Text>}<Boton titulo="Confirmar desactivación" cargando={ocupado} alPresionar={()=>void ejecutar()} /><Boton titulo="Cancelar" variante="secundario" deshabilitado={ocupado} alPresionar={()=>setModal(false)} /></View></View></Modal>
  </ScrollView>;
}
