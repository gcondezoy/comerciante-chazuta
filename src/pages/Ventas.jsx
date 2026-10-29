import { useEffect, useState } from 'react'
import { Wrench, ShoppingBag, Wallet, ListOrdered } from 'lucide-react'
import { useStore, codigoVenta } from '../store'
import { dinero, fechaCorta, hora, gananciaVenta, desdeHace, METODOS_PAGO } from '../utils'
import { cajaAbierta } from '../caja'
import Modal from '../components/Modal'
import Ticket from '../components/Ticket'
import Caja from './Caja'

const PERIODOS = [
  { id: 'hoy', label: 'Hoy', desde: () => desdeHace(0) },
  { id: '7', label: '7 días', desde: () => desdeHace(6) },
  { id: '30', label: '30 días', desde: () => desdeHace(29) },
  { id: 'todo', label: 'Todo', desde: () => new Date(0) },
]

export default function Ventas({ accion, limpiarAccion }) {
  const { data } = useStore()
  const [pestana, setPestana] = useState('caja')
  const abierta = cajaAbierta(data.cajas)

  useEffect(() => {
    if (accion === 'caja' || accion === 'historial') setPestana(accion)
    if (accion) limpiarAccion()
  }, [accion])

  return (
    <div className="pagina">
      <div className="pagina-cab">
        <div>
          <p className="sobretitulo">{abierta ? `Caja N° ${abierta.numero} abierta` : 'Caja cerrada'}</p>
          <h1>Caja y ventas</h1>
        </div>
      </div>
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'caja'} className={pestana === 'caja' ? 'activo' : ''} onClick={() => setPestana('caja')}>
          <Wallet size={17} /> Caja del día
        </button>
        <button role="tab" aria-selected={pestana === 'historial'} className={pestana === 'historial' ? 'activo' : ''} onClick={() => setPestana('historial')}>
          <ListOrdered size={17} /> Historial de ventas
        </button>
      </div>
      {pestana === 'caja' ? <Caja /> : <HistorialVentas />}
    </div>
  )
}

function HistorialVentas() {
  const { data, anularVenta } = useStore()
  const { ventas, negocio } = data
  const m = negocio.moneda

  const [periodo, setPeriodo] = useState('hoy')
  const [detalle, setDetalle] = useState(null)
  const [confirmar, setConfirmar] = useState(false)

  const desde = PERIODOS.find((p) => p.id === periodo).desde()
  const lista = ventas.filter((v) => new Date(v.fecha) >= desde)
  const validas = lista.filter((v) => !v.anulada)
  const total = validas.reduce((s, v) => s + v.total, 0)
  const ganancia = validas.reduce((s, v) => s + gananciaVenta(v), 0)
  const servicios = validas.filter((v) => v.tipo === 'servicio').reduce((s, v) => s + v.total, 0)
  const porMetodo = METODOS_PAGO.map((x) => ({
    metodo: x, total: validas.filter((v) => v.metodo === x).reduce((s, v) => s + v.total, 0),
  })).filter((x) => x.total > 0)

  // Agrupar por día para que la lista se lea como un cuaderno de caja
  const grupos = []
  lista.forEach((v) => {
    const dia = new Date(v.fecha).toDateString()
    const g = grupos.find((x) => x.dia === dia)
    if (g) g.ventas.push(v)
    else grupos.push({ dia, fecha: v.fecha, ventas: [v] })
  })

  const abrir = (v) => { setDetalle(v); setConfirmar(false) }
  const actual = detalle && ventas.find((v) => v.id === detalle.id)

  return (
    <>
      <div className="segmentado">
        {PERIODOS.map((p) => (
          <button key={p.id} className={periodo === p.id ? 'activo' : ''} onClick={() => setPeriodo(p.id)}>{p.label}</button>
        ))}
      </div>

      <div className="kpis">
        <div className="kpi destacado">
          <span className="kpi-et">Total vendido</span>
          <strong>{dinero(total, m)}</strong>
          <small>{validas.length} operaciones</small>
        </div>
        <div className="kpi">
          <span className="kpi-et">Ganancia</span>
          <strong>{dinero(ganancia, m)}</strong>
          <small>{total ? Math.round((ganancia / total) * 100) : 0}% del total</small>
        </div>
        <div className="kpi">
          <span className="kpi-et">Servicio técnico</span>
          <strong>{dinero(servicios, m)}</strong>
          <small>reparaciones entregadas</small>
        </div>
        <div className="kpi">
          <span className="kpi-et">Por método de pago</span>
          <div className="metodos-resumen">
            {porMetodo.length === 0 ? <small>—</small> : porMetodo.map((x) => (
              <span key={x.metodo}><em>{x.metodo}</em>{dinero(x.total, m)}</span>
            ))}
          </div>
        </div>
      </div>

      {grupos.length === 0 && <p className="vacio tarjeta">No hay ventas en este periodo.</p>}
      {grupos.map((g) => (
        <section className="dia-grupo" key={g.dia}>
          <h2 className="dia-titulo">
            <span>{new Date(g.fecha).toDateString() === new Date().toDateString() ? 'Hoy' : fechaCorta(g.fecha)}</span>
            <span>{dinero(g.ventas.filter((v) => !v.anulada).reduce((s, v) => s + v.total, 0), m)}</span>
          </h2>
          <ul className="lista-ventas">
            {g.ventas.map((v) => (
              <li key={v.id}>
                <button className={v.anulada ? 'anulada' : ''} onClick={() => abrir(v)}>
                  <span className={`venta-ic ${v.tipo}`}>{v.tipo === 'servicio' ? <Wrench size={16} /> : <ShoppingBag size={16} />}</span>
                  <span className="venta-info">
                    <strong>{v.items.length === 1 ? v.items[0].nombre : `${v.items[0].nombre} y ${v.items.length - 1} más`}</strong>
                    <small>{codigoVenta(v)} · {hora(v.fecha)} · {v.metodo}{v.cliente ? ` · ${v.cliente}` : ''}{v.anulada ? ' · ANULADA' : ''}</small>
                  </span>
                  <span className="venta-total">{dinero(v.total, m)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {actual && (
        <Modal titulo={`Comprobante ${codigoVenta(actual)}`} onClose={() => setDetalle(null)} ancho={400}>
          <Ticket venta={actual} negocio={negocio} />
          {!actual.anulada && actual.tipo === 'venta' && (
            <div className="anular">
              {confirmar
                ? <button className="btn btn-peligro" onClick={() => { anularVenta(actual.id); setConfirmar(false) }}>Confirmar: anular y devolver stock</button>
                : <button className="enlace peligro" onClick={() => setConfirmar(true)}>Anular esta venta</button>}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
