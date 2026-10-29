import { uid } from './utils'

export const CATEGORIAS_BASE = ['Abarrotes', 'Bebidas', 'Ferretería', 'Hogar', 'Celulares', 'Accesorios']

export const negocioBase = () => ({
  nombre: 'Comercial Chazuta',
  rubro: 'Tienda general · Celulares · Servicio técnico',
  direccion: 'Jr. Principal s/n, Chazuta – San Martín',
  telefono: '',
  ruc: '',
  moneda: 'S/',
  categorias: [...CATEGORIAS_BASE],
  modulos: { reparaciones: true, imei: true },
})

const p = (nombre, categoria, precio, costo, stock, extra = {}) => ({
  id: uid(), nombre, categoria, precio, costo, stock, stockMin: 3, marca: '', codigo: '', imei: '', ...extra,
})

const productosDemo = () => [
  p('Arroz Costeño 5 kg', 'Abarrotes', 22.5, 18.9, 14, { marca: 'Costeño' }),
  p('Azúcar rubia 1 kg', 'Abarrotes', 4.2, 3.4, 30),
  p('Aceite Primor 1 L', 'Abarrotes', 9.5, 7.8, 2, { marca: 'Primor' }),
  p('Leche Gloria lata', 'Abarrotes', 4.3, 3.6, 48, { marca: 'Gloria' }),
  p('Fideos Don Vittorio 500 g', 'Abarrotes', 3.2, 2.5, 25),
  p('Atún Florida', 'Abarrotes', 6.5, 5.1, 18),
  p('Gaseosa Inca Kola 1.5 L', 'Bebidas', 7, 5.4, 22),
  p('Agua San Luis 625 ml', 'Bebidas', 1.5, 0.9, 60),
  p('Cerveza Cusqueña six pack', 'Bebidas', 33, 27, 6),
  p('Pilas AA x2 Panasonic', 'Ferretería', 4, 2.6, 40),
  p('Linterna recargable LED', 'Ferretería', 28, 17, 7),
  p('Machete 18" Tramontina', 'Ferretería', 32, 22, 5, { marca: 'Tramontina' }),
  p('Botas de jebe Nº 40', 'Ferretería', 39, 27, 2),
  p('Repelente Off 200 ml', 'Hogar', 18, 12.5, 12),
  p('Detergente Ariel 900 g', 'Hogar', 12.9, 10.2, 15),
  p('Velas paquete x6', 'Hogar', 5, 3.2, 20),
  p('Samsung Galaxy A15 128GB', 'Celulares', 649, 540, 3, { marca: 'Samsung', imei: '356789104523311', stockMin: 1 }),
  p('Xiaomi Redmi 13C 128GB', 'Celulares', 499, 410, 4, { marca: 'Xiaomi', imei: '862193055871204', stockMin: 1 }),
  p('Motorola Moto G24', 'Celulares', 579, 470, 1, { marca: 'Motorola', imei: '359021117734582', stockMin: 1 }),
  p('Cargador tipo C 20W', 'Accesorios', 25, 11, 16),
  p('Cable USB tipo C', 'Accesorios', 12, 4.5, 30),
  p('Mica de vidrio templado', 'Accesorios', 10, 2.5, 45),
  p('Case silicona', 'Accesorios', 15, 5, 26),
  p('Audífonos con cable', 'Accesorios', 18, 7, 2),
  p('Chip prepago Claro', 'Accesorios', 5, 3, 20),
]

// Genera ventas de los últimos días para que el panel tenga movimiento al mostrarlo
const ventasDemo = (productos) => {
  const ventas = []
  const comunes = productos.filter((x) => x.categoria !== 'Celulares')
  const celulares = productos.filter((x) => x.categoria === 'Celulares')
  const metodos = ['Efectivo', 'Efectivo', 'Efectivo', 'Yape', 'Yape', 'Plin']
  let numero = 0
  for (let dia = 6; dia >= 0; dia--) {
    const cantidad = 4 + Math.floor(Math.random() * 6)
    for (let k = 0; k < cantidad; k++) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - dia)
      fecha.setHours(8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0)
      if (dia === 0 && fecha > new Date()) fecha.setTime(Date.now() - (k + 1) * 9 * 60000)
      const items = []
      const nItems = 1 + Math.floor(Math.random() * 3)
      for (let j = 0; j < nItems; j++) {
        const prod = comunes[Math.floor(Math.random() * comunes.length)]
        if (items.some((i) => i.productoId === prod.id)) continue
        items.push({ productoId: prod.id, nombre: prod.nombre, precio: prod.precio, costo: prod.costo, cant: 1 + Math.floor(Math.random() * 2) })
      }
      if (Math.random() < 0.06) {
        const cel = celulares[Math.floor(Math.random() * celulares.length)]
        items.push({ productoId: cel.id, nombre: cel.nombre, precio: cel.precio, costo: cel.costo, cant: 1 })
      }
      numero++
      ventas.push({
        id: uid(), numero, tipo: 'venta', fecha: fecha.toISOString(), items,
        total: items.reduce((s, i) => s + i.precio * i.cant, 0),
        metodo: metodos[Math.floor(Math.random() * metodos.length)], cliente: '',
      })
    }
  }
  return ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

const haceDias = (d) => {
  const f = new Date()
  f.setDate(f.getDate() - d)
  return f.toISOString()
}

const reparacionesDemo = () => [
  {
    id: uid(), numero: 4, fecha: haceDias(0), cliente: 'Rosa Pinedo', telefono: '942118734', equipo: 'Samsung A12',
    imei: '', falla: 'Pantalla rota, no responde el táctil', accesorios: 'Con case', clave: '', presupuesto: 180,
    adelanto: 50, costoRepuestos: 95, fechaEstimada: haceDias(-2), estado: 'recibido', notas: '',
  },
  {
    id: uid(), numero: 3, fecha: haceDias(1), cliente: 'Luis Tapullima', telefono: '965230418', equipo: 'Xiaomi Redmi Note 11',
    imei: '', falla: 'No carga, pin de carga dañado', accesorios: 'Sin chip', clave: '', presupuesto: 60,
    adelanto: 20, costoRepuestos: 15, fechaEstimada: haceDias(0), estado: 'reparando', notas: 'Cambiar pin tipo C',
  },
  {
    id: uid(), numero: 2, fecha: haceDias(2), cliente: 'Marleni Sangama', telefono: '978452016', equipo: 'Motorola E13',
    imei: '', falla: 'Se apaga solo, batería hinchada', accesorios: '', clave: '', presupuesto: 85,
    adelanto: 0, costoRepuestos: 40, fechaEstimada: haceDias(0), estado: 'listo', notas: '',
  },
  {
    id: uid(), numero: 1, fecha: haceDias(5), cliente: 'Jorge Amasifuén', telefono: '951873320', equipo: 'iPhone 8',
    imei: '', falla: 'Cambio de batería', accesorios: '', clave: '', presupuesto: 120,
    adelanto: 120, costoRepuestos: 55, fechaEstimada: haceDias(4), estado: 'entregado', fechaEntrega: haceDias(4), notas: '',
  },
]

export const datosDemo = () => {
  const productos = productosDemo()
  const ventas = ventasDemo(productos)
  return {
    version: 1,
    negocio: negocioBase(),
    productos,
    ventas,
    reparaciones: reparacionesDemo(),
    contadores: { venta: ventas.length, reparacion: 4 },
  }
}

export const datosVacios = (negocio) => ({
  version: 1,
  negocio: negocio || negocioBase(),
  productos: [],
  ventas: [],
  reparaciones: [],
  contadores: { venta: 0, reparacion: 0 },
})
