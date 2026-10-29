import { useEffect, useState } from 'react'
import { Plus, Search, X, Phone, MessageCircle, Pencil, ArrowRight, CalendarClock, Smartphone } from 'lucide-react'
import { useStore, codigoRep } from '../store'
import { dinero, fechaCorta, linkWhatsApp, ESTADOS_REPARACION, METODOS_PAGO } from '../utils'
import Modal from '../components/Modal'
import Ticket from '../components/Ticket'

const VACIO = {
  cliente: '', telefono: '', equipo: '', imei: '', falla: '', accesorios: '', clave: '',
  presupuesto: '', adelanto: '', costoRepuestos: '', fechaEstimada: '', notas: '',
}

const SIGUIENTE = {
  recibido: { estado: 'reparando', texto: 'Empezar reparación' },
  reparando: { estado: 'listo', texto: 'Marcar como listo' },
  listo: { estado: 'entregado', texto: 'Entregar y cobrar' },
}

const mensajeCliente = (r, negocio) => {
  const saldo = (Number(r.presupuesto) || 0) - (Number(r.adelanto) || 0)
  const m = negocio.moneda
  if (r.estado === 'listo') {
    return `Hola ${r.cliente}, le saluda ${negocio.nombre}. Su ${r.equipo} (orden ${codigoRep(r)}) ya está *listo para recoger*. Saldo pendiente: ${dinero(saldo, m)}. ¡Le esperamos!`
  }
  if (r.estado === 'recibido') {
    return `Hola ${r.cliente}, le saluda ${negocio.nombre}. Recibimos su ${r.equipo} con orden *${codigoRep(r)}*.\nFalla: ${r.falla}\nPresupuesto: ${dinero(r.presupuesto, m)} · Adelanto: ${dinero(r.adelanto, m)}\nLe avisaremos cuando esté listo.`
  }
  return `Hola ${r.cliente}, le saluda ${negocio.nombre}. Le informamos que su ${r.equipo} (orden ${codigoRep(r)}) está en reparación.`
}

