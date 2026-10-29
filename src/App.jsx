import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingCart, Package, Wrench, Receipt, Settings, Store, WifiOff, Download } from 'lucide-react'
import { useStore } from './store'
import { useConexion, useInstalar } from './pwa'
import Ingreso from './components/Ingreso'
import EstadoNube from './components/EstadoNube'
import Inicio from './pages/Inicio'
import Vender from './pages/Vender'
import Inventario from './pages/Inventario'
import Reparaciones from './pages/Reparaciones'
import Ventas from './pages/Ventas'
import Ajustes from './pages/Ajustes'

const SECCIONES = [
  { id: 'inicio', label: 'Inicio', icono: LayoutDashboard, Pagina: Inicio },
  { id: 'vender', label: 'Vender', icono: ShoppingCart, Pagina: Vender },
  { id: 'inventario', label: 'Inventario', icono: Package, Pagina: Inventario },
  { id: 'reparaciones', label: 'Reparaciones', corto: 'Reparar', icono: Wrench, Pagina: Reparaciones, modulo: 'reparaciones' },
  { id: 'ventas', label: 'Ventas', icono: Receipt, Pagina: Ventas },
  { id: 'ajustes', label: 'Ajustes', icono: Settings, Pagina: Ajustes, soloEscritorio: true },
]

const leerHash = () => window.location.hash.replace('#', '') || 'inicio'
const CLAVE_SOLO_LOCAL = 'ventas-chazuta-solo-local'
const leerSoloLocal = () => { try { return localStorage.getItem(CLAVE_SOLO_LOCAL) === '1' } catch { return false } }

export default function App() {
  const { data, nube } = useStore()
  const [soloLocal, setSoloLocal] = useState(leerSoloLocal)

  if (nube.configurada && !nube.cuenta && !soloLocal) {
    return <Ingreso onOmitir={() => { try { localStorage.setItem(CLAVE_SOLO_LOCAL, '1') } catch { /* ignorar */ } setSoloLocal(true) }} />
  }
  return <Sistema data={data} nube={nube} />
}

function Sistema({ data, nube }) {
  const { negocio, reparaciones } = data
  const [seccion, setSeccion] = useState(leerHash)
  const [accion, setAccion] = useState(null)
  const enLinea = useConexion()
  const { puedeInstalar, instalar } = useInstalar()

  useEffect(() => {
    const cambio = () => setSeccion(leerHash())
    window.addEventListener('hashchange', cambio)
    return () => window.removeEventListener('hashchange', cambio)
  }, [])

  useEffect(() => { document.title = `${negocio.nombre} · Ventas` }, [negocio.nombre])

  // `accion` permite abrir directamente un formulario desde los accesos rápidos del inicio
  const ir = (id, conAccion = null) => {
    setAccion(conAccion)
    window.location.hash = id
    setSeccion(id)
    window.scrollTo(0, 0)
  }

  const visibles = SECCIONES.filter((s) => !s.modulo || negocio.modulos[s.modulo])
  const actual = visibles.find((s) => s.id === seccion) || visibles[0]
  const pendientes = reparaciones.filter((r) => r.estado === 'listo').length
  const { Pagina } = actual

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <span className="marca-logo"><Store size={20} /></span>
          <div>
            <strong>{negocio.nombre}</strong>
            <small>Sistema de ventas</small>
          </div>
        </div>
        <nav>
          {visibles.map(({ id, label, icono: Icono }) => (
            <button key={id} className={`nav-item ${actual.id === id ? 'activo' : ''}`} onClick={() => ir(id)}>
              <Icono size={19} />
              <span>{label}</span>
              {id === 'reparaciones' && pendientes > 0 && <em className="nav-badge">{pendientes}</em>}
            </button>
          ))}
        </nav>
        <div className="lateral-pie">
          {puedeInstalar && (
            <button className="btn-instalar" onClick={instalar}><Download size={16} /> Instalar en este equipo</button>
          )}
          <EstadoNube />
          {nube.cuenta ? (
            <p>Cuenta:<span className="lateral-email" title={nube.cuenta.email}>{nube.cuenta.email}</span></p>
          ) : (
            <p>Funciona sin internet. Los datos se guardan en este equipo.</p>
          )}
        </div>
      </aside>

      <header className="cabecera-movil">
        <div className="marca">
          <span className="marca-logo"><Store size={18} /></span>
          <strong>{negocio.nombre}</strong>
        </div>
        {(nube.cuenta || !enLinea) && <EstadoNube compacto />}
        <button className={`btn-icono ${actual.id === 'ajustes' ? 'activo' : ''}`} onClick={() => ir('ajustes')} aria-label="Ajustes">
          <Settings size={21} />
        </button>
      </header>

      <main className="contenido">
        {!enLinea && (
          <div className="aviso-offline">
            <WifiOff size={18} />
            <span>
              <b>Estás sin internet.</b> Puedes seguir vendiendo con normalidad: todo se guarda en este equipo
              {nube.cuenta ? ' y se subirá a la nube solo cuando vuelva la señal.' : '.'}
            </span>
          </div>
        )}
        <Pagina ir={ir} accion={accion} limpiarAccion={() => setAccion(null)} />
      </main>

      <nav className="barra-inferior">
        {visibles.filter((s) => !s.soloEscritorio).map(({ id, label, corto, icono: Icono }) => (
          <button key={id} className={actual.id === id ? 'activo' : ''} onClick={() => ir(id)}>
            <span className="barra-icono">
              <Icono size={21} />
              {id === 'reparaciones' && pendientes > 0 && <em className="nav-badge">{pendientes}</em>}
            </span>
            <span>{corto || label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
