import { ShoppingCart, Wrench, PackagePlus, AlertTriangle, TrendingUp, Wallet, Receipt, ChevronRight, ShieldCheck } from 'lucide-react'
import { useStore, codigoRep } from '../store'
import { diasDesde } from '../pwa'
import { dinero, mismoDia, fechaLarga, gananciaVenta, desdeHace } from '../utils'

export default function Inicio({ ir }) {
  const { data } = useStore()
  const { negocio, ventas, productos, reparaciones } = data
  const m = negocio.moneda
  const ahora = new Date()

  const validas = ventas.filter((v) => !v.anulada)
  const deHoy = validas.filter((v) => mismoDia(v.fecha, ahora))
  const totalHoy = deHoy.reduce((s, v) => s + v.total, 0)
  const gananciaHoy = deHoy.reduce((s, v) => s + gananciaVenta(v), 0)

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = desdeHace(6 - i)
    const total = validas.filter((v) => mismoDia(v.fecha, fecha)).reduce((s, v) => s + v.total, 0)
    return { fecha, total }
  })
  const maximo = Math.max(...dias.map((d) => d.total), 1)
  const semana = dias.reduce((s, d) => s + d.total, 0)

  const stockBajo = productos.filter((p) => p.stock <= (p.stockMin ?? 3)).sort((a, b) => a.stock - b.stock)
  const activas = reparaciones.filter((r) => r.estado !== 'entregado')
  const listas = reparaciones.filter((r) => r.estado === 'listo')

  const conteo = {}
  validas.filter((v) => new Date(v.fecha) >= desdeHace(6)).forEach((v) => v.items.forEach((i) => {
    conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cant
  }))
  const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const diasRespaldo = diasDesde(data.ultimoRespaldo)
  const pedirRespaldo = ventas.length > 0 && (diasRespaldo == null || diasRespaldo > 7)

  return (
    <div className="pagina">
      <div className="pagina-cab">
        <div>
          <p className="sobretitulo">{fechaLarga(ahora)}</p>
          <h1>Resumen del negocio</h1>
        </div>
      </div>

      {pedirRespaldo && (
        <button className="aviso-respaldo" onClick={() => ir('ajustes')}>
          <ShieldCheck size={20} />
          <span>
            <b>{diasRespaldo == null ? 'Aún no hay respaldo de tus datos.' : `Tu último respaldo fue hace ${diasRespaldo} días.`}</b>
            {' '}Guarda una copia por si el equipo se pierde o se malogra.
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      <div className="accesos">
        <button className="acceso principal" onClick={() => ir('vender')}>
          <ShoppingCart size={22} /> <span>Nueva venta</span>
        </button>
        {negocio.modulos.reparaciones && (
          <button className="acceso" onClick={() => ir('reparaciones', 'nueva')}>
            <Wrench size={20} /> <span>Recibir equipo</span>
          </button>
        )}
        <button className="acceso" onClick={() => ir('inventario', 'nuevo')}>
          <PackagePlus size={20} /> <span>Agregar producto</span>
        </button>
      </div>

      <div className="kpis">
        <div className="kpi destacado">
          <span className="kpi-et"><Wallet size={16} /> Vendido hoy</span>
          <strong>{dinero(totalHoy, m)}</strong>
          <small>{deHoy.length} {deHoy.length === 1 ? 'venta' : 'ventas'}</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><TrendingUp size={16} /> Ganancia hoy</span>
          <strong>{dinero(gananciaHoy, m)}</strong>
          <small>precio − costo</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><Receipt size={16} /> Últimos 7 días</span>
          <strong>{dinero(semana, m)}</strong>
          <small>promedio {dinero(semana / 7, m)}/día</small>
        </div>
        {negocio.modulos.reparaciones && (
          <div className="kpi">
            <span className="kpi-et"><Wrench size={16} /> Reparaciones</span>
            <strong>{activas.length} activas</strong>
            <small>{listas.length} listas para entregar</small>
          </div>
        )}
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <h2>Ventas de la semana</h2>
          <div className="grafico">
            {dias.map((d, i) => (
              <div className="grafico-col" key={i} title={dinero(d.total, m)}>
                <span className="grafico-valor">{d.total ? Math.round(d.total) : ''}</span>
                <div className="grafico-barra-fondo">
                  <div className={`grafico-barra ${i === 6 ? 'hoy' : ''}`} style={{ height: `${(d.total / maximo) * 100}%` }} />
                </div>
                <span className="grafico-dia">{i === 6 ? 'Hoy' : d.fecha.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="tarjeta">
          <h2>Lo más vendido <small>7 días</small></h2>
          {top.length === 0 ? <p className="vacio">Aún no hay ventas.</p> : (
            <ol className="ranking">
              {top.map(([nombre, cant], i) => (
                <li key={nombre}>
                  <span className="ranking-n">{i + 1}</span>
                  <span className="ranking-nombre">{nombre}</span>
                  <span className="ranking-cant">{cant} und.</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <h2><AlertTriangle size={18} className="ic-alerta" /> Stock bajo <small>{stockBajo.length}</small></h2>
          {stockBajo.length === 0 ? <p className="vacio">Todo el inventario está bien abastecido.</p> : (
            <ul className="lista-simple">
              {stockBajo.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  <span className={`chip-stock ${p.stock === 0 ? 'agotado' : 'bajo'}`}>{p.stock === 0 ? 'Agotado' : `Quedan ${p.stock}`}</span>
                </li>
              ))}
            </ul>
          )}
          {stockBajo.length > 0 && (
            <button className="enlace" onClick={() => ir('inventario', 'stockBajo')}>Ver en inventario <ChevronRight size={16} /></button>
          )}
        </section>

        {negocio.modulos.reparaciones && (
          <section className="tarjeta">
            <h2><Wrench size={18} /> Equipos en taller <small>{activas.length}</small></h2>
            {activas.length === 0 ? <p className="vacio">No hay equipos pendientes.</p> : (
              <ul className="lista-simple">
                {activas.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <span><b>{codigoRep(r)}</b> {r.equipo} · {r.cliente}</span>
                    <span className={`estado estado-${r.estado}`}>{r.estado === 'listo' ? 'Listo' : r.estado === 'reparando' ? 'Reparando' : 'Recibido'}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="enlace" onClick={() => ir('reparaciones')}>Ir a reparaciones <ChevronRight size={16} /></button>
          </section>
        )}
      </div>
    </div>
  )
}