export default function Reparaciones({ accion, limpiarAccion }) {
  const { data, guardarReparacion, cambiarEstado, entregarReparacion, eliminarReparacion } = useStore()
  const { reparaciones, negocio } = data
  const m = negocio.moneda

  const [filtro, setFiltro] = useState('activas')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [entregando, setEntregando] = useState(null)
  const [ticket, setTicket] = useState(null)

  useEffect(() => {
    if (accion === 'nueva') setEditando({ ...VACIO })
    if (accion) limpiarAccion()
  }, [accion])

  const contar = (estado) => reparaciones.filter((r) => r.estado === estado).length
  const texto = busqueda.trim().toLowerCase()
  const lista = reparaciones
    .filter((r) => (filtro === 'activas' ? r.estado !== 'entregado' : filtro === 'todas' || r.estado === filtro))
    .filter((r) => `${codigoRep(r)} ${r.cliente} ${r.telefono} ${r.equipo} ${r.imei}`.toLowerCase().includes(texto))

  const avanzar = (r) => {
    const sig = SIGUIENTE[r.estado]
    if (!sig) return
    if (sig.estado === 'entregado') setEntregando({ rep: r, metodo: 'Efectivo' })
    else cambiarEstado(r.id, sig.estado)
  }

  return (
    <div className="pagina">
      <div className="pagina-cab">
        <div>
          <p className="sobretitulo">Servicio técnico</p>
          <h1>Reparaciones</h1>
        </div>
        <button className="btn btn-pri" onClick={() => setEditando({ ...VACIO })}><Plus size={18} /> Recibir equipo</button>
      </div>

      <div className="tablero-estados">
        {ESTADOS_REPARACION.slice(0, 3).map((e) => (
          <button key={e.id} className={`estado-caja estado-caja-${e.id} ${filtro === e.id ? 'activo' : ''}`} onClick={() => setFiltro(filtro === e.id ? 'activas' : e.id)}>
            <strong>{contar(e.id)}</strong>
            <span>{e.label}</span>
          </button>
        ))}
      </div>

      <label className="buscador">
        <Search size={18} />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por orden, cliente, celular o equipo…" />
        {busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar"><X size={16} /></button>}
      </label>
      <div className="chips desliza">
        {[['activas', 'En taller'], ...ESTADOS_REPARACION.map((e) => [e.id, e.corto]), ['todas', 'Todas']].map(([id, label]) => (
          <button key={id} className={`chip ${filtro === id ? 'activo' : ''}`} onClick={() => setFiltro(id)}>{label}</button>
        ))}
      </div>

      <div className="reparaciones">
        {lista.map((r) => {
          const saldo = (Number(r.presupuesto) || 0) - (Number(r.adelanto) || 0)
          const estado = ESTADOS_REPARACION.find((e) => e.id === r.estado)
          const sig = SIGUIENTE[r.estado]
          return (
            <article key={r.id} className={`rep rep-${r.estado}`}>
              <header className="rep-cab">
                <span className="rep-codigo">{codigoRep(r)}</span>
                <span className={`estado estado-${r.estado}`}>{estado?.label}</span>
              </header>
              <h3><Smartphone size={17} /> {r.equipo}</h3>
              <p className="rep-falla">{r.falla}</p>
              <div className="rep-cliente">
                <span>{r.cliente}</span>
                {r.telefono && <a href={`tel:${r.telefono}`}><Phone size={14} /> {r.telefono}</a>}
              </div>
              <dl className="rep-montos">
                <div><dt>Presupuesto</dt><dd>{dinero(r.presupuesto, m)}</dd></div>
                <div><dt>Adelanto</dt><dd>{dinero(r.adelanto, m)}</dd></div>
                <div><dt>{r.estado === 'entregado' ? 'Cobrado' : 'Saldo'}</dt><dd className={saldo > 0 && r.estado !== 'entregado' ? 'saldo' : ''}>{dinero(r.estado === 'entregado' ? r.presupuesto : saldo, m)}</dd></div>
              </dl>
              <p className="rep-fechas">
                <CalendarClock size={14} /> Ingresó {fechaCorta(r.fecha)}
                {r.estado === 'entregado' && r.fechaEntrega ? ` · entregado ${fechaCorta(r.fechaEntrega)}` : r.fechaEstimada ? ` · entrega aprox. ${fechaCorta(r.fechaEstimada)}` : ''}
              </p>
              <footer className="rep-acciones">
                {sig && <button className={`btn btn-peq ${sig.estado === 'entregado' ? 'btn-pri' : 'btn-sec'}`} onClick={() => avanzar(r)}>{sig.texto} <ArrowRight size={15} /></button>}
                {r.telefono && r.estado !== 'entregado' && (
                  <a className="btn-icono wsp" href={linkWhatsApp(r.telefono, mensajeCliente(r, negocio))} target="_blank" rel="noreferrer" aria-label="Avisar por WhatsApp" title="Avisar por WhatsApp">
                    <MessageCircle size={18} />
                  </a>
                )}
                <button className="btn-icono" onClick={() => setEditando(r)} aria-label="Editar"><Pencil size={17} /></button>
              </footer>
            </article>
          )
        })}
        {lista.length === 0 && <p className="vacio">No hay reparaciones en esta vista.</p>}
      </div>

      {editando && (
        <FormReparacion
          inicial={editando}
          negocio={negocio}
          onClose={() => setEditando(null)}
          onGuardar={(r) => { guardarReparacion(r); setEditando(null) }}
          onEliminar={(id) => { eliminarReparacion(id); setEditando(null) }}
        />
      )}

      {entregando && (() => {
        const r = entregando.rep
        const saldo = (Number(r.presupuesto) || 0) - (Number(r.adelanto) || 0)
        return (
          <Modal titulo={`Entregar ${codigoRep(r)}`} onClose={() => setEntregando(null)} ancho={420}>
            <div className="form">
              <p className="ayuda"><b>{r.equipo}</b> · {r.cliente}</p>
              <div className="resumen-cobro">
                <div><span>Presupuesto</span><span>{dinero(r.presupuesto, m)}</span></div>
                <div><span>Adelanto</span><span>− {dinero(r.adelanto, m)}</span></div>
                <div className="total"><span>Cobrar ahora</span><span>{dinero(saldo, m)}</span></div>
              </div>
              <span className="etiqueta">Método de pago</span>
              <div className="metodos">
                {METODOS_PAGO.map((x) => (
                  <button key={x} type="button" className={`metodo ${entregando.metodo === x ? 'activo' : ''}`} onClick={() => setEntregando({ ...entregando, metodo: x })}>{x}</button>
                ))}
              </div>
              <button className="btn btn-pri btn-grande" onClick={() => {
                const venta = entregarReparacion(r.id, entregando.metodo)
                setEntregando(null)
                if (venta) setTicket({ venta, telefono: r.telefono })
              }}>Confirmar entrega</button>
            </div>
          </Modal>
        )
      })()}

      {ticket && (
        <Modal titulo="Equipo entregado" onClose={() => setTicket(null)} ancho={400}>
          <Ticket venta={ticket.venta} negocio={negocio} telefono={ticket.telefono} />
        </Modal>
      )}
    </div>
  )
}

function FormReparacion({ inicial, negocio, onClose, onGuardar, onEliminar }) {
  const [f, setF] = useState({ ...inicial, fechaEstimada: inicial.fechaEstimada ? inicial.fechaEstimada.slice(0, 10) : '' })
  const [confirmar, setConfirmar] = useState(false)
  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })
  const m = negocio.moneda
  const saldo = (Number(f.presupuesto) || 0) - (Number(f.adelanto) || 0)

  const guardar = (e) => {
    e.preventDefault()
    if (!f.cliente.trim() || !f.equipo.trim()) return
    onGuardar({
      ...f,
      presupuesto: Number(f.presupuesto) || 0,
      adelanto: Number(f.adelanto) || 0,
      costoRepuestos: Number(f.costoRepuestos) || 0,
      fechaEstimada: f.fechaEstimada ? new Date(`${f.fechaEstimada}T12:00:00`).toISOString() : '',
    })
  }

  return (
    <Modal titulo={inicial.id ? `Orden ${codigoRep(inicial)}` : 'Recibir equipo'} onClose={onClose} ancho={580}>
      <form className="form" onSubmit={guardar}>
        <div className="form-2">
          <label>Cliente<input autoFocus value={f.cliente} onChange={cambiar('cliente')} placeholder="Nombre" required /></label>
          <label>Celular<input value={f.telefono} onChange={cambiar('telefono')} inputMode="tel" placeholder="9XX XXX XXX" /></label>
        </div>
        <div className="form-2">
          <label>Equipo<input value={f.equipo} onChange={cambiar('equipo')} placeholder="Ej. Samsung A14" required /></label>
          <label>IMEI / serie<input value={f.imei} onChange={cambiar('imei')} placeholder="Opcional" /></label>
        </div>
        <label>Falla que reporta el cliente<textarea rows="2" value={f.falla} onChange={cambiar('falla')} placeholder="Ej. No enciende, pantalla rota…" /></label>
        <div className="form-2">
          <label>Deja con el equipo<input value={f.accesorios} onChange={cambiar('accesorios')} placeholder="Chip, case, cargador…" /></label>
          <label>Clave / patrón<input value={f.clave} onChange={cambiar('clave')} placeholder="Opcional" /></label>
        </div>
        <div className="form-3">
          <label>Presupuesto ({m})<input type="number" inputMode="decimal" min="0" step="0.5" value={f.presupuesto} onChange={cambiar('presupuesto')} /></label>
          <label>Adelanto ({m})<input type="number" inputMode="decimal" min="0" step="0.5" value={f.adelanto} onChange={cambiar('adelanto')} /></label>
          <label>Costo repuesto ({m})<input type="number" inputMode="decimal" min="0" step="0.5" value={f.costoRepuestos} onChange={cambiar('costoRepuestos')} /></label>
        </div>
        {f.presupuesto !== '' && <p className="ayuda">Saldo a cobrar al entregar: <b>{dinero(saldo, m)}</b></p>}
        <div className="form-2">
          <label>Entrega aproximada<input type="date" value={f.fechaEstimada} onChange={cambiar('fechaEstimada')} /></label>
          {inicial.id && (
            <label>Estado
              <select value={f.estado} onChange={cambiar('estado')}>
                {ESTADOS_REPARACION.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </label>
          )}
        </div>
        <label>Notas internas<textarea rows="2" value={f.notas} onChange={cambiar('notas')} placeholder="Diagnóstico, repuestos pedidos…" /></label>
        <div className="form-acciones">
          {inicial.id && (confirmar
            ? <button type="button" className="btn btn-peligro" onClick={() => onEliminar(inicial.id)}>¿Seguro? Eliminar</button>
            : <button type="button" className="btn btn-sec" onClick={() => setConfirmar(true)}>Eliminar</button>)}
          <button className="btn btn-pri" type="submit">{inicial.id ? 'Guardar cambios' : 'Registrar equipo'}</button>
        </div>
      </form>
    </Modal>
  )
}
