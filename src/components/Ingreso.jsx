import { useState } from 'react'
import { Store, CloudUpload, Sparkles, WifiOff, LogIn } from 'lucide-react'
import { useStore } from '../store'
import { useConexion } from '../pwa'

const mensajeError = (e) => {
  const m = e?.message || ''
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(m)) return 'Esta cuenta todavía no está confirmada.'
  if (/fetch|network/i.test(m)) return 'No hay conexión con la nube. Revisa la señal e inténtalo otra vez.'
  return m || 'No se pudo ingresar.'
}

export default function Ingreso({ onOmitir }) {
  const { data, nube } = useStore()
  const enLinea = useConexion()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [cuentaVacia, setCuentaVacia] = useState(null)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const r = await nube.iniciarSesion(email, clave)
      if (r.resultado === 'vacia') setCuentaVacia(r.cuenta)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  if (cuentaVacia) {
    return (
      <div className="ingreso">
        <div className="ingreso-caja">
          <span className="ingreso-logo"><CloudUpload size={26} /></span>
          <h1>Cuenta lista</h1>
          <p className="ingreso-sub">Esta cuenta todavía no tiene datos en la nube. ¿Con qué empezamos?</p>
          <div className="opciones-inicio">
            <button className="opcion-inicio" onClick={() => nube.primeraSubida(cuentaVacia, 'local')}>
              <CloudUpload size={22} />
              <span>
                <strong>Subir lo que hay en este equipo</strong>
                <small>{data.productos.length} productos, {data.ventas.length} ventas y {data.reparaciones.length} reparaciones</small>
              </span>
            </button>
            <button className="opcion-inicio" onClick={() => nube.primeraSubida(cuentaVacia, 'limpio')}>
              <Sparkles size={22} />
              <span>
                <strong>Empezar en limpio</strong>
                <small>Se borran los datos de prueba y se conserva el nombre del negocio</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ingreso">
      <form className="ingreso-caja form" onSubmit={enviar}>
        <span className="ingreso-logo"><Store size={26} /></span>
        <h1>{data.negocio.nombre}</h1>
        <p className="ingreso-sub">Ingresa con la cuenta del negocio para guardar las ventas en la nube.</p>

        {!enLinea && (
          <p className="ingreso-aviso"><WifiOff size={16} /> Para ingresar la primera vez se necesita internet. Después funciona sin señal.</p>
        )}

        <label>Correo<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required /></label>
        {error && <p className="ayuda error">{error}</p>}
        <button className="btn btn-pri btn-grande" type="submit" disabled={cargando}>
          {cargando ? 'Ingresando…' : <><LogIn size={18} /> Ingresar</>}
        </button>
        <button type="button" className="enlace ingreso-omitir" onClick={onOmitir}>Usar solo en este equipo por ahora</button>
      </form>
    </div>
  )
}
