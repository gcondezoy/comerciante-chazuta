import { useEffect, useState } from 'react'
import { Search, Plus, PackagePlus, Pencil, X, Boxes, Coins, AlertTriangle } from 'lucide-react'
import { useStore } from '../store'
import { dinero, colorCategoria } from '../utils'
import Modal from '../components/Modal'

const VACIO = { nombre: '', categoria: '', marca: '', codigo: '', imei: '', precio: '', costo: '', stock: '', stockMin: 3 }

export default function Inventario({ accion, limpiarAccion }) {
  const { data, guardarProducto, eliminarProducto, entradaStock } = useStore()
  const { productos, negocio } = data
  const m = negocio.moneda

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [soloBajo, setSoloBajo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [entrada, setEntrada] = useState(null)

  useEffect(() => {
    if (accion === 'nuevo') setEditando({ ...VACIO, categoria: negocio.categorias[0] || '' })
    if (accion === 'stockBajo') setSoloBajo(true)
    if (accion) limpiarAccion()
  }, [accion])

  const esBajo = (p) => p.stock <= (p.stockMin ?? 3)
  const texto = busqueda.trim().toLowerCase()
  const lista = productos.filter((p) =>
    (categoria === 'Todas' || p.categoria === categoria) &&
    (!soloBajo || esBajo(p)) &&
    `${p.nombre} ${p.marca} ${p.codigo} ${p.imei}`.toLowerCase().includes(texto))

  const valorCosto = productos.reduce((s, p) => s + p.costo * p.stock, 0)
  const valorVenta = productos.reduce((s, p) => s + p.precio * p.stock, 0)
  const unidades = productos.reduce((s, p) => s + p.stock, 0)
  const bajos = productos.filter(esBajo).length

  return (
    <div className="pagina">
      <div className="pagina-cab">
        <div>
          <p className="sobretitulo">{productos.length} productos · {unidades} unidades</p>
          <h1>Inventario</h1>
        </div>
        <button className="btn btn-pri" onClick={() => setEditando({ ...VACIO, categoria: negocio.categorias[0] || '' })}>
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      <div className="kpis kpis-3">
        <div className="kpi">
          <span className="kpi-et"><Coins size={16} /> Invertido en mercadería</span>
          <strong>{dinero(valorCosto, m)}</strong>
          <small>a precio de costo</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><Boxes size={16} /> Valor de venta</span>
          <strong>{dinero(valorVenta, m)}</strong>
          <small>ganancia posible {dinero(valorVenta - valorCosto, m)}</small>
        </div>
        <button className={`kpi kpi-boton ${soloBajo ? 'activo' : ''}`} onClick={() => setSoloBajo(!soloBajo)}>
          <span className="kpi-et"><AlertTriangle size={16} /> Por reponer</span>
          <strong>{bajos} productos</strong>
          <small>{soloBajo ? 'Mostrando solo estos · quitar filtro' : 'Toca para filtrar'}</small>
        </button>
      </div>

      <label className="buscador">
        <Search size={18} />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, marca, código o IMEI…" />
        {busqueda && <button onClick={() => setBusqueda('')} aria-label="Limpiar"><X size={16} /></button>}
      </label>
      <div className="chips desliza">
        {['Todas', ...negocio.categorias].map((c) => (
          <button key={c} className={`chip ${categoria === c ? 'activo' : ''}`} onClick={() => setCategoria(c)}>{c}</button>
        ))}
      </div>

      <div className="tabla-inv">
        <div className="tabla-inv-cab">
          <span>Producto</span><span>Categoría</span><span>Costo</span><span>Precio</span><span>Stock</span><span />
        </div>
        {lista.map((p) => (
          <div className="fila-inv" key={p.id}>
            <div className="fila-inv-nombre">
              <strong>{p.nombre}</strong>
              <small>
                {[p.marca, p.codigo && `Cód. ${p.codigo}`, p.imei && `IMEI ${p.imei}`].filter(Boolean).join(' · ') || '—'}
              </small>
            </div>
            <span className="fila-inv-cat">
              <i style={{ background: colorCategoria(p.categoria, negocio.categorias) }} />{p.categoria}
            </span>
            <span className="fila-inv-costo"><em>Costo</em>{dinero(p.costo, m)}</span>
            <span className="fila-inv-precio"><em>Precio</em><b>{dinero(p.precio, m)}</b></span>
            <span className="fila-inv-stock">
              <span className={`chip-stock ${p.stock === 0 ? 'agotado' : esBajo(p) ? 'bajo' : 'ok'}`}>
                {p.stock === 0 ? 'Agotado' : `${p.stock} und.`}
              </span>
            </span>
            <span className="fila-inv-acciones">
              <button className="btn btn-sec btn-peq" onClick={() => setEntrada({ producto: p, cantidad: '', costo: p.costo })}>
                <PackagePlus size={15} /> Entrada
              </button>
              <button className="btn-icono" onClick={() => setEditando(p)} aria-label="Editar"><Pencil size={17} /></button>
            </span>
          </div>
        ))}
        {lista.length === 0 && <p className="vacio">No hay productos con ese filtro.</p>}
      </div>

      {editando && (
        <FormProducto
          inicial={editando}
          negocio={negocio}
          onClose={() => setEditando(null)}
          onGuardar={(p) => { guardarProducto(p); setEditando(null) }}
          onEliminar={(id) => { eliminarProducto(id); setEditando(null) }}
        />
      )}

      {entrada && (
        <Modal titulo="Entrada de mercadería" onClose={() => setEntrada(null)} ancho={420}>
          <form className="form" onSubmit={(e) => {
            e.preventDefault()
            const cant = parseInt(entrada.cantidad, 10)
            if (!(cant > 0)) return
            entradaStock(entrada.producto.id, cant, Number(entrada.costo))
            setEntrada(null)
          }}>
            <p className="ayuda"><b>{entrada.producto.nombre}</b><br />Stock actual: {entrada.producto.stock} und.</p>
            <label>Cantidad que llegó<input autoFocus type="number" inputMode="numeric" min="1" value={entrada.cantidad} onChange={(e) => setEntrada({ ...entrada, cantidad: e.target.value })} /></label>
            <label>Costo unitario ({m})<input type="number" inputMode="decimal" min="0" step="0.01" value={entrada.costo} onChange={(e) => setEntrada({ ...entrada, costo: e.target.value })} /></label>
            {parseInt(entrada.cantidad, 10) > 0 && (
              <p className="ayuda">Nuevo stock: <b>{entrada.producto.stock + parseInt(entrada.cantidad, 10)} und.</b></p>
            )}
            <button className="btn btn-pri" type="submit">Registrar entrada</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function FormProducto({ inicial, negocio, onClose, onGuardar, onEliminar }) {
  const [f, setF] = useState(inicial)
  const [confirmar, setConfirmar] = useState(false)
  const cambiar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })
  const m = negocio.moneda
  const pideImei = negocio.modulos.imei && /celular/i.test(f.categoria)
  const margen = Number(f.precio) - Number(f.costo)

  const guardar = (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) return
    onGuardar({
      ...f,
      nombre: f.nombre.trim(),
      precio: Number(f.precio) || 0,
      costo: Number(f.costo) || 0,
      stock: parseInt(f.stock, 10) || 0,
      stockMin: parseInt(f.stockMin, 10) || 0,
    })
  }

  return (
    <Modal titulo={inicial.id ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} ancho={560}>
      <form className="form" onSubmit={guardar}>
        <label>Nombre del producto<input autoFocus value={f.nombre} onChange={cambiar('nombre')} placeholder="Ej. Arroz Costeño 5 kg" required /></label>
        <div className="form-2">
          <label>Categoría
            <select value={f.categoria} onChange={cambiar('categoria')}>
              {negocio.categorias.map((c) => <option key={c}>{c}</option>)}
              {!negocio.categorias.includes(f.categoria) && f.categoria && <option>{f.categoria}</option>}
            </select>
          </label>
          <label>Marca<input value={f.marca} onChange={cambiar('marca')} placeholder="Opcional" /></label>
        </div>
        <div className="form-2">
          <label>Precio de venta ({m})<input type="number" inputMode="decimal" min="0" step="0.01" value={f.precio} onChange={cambiar('precio')} required /></label>
          <label>Costo ({m})<input type="number" inputMode="decimal" min="0" step="0.01" value={f.costo} onChange={cambiar('costo')} /></label>
        </div>
        {f.precio !== '' && f.costo !== '' && (
          <p className={`ayuda ${margen < 0 ? 'error' : ''}`}>
            Ganancia por unidad: <b>{dinero(margen, m)}</b>{Number(f.costo) > 0 && ` (${Math.round((margen / Number(f.costo)) * 100)}%)`}
          </p>
        )}
        <div className="form-2">
          <label>Stock actual<input type="number" inputMode="numeric" min="0" value={f.stock} onChange={cambiar('stock')} /></label>
          <label>Avisar cuando queden<input type="number" inputMode="numeric" min="0" value={f.stockMin} onChange={cambiar('stockMin')} /></label>
        </div>
        <div className="form-2">
          <label>Código / código de barras<input value={f.codigo} onChange={cambiar('codigo')} placeholder="Opcional" /></label>
          {pideImei && <label>IMEI / N° de serie<input value={f.imei} onChange={cambiar('imei')} inputMode="numeric" placeholder="15 dígitos" /></label>}
        </div>
        <div className="form-acciones">
          {inicial.id && (confirmar
            ? <button type="button" className="btn btn-peligro" onClick={() => onEliminar(inicial.id)}>¿Seguro? Eliminar</button>
            : <button type="button" className="btn btn-sec" onClick={() => setConfirmar(true)}>Eliminar</button>)}
          <button className="btn btn-pri" type="submit">Guardar producto</button>
        </div>
      </form>
    </Modal>
  )
}
