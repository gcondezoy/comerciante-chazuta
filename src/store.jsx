import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { datosDemo, datosVacios } from './seed'
import { uid, totalVenta } from './utils'
import { useSincronizacion } from './sincronizacion'

// Todo se guarda primero en el equipo (localStorage), así se puede vender sin internet.
// Si hay cuenta en la nube, useSincronizacion sube los cambios a Supabase cuando vuelve la señal.
const CLAVE = 'ventas-chazuta-v1'
const Ctx = createContext(null)

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return JSON.parse(guardado)
  } catch { /* sin almacenamiento disponible */ }
  return datosDemo()
}

const descontarStock = (productos, items, signo) =>
  productos.map((p) => {
    const it = items.find((i) => i.productoId === p.id)
    return it ? { ...p, stock: Math.max(0, p.stock + signo * it.cant) } : p
  })

export function StoreProvider({ children }) {
  const [data, setData] = useState(cargar)

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(data)) } catch { /* ignorar */ }
  }, [data])

  const nube = useSincronizacion(data, setData)

  const api = useMemo(() => ({
    data,
    nube,

    actualizarNegocio: (cambios) => setData((d) => ({ ...d, negocio: { ...d.negocio, ...cambios } })),

    guardarProducto: (prod) => setData((d) => prod.id
      ? { ...d, productos: d.productos.map((x) => (x.id === prod.id ? { ...x, ...prod } : x)) }
      : { ...d, productos: [{ ...prod, id: uid() }, ...d.productos] }),

    eliminarProducto: (id) => setData((d) => ({ ...d, productos: d.productos.filter((x) => x.id !== id) })),

    entradaStock: (id, cantidad, costo) => setData((d) => ({
      ...d,
      productos: d.productos.map((x) => (x.id === id
        ? { ...x, stock: x.stock + cantidad, costo: costo != null ? costo : x.costo }
        : x)),
    })),

    registrarVenta: ({ items, metodo, cliente, recibido }) => {
      const venta = {
        id: uid(), numero: data.contadores.venta + 1, tipo: 'venta', fecha: new Date().toISOString(),
        items, total: totalVenta(items), metodo, cliente, recibido,
      }
      setData((d) => ({
        ...d,
        contadores: { ...d.contadores, venta: d.contadores.venta + 1 },
        ventas: [venta, ...d.ventas],
        productos: descontarStock(d.productos, items, -1),
      }))
      return venta
    },

    anularVenta: (id) => setData((d) => {
      const v = d.ventas.find((x) => x.id === id)
      if (!v || v.anulada) return d
      return {
        ...d,
        ventas: d.ventas.map((x) => (x.id === id ? { ...x, anulada: true } : x)),
        productos: descontarStock(d.productos, v.items, +1),
      }
    }),

    guardarReparacion: (rep) => {
      if (rep.id) {
        setData((d) => ({ ...d, reparaciones: d.reparaciones.map((x) => (x.id === rep.id ? { ...x, ...rep } : x)) }))
        return rep
      }
      const nueva = { ...rep, id: uid(), numero: data.contadores.reparacion + 1, fecha: new Date().toISOString(), estado: 'recibido' }
      setData((d) => ({
        ...d,
        contadores: { ...d.contadores, reparacion: d.contadores.reparacion + 1 },
        reparaciones: [nueva, ...d.reparaciones],
      }))
      return nueva
    },

    cambiarEstado: (id, estado) => setData((d) => ({
      ...d, reparaciones: d.reparaciones.map((x) => (x.id === id ? { ...x, estado } : x)),
    })),

    eliminarReparacion: (id) => setData((d) => ({ ...d, reparaciones: d.reparaciones.filter((x) => x.id !== id) })),

    // Al entregar, el servicio completo entra como ingreso del día
    entregarReparacion: (id, metodo) => {
      const r = data.reparaciones.find((x) => x.id === id)
      if (!r) return null
      const venta = {
        id: uid(), numero: data.contadores.venta + 1, tipo: 'servicio', fecha: new Date().toISOString(),
        items: [{ productoId: null, nombre: `Reparación ${codigoRep(r)} · ${r.equipo}`, precio: Number(r.presupuesto) || 0, costo: Number(r.costoRepuestos) || 0, cant: 1 }],
        total: Number(r.presupuesto) || 0, adelanto: Number(r.adelanto) || 0, metodo, cliente: r.cliente, reparacionId: r.id,
      }
      setData((d) => ({
        ...d,
        contadores: { ...d.contadores, venta: d.contadores.venta + 1 },
        ventas: [venta, ...d.ventas],
        reparaciones: d.reparaciones.map((x) => (x.id === id ? { ...x, estado: 'entregado', fechaEntrega: venta.fecha } : x)),
      }))
      return venta
    },

    marcarRespaldo: () => setData((d) => ({ ...d, ultimoRespaldo: new Date().toISOString() })),

    restaurarDemo: () => setData(datosDemo()),
    empezarVacio: () => setData((d) => datosVacios(d.negocio)),
    importar: (json) => setData(json),
  }), [data, nube])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export const codigoRep = (r) => `R-${String(r.numero).padStart(4, '0')}`
export const codigoVenta = (v) => `${v.tipo === 'servicio' ? 'S' : 'V'}-${String(v.numero).padStart(5, '0')}`
