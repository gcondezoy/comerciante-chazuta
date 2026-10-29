import { useCallback, useEffect, useRef, useState } from 'react'
import { datosVacios } from './seed'
import {
  supabase, nubeConfigurada, COLECCIONES, registroConfig,
  ingresar, salir, contarRegistros, subir, bajar, esErrorDeSesion,
} from './nube'

// Sincronización "offline-first":
// 1. Cada cambio local se anota en una cola de pendientes (guardada en el equipo).
// 2. Cuando hay internet, la cola se sube sola a Supabase y luego se bajan los cambios de otros equipos.
// 3. Si no hay señal, la cola espera y se reintenta sola: el vendedor no tiene que hacer nada.
const CLAVE_PENDIENTES = 'ventas-chazuta-pendientes'
const CLAVE_CUENTA = 'ventas-chazuta-cuenta'
const REINTENTO_MS = 30000
const REVISION_MS = 60000
const SOLAPE_MS = 10000

const leer = (clave, defecto) => {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto } catch { return defecto }
}
const escribir = (clave, valor) => {
  try { valor == null ? localStorage.removeItem(clave) : localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* ignorar */ }
}

// Postgres reordena las claves del JSON, así que se compara sin importar el orden
const ordenado = (v) => (Array.isArray(v) ? v.map(ordenado)
  : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = ordenado(v[k]); return o }, {})
  : v)
const iguales = (a, b) => JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b))

const ms = (iso) => new Date(iso).getTime()
const sinRed = (e) => !navigator.onLine || /failed to fetch|network|load failed|fetch/i.test(e?.message || '')

const ordenar = (d) => ({
  ...d,
  productos: [...d.productos].sort((a, b) => a.nombre.localeCompare(b.nombre)),
  ventas: [...d.ventas].sort((a, b) => ms(b.fecha) - ms(a.fecha)),
  reparaciones: [...d.reparaciones].sort((a, b) => b.numero - a.numero),
})

function construirDesdeNube(filas, local) {
  const d = datosVacios(local.negocio)
  for (const f of filas) {
    if (f.eliminado || !f.datos) continue
    if (f.tipo === 'config') {
      d.negocio = { ...d.negocio, ...f.datos.negocio }
      d.contadores = { ...d.contadores, ...f.datos.contadores }
      if (f.datos.ultimoRespaldo) d.ultimoRespaldo = f.datos.ultimoRespaldo
    } else if (d[f.tipo]) {
      d[f.tipo].push(f.datos)
    }
  }
  return ordenar(d)
}

const todasLasClaves = (d, t) => {
  const pend = { 'config/negocio': { t } }
  for (const tipo of COLECCIONES) for (const x of d[tipo]) pend[`${tipo}/${x.id}`] = { t }
  return pend
}

