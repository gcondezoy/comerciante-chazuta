export const uid = () => Math.random().toString(36).slice(2, 10)

export const dinero = (n, simbolo = 'S/') =>
  `${simbolo} ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const mismoDia = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

export const fechaCorta = (iso) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })

export const fechaLarga = (iso) =>
  new Date(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

export const hora = (iso) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

export const totalVenta = (items) => items.reduce((s, i) => s + i.precio * i.cant, 0)

export const gananciaVenta = (v) =>
  v.anulada ? 0 : v.items.reduce((s, i) => s + (i.precio - (i.costo || 0)) * i.cant, 0)

// Números peruanos: se normalizan a 51 + 9 dígitos
export const linkWhatsApp = (telefono, mensaje) => {
  const digitos = String(telefono || '').replace(/\D/g, '').slice(-9)
  const destino = digitos ? `51${digitos}` : ''
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`
}

export const desdeHace = (dias) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dias)
  return d
}

export const METODOS_PAGO = ['Efectivo', 'Yape', 'Plin', 'Tarjeta']

export const ESTADOS_REPARACION = [
  { id: 'recibido', label: 'Recibido', corto: 'Recibido' },
  { id: 'reparando', label: 'En reparación', corto: 'Reparando' },
  { id: 'listo', label: 'Listo para entregar', corto: 'Listo' },
  { id: 'entregado', label: 'Entregado', corto: 'Entregado' },
]

const PALETA = ['#15803d', '#0369a1', '#b45309', '#7c3aed', '#be123c', '#0f766e', '#a16207', '#4338ca', '#c2410c']
export const colorCategoria = (categoria, categorias) => {
  const i = Math.max(0, categorias.indexOf(categoria))
  return PALETA[i % PALETA.length]
}
