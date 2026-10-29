import { useState } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, ChevronUp, X, PenLine } from 'lucide-react'
import { useStore } from '../store'
import { dinero, totalVenta, colorCategoria, METODOS_PAGO, uid } from '../utils'
import Modal from '../components/Modal'
import Ticket from '../components/Ticket'

export default function Vender() {
  const { data, registrarVenta } = useStore()
  const { productos, negocio } = data
  const m = negocio.moneda

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [carrito, setCarrito] = useState([])
  const [metodo, setMetodo] = useState('Efectivo')
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [recibido, setRecibido] = useState('')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [libre, setLibre] = useState(null)
  const [ticket, setTicket] = useState(null)

  const texto = busqueda.trim().toLowerCase()
  const filtrados = productos.filter((p) =>
    (categoria === 'Todas' || p.categoria === categoria) &&
    `${p.nombre} ${p.marca} ${p.codigo} ${p.imei}`.toLowerCase().includes(texto))

  const cantEnCarrito = (id) => carrito.find((i) => i.productoId === id)?.cant || 0

  const agregar = (p) => {
    if (cantEnCarrito(p.id) >= p.stock) return
    setCarrito((c) => (c.some((i) => i.productoId === p.id)
      ? c.map((i) => (i.productoId === p.id ? { ...i, cant: i.cant + 1 } : i))
      : [...c, { clave: p.id, productoId: p.id, nombre: p.nombre, precio: p.precio, costo: p.costo, cant: 1, max: p.stock }]))
  }

  const cambiarCant = (clave, delta) => setCarrito((c) => c
    .map((i) => (i.clave === clave ? { ...i, cant: Math.min(i.max, i.cant + delta) } : i))
    .filter((i) => i.cant > 0))

  const agregarLibre = (e) => {
    e.preventDefault()
    const precio = Number(libre.precio)
    if (!libre.nombre.trim() || !(precio > 0)) return
    setCarrito((c) => [...c, { clave: uid(), productoId: null, nombre: libre.nombre.trim(), precio, costo: 0, cant: 1, max: 999 }])
    setLibre(null)
  }

  const total = totalVenta(carrito)
  const unidades = carrito.reduce((s, i) => s + i.cant, 0)
  const vuelto = Number(recibido) - total

  const cobrar = () => {
    if (!carrito.length) return
    const venta = registrarVenta({
      items: carrito.map(({ clave, max, ...i }) => i),
      metodo,
      cliente: cliente.trim(),
      recibido: metodo === 'Efectivo' && Number(recibido) >= total ? Number(recibido) : null,
    })
    setTicket({ venta, telefono })
    setCarrito([]); setCliente(''); setTelefono(''); setRecibido(''); setMetodo('Efectivo'); setCarritoAbierto(false)
  }

  return (
    <div className="pos">
      <section className="pos-catalogo">
        <div className="pagina-cab compacta">
          <h1>Vender</h1>
          <button className="btn btn-sec btn-peq" onClick={() => setLibre({ nombre: '', precio: '' })}>
            <PenLine size={16} /> Monto libre
          </button>
        </div>
        <label className="buscador">
          <Search size={18} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto, marca o IMEI…" />
          {busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar"><X size={16} /></button>}
        </label>
        <div className="chips desliza">
          {['Todas', ...negocio.categorias].map((c) => (
            <button key={c} className={`chip ${categoria === c ? 'activo' : ''}`} onClick={() => setCategoria(c)}>{c}</button>
          ))}
        </div>

        <div className="productos-grid">
          {filtrados.map((p) => {
            const enCarrito = cantEnCarrito(p.id)
            const disponible = p.stock - enCarrito
            return (
              <button key={p.id} className={`producto ${p.stock === 0 ? 'agotado' : ''} ${enCarrito ? 'en-carrito' : ''}`} onClick={() => agregar(p)} disabled={disponible <= 0}>
                <span className="producto-cat" style={{ color: colorCategoria(p.categoria, negocio.categorias) }}>
                  <i style={{ background: colorCategoria(p.categoria, negocio.categorias) }} />{p.categoria}
                </span>
                <span className="producto-nombre">{p.nombre}</span>
                <span className="producto-pie">
                  <strong>{dinero(p.precio, m)}</strong>
                  <small className={p.stock <= (p.stockMin ?? 3) ? 'bajo' : ''}>{p.stock === 0 ? 'Agotado' : `${disponible} disp.`}</small>
                </span>
                {enCarrito > 0 && <em className="producto-cant">{enCarrito}</em>}
              </button>
            )
          })}
          {filtrados.length === 0 && <p className="vacio">No se encontraron productos.</p>}
        </div>
      </section>

      {carrito.length > 0 && !carritoAbierto && (
        <button className="carrito-flotante" onClick={() => setCarritoAbierto(true)}>
          <span><ShoppingCart size={19} /> {unidades} {unidades === 1 ? 'producto' : 'productos'}</span>
          <strong>{dinero(total, m)} <ChevronUp size={18} /></strong>
        </button>
      )}

      {carritoAbierto && <div className="carrito-velo" onClick={() => setCarritoAbierto(false)} />}
      <aside className={`carrito ${carritoAbierto ? 'abierto' : ''}`}>
        <header className="carrito-cab">
          <h2><ShoppingCart size={19} /> Venta actual</h2>
          {carrito.length > 0 && <button className="enlace peligro" onClick={() => setCarrito([])}>Vaciar</button>}
          <button className="btn-icono solo-movil" onClick={() => setCarritoAbierto(false)} aria-label="Cerrar"><X size={20} /></button>
        </header>

        {carrito.length === 0 ? (
          <div className="carrito-vacio">
            <ShoppingCart size={34} />
            <p>Toca un producto para agregarlo a la venta.</p>
          </div>
        ) : (
          <>
            <ul className="carrito-items">
              {carrito.map((i) => (
                <li key={i.clave}>
                  <div className="carrito-item-info">
                    <span>{i.nombre}</span>
                    <small>{dinero(i.precio, m)} c/u</small>
                  </div>
                  <div className="contador">
                    <button onClick={() => cambiarCant(i.clave, -1)} aria-label="Quitar uno">{i.cant === 1 ? <Trash2 size={15} /> : <Minus size={15} />}</button>
                    <span>{i.cant}</span>
                    <button onClick={() => cambiarCant(i.clave, 1)} disabled={i.cant >= i.max} aria-label="Agregar uno"><Plus size={15} /></button>
                  </div>
                  <strong className="carrito-item-total">{dinero(i.precio * i.cant, m)}</strong>
                </li>
              ))}
            </ul>

            <div className="carrito-cobro">
              <div className="campos-fila">
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente (opcional)" />
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Celular (opcional)" inputMode="tel" />
              </div>
              <div className="metodos">
                {METODOS_PAGO.map((x) => (
                  <button key={x} className={`metodo ${metodo === x ? 'activo' : ''}`} onClick={() => setMetodo(x)}>{x}</button>
                ))}
              </div>
              {metodo === 'Efectivo' && (
                <div className="efectivo">
                  <label>
                    <span>Paga con</span>
                    <input type="number" inputMode="decimal" min="0" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0.00" />
                  </label>
                  <div className="billetes">
                    {[10, 20, 50, 100, 200].filter((b) => b >= total).slice(0, 3).map((b) => (
                      <button key={b} onClick={() => setRecibido(String(b))}>{m} {b}</button>
                    ))}
                  </div>
                  {recibido !== '' && (
                    <p className={`vuelto ${vuelto < 0 ? 'falta' : ''}`}>
                      {vuelto < 0 ? `Faltan ${dinero(-vuelto, m)}` : <>Vuelto: <b>{dinero(vuelto, m)}</b></>}
                    </p>
                  )}
                </div>
              )}
              <div className="carrito-total"><span>Total</span><strong>{dinero(total, m)}</strong></div>
              <button className="btn btn-pri btn-grande" onClick={cobrar} disabled={metodo === 'Efectivo' && recibido !== '' && vuelto < 0}>
                Cobrar {dinero(total, m)}
              </button>
            </div>
          </>
        )}
      </aside>

      {libre && (
        <Modal titulo="Agregar monto libre" onClose={() => setLibre(null)} ancho={420}>
          <form className="form" onSubmit={agregarLibre}>
            <p className="ayuda">Para cosas que no están en el inventario: un servicio, una recarga, un producto suelto…</p>
            <label>Descripción<input autoFocus value={libre.nombre} onChange={(e) => setLibre({ ...libre, nombre: e.target.value })} placeholder="Ej. Recarga Claro, instalación de mica" /></label>
            <label>Precio ({m})<input type="number" inputMode="decimal" min="0" step="0.1" value={libre.precio} onChange={(e) => setLibre({ ...libre, precio: e.target.value })} /></label>
            <button className="btn btn-pri" type="submit">Agregar a la venta</button>
          </form>
        </Modal>
      )}

      {ticket && (
        <Modal titulo="¡Venta registrada!" onClose={() => setTicket(null)} ancho={400}>
          <Ticket venta={ticket.venta} negocio={negocio} telefono={ticket.telefono} />
        </Modal>
      )}
    </div>
  )
}
