import { Cloud, CloudOff, CloudUpload, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import { useConexion } from '../pwa'

// Una sola etiqueta que dice si las ventas ya están a salvo en la nube
export function resumenNube(nube, enLinea) {
  const n = nube.pendientes
  const porSubir = `${n} ${n === 1 ? 'cambio' : 'cambios'} por subir`
  if (!nube.configurada || !nube.cuenta) {
    return enLinea
      ? { tono: 'neutro', Icono: Wifi, corto: 'Con internet', largo: 'Los datos se guardan solo en este equipo.' }
      : { tono: 'aviso', Icono: WifiOff, corto: 'Sin internet', largo: 'Los datos se guardan solo en este equipo.' }
  }
  if (nube.estado.fase === 'sesion') return { tono: 'error', Icono: AlertCircle, corto: 'Volver a ingresar', largo: nube.estado.error }
  if (!enLinea || nube.estado.fase === 'sin-red') {
    return { tono: 'aviso', Icono: CloudOff, corto: n ? `Sin señal · ${n} por subir` : 'Sin señal', largo: n ? `${porSubir}. Se subirán solos cuando vuelva la señal.` : 'Todo lo anterior ya está en la nube.' }
  }
  if (nube.estado.fase === 'sincronizando') return { tono: 'neutro', Icono: RefreshCw, corto: 'Guardando en la nube…', largo: porSubir, gira: true }
  if (nube.estado.fase === 'error') return { tono: 'aviso', Icono: CloudUpload, corto: n ? `${n} por subir` : 'Reintentando', largo: 'No se pudo conectar con la nube. Se reintenta solo.' }
  if (n) return { tono: 'neutro', Icono: CloudUpload, corto: `${n} por subir`, largo: porSubir }
  return { tono: 'ok', Icono: Cloud, corto: 'Guardado en la nube', largo: 'Todas las ventas están respaldadas.' }
}

export default function EstadoNube({ compacto }) {
  const { nube } = useStore()
  const enLinea = useConexion()
  const r = resumenNube(nube, enLinea)
  if (compacto && r.tono === 'ok') {
    return <span className="nube-pill ok" title={r.largo}><Cloud size={14} /></span>
  }
  return (
    <span className={`nube-pill ${r.tono}`} title={r.largo}>
      <r.Icono size={14} className={r.gira ? 'girando' : ''} /> {r.corto}
    </span>
  )
}