export function useSincronizacion(data, setData) {
  const [pendientes, setPendientes] = useState(() => leer(CLAVE_PENDIENTES, {}))
  const [cuenta, setCuenta] = useState(() => leer(CLAVE_CUENTA, null))
  const [estado, setEstado] = useState({ fase: 'inactivo', error: null })

  const dataRef = useRef(data)
  const pendRef = useRef(pendientes)
  const cuentaRef = useRef(cuenta)
  dataRef.current = data
  pendRef.current = pendientes
  cuentaRef.current = cuenta

  const anterior = useRef(data)
  const remotos = useRef(new WeakSet())   // objetos que llegaron de la nube (no se vuelven a subir)
  const borradosRemotos = useRef(new Set())
  const respaldoRemoto = useRef(data.ultimoRespaldo)
  const saltarDiff = useRef(null)          // reemplazos completos que no cuentan como cambios
  const corriendo = useRef(false)
  const otraVez = useRef(false)
  const temporizador = useRef(null)
  const sincronizarRef = useRef(null)

  useEffect(() => { escribir(CLAVE_PENDIENTES, pendientes) }, [pendientes])
  useEffect(() => { escribir(CLAVE_CUENTA, cuenta) }, [cuenta])

  const programar = useCallback((espera = 1500) => {
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => sincronizarRef.current?.(), espera)
  }, [])

  // Detecta qué registros cambiaron comparando referencias (los cambios son inmutables)
  useEffect(() => {
    const a = anterior.current
    anterior.current = data
    if (a === data) return
    if (saltarDiff.current === data) { saltarDiff.current = null; return }
    if (!cuentaRef.current) return

    const t = new Date().toISOString()
    const cambios = {}
    for (const tipo of COLECCIONES) {
      const previos = new Map(a[tipo].map((x) => [x.id, x]))
      for (const x of data[tipo]) {
        if (previos.get(x.id) !== x && !remotos.current.has(x)) cambios[`${tipo}/${x.id}`] = { t }
        previos.delete(x.id)
      }
      for (const id of previos.keys()) {
        const clave = `${tipo}/${id}`
        if (!borradosRemotos.current.has(clave)) cambios[clave] = { t, eliminado: true }
      }
    }
    const cambioConfig =
      (a.negocio !== data.negocio && !remotos.current.has(data.negocio)) ||
      (a.contadores !== data.contadores && !remotos.current.has(data.contadores)) ||
      (a.ultimoRespaldo !== data.ultimoRespaldo && data.ultimoRespaldo !== respaldoRemoto.current)
    if (cambioConfig) cambios['config/negocio'] = { t }
    borradosRemotos.current.clear()

    if (Object.keys(cambios).length) {
      setPendientes((p) => ({ ...p, ...cambios }))
      programar()
    }
  }, [data, programar])

  const aplicarRemotos = (filas) => {
    const pend = pendRef.current
    // Gana el cambio más reciente: si aquí hay uno sin subir y es más nuevo, se conserva el local
    const ganan = filas.filter((f) => {
      const p = pend[`${f.tipo}/${f.id}`]
      return !p || ms(p.t) <= ms(f.actualizado)
    })
    if (!ganan.length) return

    setPendientes((p) => {
      const n = { ...p }
      for (const f of ganan) {
        const clave = `${f.tipo}/${f.id}`
        if (n[clave] && ms(n[clave].t) <= ms(f.actualizado)) delete n[clave]
      }
      return n
    })

    setData((d) => {
      let nd = d
      for (const f of ganan) {
        if (f.tipo === 'config') {
          if (f.eliminado || !f.datos || iguales(registroConfig(nd), f.datos)) continue
          const negocio = { ...nd.negocio, ...f.datos.negocio }
          const contadores = {
            venta: Math.max(nd.contadores.venta, f.datos.contadores?.venta || 0),
            reparacion: Math.max(nd.contadores.reparacion, f.datos.contadores?.reparacion || 0),
          }
          remotos.current.add(negocio)
          remotos.current.add(contadores)
          respaldoRemoto.current = f.datos.ultimoRespaldo || nd.ultimoRespaldo
          nd = { ...nd, negocio, contadores, ultimoRespaldo: respaldoRemoto.current }
          continue
        }
        const lista = nd[f.tipo]
        if (!lista) continue
        const i = lista.findIndex((x) => x.id === f.id)
        if (f.eliminado || !f.datos) {
          if (i >= 0) {
            borradosRemotos.current.add(`${f.tipo}/${f.id}`)
            nd = { ...nd, [f.tipo]: lista.filter((x) => x.id !== f.id) }
          }
          continue
        }
        if (i >= 0 && iguales(lista[i], f.datos)) continue
        const obj = { ...f.datos }
        remotos.current.add(obj)
        const nueva = [...lista]
        if (i >= 0) nueva[i] = obj
        else nueva.unshift(obj)
        nd = { ...nd, [f.tipo]: nueva }
      }
      return nd === d ? d : { ...nd, ventas: [...nd.ventas].sort((a, b) => ms(b.fecha) - ms(a.fecha)) }
    })
  }

  sincronizarRef.current = async () => {
    const c = cuentaRef.current
    if (!supabase || !c) return
    if (!navigator.onLine) { setEstado({ fase: 'sin-red', error: null }); return }
    if (corriendo.current) { otraVez.current = true; return }
    corriendo.current = true
    setEstado((e) => ({ ...e, fase: 'sincronizando' }))
    try {
      // 1. Subir la cola
      const pend = { ...pendRef.current }
      const claves = Object.keys(pend)
      if (claves.length) {
        const d = dataRef.current
        const filas = claves.map((clave) => {
          const [tipo, ...resto] = clave.split('/')
          const id = resto.join('/')
          const datos = tipo === 'config' ? registroConfig(d)
            : pend[clave].eliminado ? null : (d[tipo]?.find((x) => x.id === id) ?? null)
          return { negocio_id: c.userId, tipo, id, datos, eliminado: !datos, actualizado: pend[clave].t }
        })
        await subir(filas)
        // Solo se quitan de la cola si no volvieron a cambiar mientras subían
        const limpiar = (p) => {
          const n = { ...p }
          for (const clave of claves) if (n[clave]?.t === pend[clave].t) delete n[clave]
          return n
        }
        pendRef.current = limpiar(pendRef.current)
        setPendientes(limpiar)
      }

      // 2. Bajar lo que cambió en la nube (con un pequeño solape por seguridad)
      const desde = c.cursor ? new Date(ms(c.cursor) - SOLAPE_MS).toISOString() : null
      const filas = await bajar(desde)
      if (filas.length) aplicarRemotos(filas)
      const ultimo = filas.length ? filas[filas.length - 1].servidor_en : null
      const cursor = ultimo && (!c.cursor || ms(ultimo) > ms(c.cursor)) ? ultimo : c.cursor
      setCuenta((x) => (x ? { ...x, cursor, ultimaSync: new Date().toISOString() } : x))
      setEstado({ fase: 'ok', error: null })
    } catch (e) {
      if (esErrorDeSesion(e)) {
        const r = await supabase.auth.refreshSession().catch((err) => ({ error: err }))
        if (!r.error) otraVez.current = true
        else if (sinRed(r.error)) setEstado({ fase: 'sin-red', error: null })
        else setEstado({ fase: 'sesion', error: 'La sesión venció. Vuelve a ingresar para seguir guardando en la nube.' })
      } else {
        setEstado({ fase: sinRed(e) ? 'sin-red' : 'error', error: e.message })
      }
      programar(REINTENTO_MS)
    } finally {
      corriendo.current = false
      if (otraVez.current) { otraVez.current = false; programar(500) }
    }
  }

  // Disparadores automáticos: al abrir, al volver la señal, al volver a la app y cada minuto
  useEffect(() => {
    if (!supabase || !cuenta?.userId) return undefined
    programar(300)
    const alVolverRed = () => programar(300)
    const alPerderRed = () => setEstado({ fase: 'sin-red', error: null })
    const alVolverApp = () => document.visibilityState === 'visible' && programar(300)
    window.addEventListener('online', alVolverRed)
    window.addEventListener('offline', alPerderRed)
    document.addEventListener('visibilitychange', alVolverApp)
    const revision = setInterval(() => programar(0), REVISION_MS)
    return () => {
      window.removeEventListener('online', alVolverRed)
      window.removeEventListener('offline', alPerderRed)
      document.removeEventListener('visibilitychange', alVolverApp)
      clearInterval(revision)
      clearTimeout(temporizador.current)
    }
  }, [cuenta?.userId, programar])

  const reemplazar = (nd) => {
    saltarDiff.current = nd
    setData(nd)
  }

  // Devuelve 'descargado' si la cuenta ya tenía datos, o 'vacia' para preguntar qué subir
  const iniciarSesion = async (email, clave) => {
    const nueva = await ingresar(email.trim(), clave)
    const total = await contarRegistros()
    if (total === 0) return { resultado: 'vacia', cuenta: nueva }
    const filas = await bajar(null)
    reemplazar(construirDesdeNube(filas, dataRef.current))
    setPendientes({})
    setCuenta({ ...nueva, cursor: filas[filas.length - 1]?.servidor_en || null, ultimaSync: new Date().toISOString() })
    setEstado({ fase: 'ok', error: null })
    return { resultado: 'descargado' }
  }

  const primeraSubida = (nueva, modo) => {
    const nd = modo === 'limpio' ? datosVacios(dataRef.current.negocio) : dataRef.current
    if (nd !== dataRef.current) reemplazar(nd)
    setPendientes(todasLasClaves(nd, new Date().toISOString()))
    setCuenta({ ...nueva, cursor: null, ultimaSync: null })
  }

  const cerrarSesion = async () => {
    await salir()
    setCuenta(null)
    setPendientes({})
    setEstado({ fase: 'inactivo', error: null })
  }

  return {
    configurada: nubeConfigurada,
    cuenta,
    pendientes: Object.keys(pendientes).length,
    estado,
    sincronizar: () => programar(0),
    iniciarSesion,
    primeraSubida,
    cerrarSesion,
  }
}
