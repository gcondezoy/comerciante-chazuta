import { dinero, fechaCorta, hora, gananciaVenta, METODOS_PAGO } from './utils'

const ms = (iso) => new Date(iso).getTime()

export const cajaAbierta = (cajas) => cajas.find((c) => c.estado === 'abierta') || null

// Calcula lo que entró y salió entre la apertura y el cierre (o ahora, si sigue abierta)
export function resumenCaja(caja, data, hasta = caja.cierre || new Date().toISOString()) {
  const desde = ms(caja.apertura)
  const fin = ms(hasta)
  const enRango = (iso) => { const t = ms(iso); return t >= desde && t <= fin }

  const porMetodo = Object.fromEntries(METODOS_PAGO.map((m) => [m, 0]))
  let total = 0
  let ganancia = 0
  const ventas = data.ventas.filter((v) => !v.anulada && enRango(v.fecha))
  for (const v of ventas) {
    // En reparaciones, el adelanto ya entró el día que se recibió el equipo
    const cobrado = v.total - (v.adelanto || 0)
    porMetodo[v.metodo] = (porMetodo[v.metodo] || 0) + cobrado
    total += cobrado
    ganancia += gananciaVenta(v)
  }

  const adelantos = data.reparaciones
    .filter((r) => Number(r.adelanto) > 0 && enRango(r.fecha))
    .reduce((s, r) => s + Number(r.adelanto), 0)

  const gastos = data.gastos.filter((g) => enRango(g.fecha))
  const gastosEfectivo = gastos.filter((g) => g.metodo === 'Efectivo').reduce((s, g) => s + g.monto, 0)
  const gastosTotal = gastos.reduce((s, g) => s + g.monto, 0)

  return {
    ventas: ventas.length,
    total: total + adelantos,
    porMetodo,
    adelantos,
    gastos,
    gastosEfectivo,
    gastosTotal,
    ganancia: ganancia - gastosTotal,
    efectivoEsperado: caja.montoInicial + porMetodo.Efectivo + adelantos - gastosEfectivo,
  }
}

// Lo que se guarda en el historial (sin la lista de gastos, que ya vive aparte)
export const fotoResumen = ({ gastos, ...resto }) => resto

export const textoDiferencia = (diferencia, moneda) => {
  if (Math.abs(diferencia) < 0.005) return 'Cuadra exacto'
  return diferencia > 0 ? `Sobra ${dinero(diferencia, moneda)}` : `Falta ${dinero(-diferencia, moneda)}`
}

export const tonoDiferencia = (diferencia) => (Math.abs(diferencia) < 0.005 ? 'ok' : diferencia > 0 ? 'sobra' : 'falta')

export function textoCierre(caja, negocio) {
  const m = negocio.moneda
  const r = caja.resumen
  const metodos = Object.entries(r.porMetodo).filter(([, v]) => v > 0).map(([k, v]) => `• ${k}: ${dinero(v, m)}`)
  return [
    `*Cierre de caja N° ${caja.numero} · ${negocio.nombre}*`,
    `Abrió: ${fechaCorta(caja.apertura)} ${hora(caja.apertura)}`,
    `Cerró: ${fechaCorta(caja.cierre)} ${hora(caja.cierre)}`,
    '',
    `Ventas: ${r.ventas} · Total ${dinero(r.total, m)}`,
    ...metodos,
    ...(r.adelantos ? [`• Adelantos de reparaciones: ${dinero(r.adelantos, m)}`] : []),
    `Gastos: ${dinero(r.gastosTotal, m)}`,
    `Ganancia aprox.: ${dinero(r.ganancia, m)}`,
    '',
    `Caja inicial: ${dinero(caja.montoInicial, m)}`,
    `Efectivo esperado: ${dinero(r.efectivoEsperado, m)}`,
    `Efectivo contado: ${dinero(caja.efectivoContado, m)}`,
    `*${textoDiferencia(caja.diferencia, m)}*`,
    ...(caja.nota ? ['', `Nota: ${caja.nota}`] : []),
  ].join('\n')
}

// Billetes y monedas que circulan en Perú
export const DENOMINACIONES = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1]
