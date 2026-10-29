import { useRef, useState } from 'react'
import { Store, Tags, ToggleRight, Database, X, Plus, Download, Upload, RotateCcw, Eraser, Check, Smartphone, WifiOff, Cloud, RefreshCw, LogOut } from 'lucide-react'
import { useStore } from '../store'
import { useInstalar, yaInstalada, diasDesde, useConexion } from '../pwa'
import { fechaCorta, hora } from '../utils'
import { resumenNube } from '../components/EstadoNube'

// Plantillas para adaptar el sistema a otros negocios del pueblo con un toque
const PLANTILLAS = [
  { nombre: 'Tienda + celulares', categorias: ['Abarrotes', 'Bebidas', 'Ferretería', 'Hogar', 'Celulares', 'Accesorios'], modulos: { reparaciones: true, imei: true } },
  { nombre: 'Bodega / abarrotes', categorias: ['Abarrotes', 'Bebidas', 'Lácteos', 'Limpieza', 'Golosinas', 'Cuidado personal'], modulos: { reparaciones: false, imei: false } },
  { nombre: 'Ferretería', categorias: ['Herramientas', 'Construcción', 'Electricidad', 'Gasfitería', 'Pinturas', 'Agro'], modulos: { reparaciones: false, imei: false } },
  { nombre: 'Botica', categorias: ['Medicamentos', 'Cuidado personal', 'Bebés', 'Primeros auxilios', 'Vitaminas'], modulos: { reparaciones: false, imei: false } },
  { nombre: 'Ropa y calzado', categorias: ['Damas', 'Caballeros', 'Niños', 'Calzado', 'Accesorios'], modulos: { reparaciones: false, imei: false } },
  { nombre: 'Taller técnico', categorias: ['Repuestos', 'Accesorios', 'Celulares', 'Electrónica'], modulos: { reparaciones: true, imei: true } },
]

export default function Ajustes() {
  const { data, nube, actualizarNegocio, restaurarDemo, empezarVacio, importar, marcarRespaldo } = useStore()
  const { negocio, ultimoRespaldo } = data
  const enLinea = useConexion()
  const estadoNube = resumenNube(nube, enLinea)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const { puedeInstalar, instalar } = useInstalar()
  const instalada = yaInstalada()
  const dias = diasDesde(ultimoRespaldo)
  const [f, setF] = useState({ nombre: negocio.nombre, rubro: negocio.rubro, direccion: negocio.direccion, telefono: negocio.telefono, ruc: negocio.ruc, moneda: negocio.moneda })
  const [guardado, setGuardado] = useState(false)
  const [nuevaCat, setNuevaCat] = useState('')
  const [confirmar, setConfirmar] = useState(null)
  const archivo = useRef(null)

  const guardar = (e) => {
    e.preventDefault()
    actualizarNegocio({ ...f, nombre: f.nombre.trim() || 'Mi negocio' })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 1800)
  }

  const agregarCat = (e) => {
    e.preventDefault()
    const c = nuevaCat.trim()
    if (!c || negocio.categorias.includes(c)) return
    actualizarNegocio({ categorias: [...negocio.categorias, c] })
    setNuevaCat('')
  }

  const exportar = async () => {
    const nombre = `respaldo-${negocio.nombre.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    // En celular se abre el menú de compartir para mandarlo directo a WhatsApp, Drive o correo
    const archivoRespaldo = new File([blob], nombre, { type: 'application/json' })
    if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [archivoRespaldo] })) {
      try {
        await navigator.share({ files: [archivoRespaldo], title: `Respaldo ${negocio.nombre}` })
        marcarRespaldo()
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = nombre
    a.click()
    URL.revokeObjectURL(a.href)
    marcarRespaldo()
  }

  const leerRespaldo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const json = JSON.parse(lector.result)
        if (json.negocio && Array.isArray(json.productos)) importar(json)
        else alert('El archivo no es un respaldo válido.')
      } catch { alert('No se pudo leer el archivo.') }
    }
    lector.readAsText(file)
    e.target.value = ''
  }

  const accionesPeligrosas = {
    demo: { texto: 'Se reemplazarán todos los datos por los de ejemplo.', hacer: restaurarDemo },
    vacio: {
      texto: `Se borrarán productos, ventas y reparaciones${nube.cuenta ? ', también de la nube' : ''}. Se conservan los datos del negocio.`,
      hacer: empezarVacio,
    },
  }

  return (
    <div className="pagina pagina-angosta">
      <div className="pagina-cab">
        <div>
          <p className="sobretitulo">Configuración</p>
          <h1>Ajustes</h1>
        </div>
      </div>

      {nube.configurada && (
        <section className="tarjeta">
          <h2><Cloud size={18} /> Copia en la nube</h2>
          {nube.cuenta ? (
            <>
              <div className={`nube-resumen ${estadoNube.tono}`}>
                <estadoNube.Icono size={22} className={estadoNube.gira ? 'girando' : ''} />
                <span>
                  <strong>{estadoNube.corto}</strong>
                  <small>{estadoNube.largo}</small>
                </span>
              </div>
              <p className="ayuda">
                Cuenta: <b>{nube.cuenta.email}</b><br />
                {nube.cuenta.ultimaSync
                  ? `Última conexión con la nube: ${fechaCorta(nube.cuenta.ultimaSync)}, ${hora(nube.cuenta.ultimaSync)}.`
                  : 'Aún no se ha conectado con la nube.'}
                {' '}No hace falta tocar nada: los cambios se suben solos cuando hay señal.
              </p>
              <div className="botones-datos">
                <button className="btn btn-sec" onClick={nube.sincronizar} disabled={!enLinea}><RefreshCw size={17} /> Subir ahora</button>
                <button className="btn btn-sec" onClick={() => setConfirmarSalida(true)}><LogOut size={17} /> Cerrar sesión</button>
              </div>
              {confirmarSalida && (
                <div className="aviso-peligro">
                  <p>
                    {nube.pendientes
                      ? `Hay ${nube.pendientes} cambios que todavía no se subieron y se perderían de la nube. Mejor espera a tener señal.`
                      : 'Este equipo dejará de guardar en la nube hasta que vuelvas a ingresar.'}
                  </p>
                  <div>
                    <button className="btn btn-sec btn-peq" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
                    <button className="btn btn-peligro btn-peq" onClick={() => { nube.cerrarSesion(); setConfirmarSalida(false) }}>Cerrar sesión</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="ayuda">Este equipo está guardando solo localmente. Ingresa con la cuenta del negocio para tener una copia en la nube.</p>
              <button className="btn btn-pri" onClick={() => {
                try { localStorage.removeItem('ventas-chazuta-solo-local') } catch { /* ignorar */ }
                window.location.reload()
              }}><Cloud size={17} /> Conectar a la nube</button>
            </>
          )}
        </section>
      )}

      <section className="tarjeta tarjeta-offline">
        <h2><WifiOff size={18} /> Usar sin internet</h2>
        <p className="ayuda">
          El sistema funciona aunque no haya señal ni datos móviles, y las ventas se guardan al instante en el equipo,
          así que un corte de luz no borra nada. Para que abra sin internet, hay que abrirlo <b>una vez con conexión</b> e instalarlo.
        </p>
        {instalada ? (
          <p className="estado-ok"><Check size={17} /> Instalado en este equipo. Ábrelo desde el ícono de la pantalla de inicio.</p>
        ) : puedeInstalar ? (
          <button className="btn btn-pri" onClick={instalar}><Smartphone size={17} /> Instalar como app en este equipo</button>
        ) : (
          <ol className="pasos">
            <li><b>Android (Chrome):</b> menú ⋮ → <i>Instalar aplicación</i> o <i>Agregar a pantalla principal</i>.</li>
            <li><b>iPhone (Safari):</b> botón Compartir → <i>Agregar a inicio</i>.</li>
            <li><b>Computadora (Chrome/Edge):</b> ícono de instalar en la barra de direcciones.</li>
          </ol>
        )}
      </section>

      <section className="tarjeta">
        <h2><Store size={18} /> Datos del negocio</h2>
        <form className="form" onSubmit={guardar}>
          <div className="form-2">
            <label>Nombre del negocio<input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
            <label>Rubro<input value={f.rubro} onChange={(e) => setF({ ...f, rubro: e.target.value })} /></label>
          </div>
          <label>Dirección<input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></label>
          <div className="form-3">
            <label>Teléfono<input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} inputMode="tel" /></label>
            <label>RUC<input value={f.ruc} onChange={(e) => setF({ ...f, ruc: e.target.value })} inputMode="numeric" placeholder="Opcional" /></label>
            <label>Moneda<input value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })} maxLength={4} /></label>
          </div>
          <div className="form-acciones">
            <button className="btn btn-pri" type="submit">{guardado ? <><Check size={17} /> Guardado</> : 'Guardar datos'}</button>
          </div>
        </form>
      </section>

      <section className="tarjeta">
        <h2><ToggleRight size={18} /> Tipo de negocio</h2>
        <p className="ayuda">Elige una plantilla para cargar categorías y módulos de otro rubro. Tus productos no se borran.</p>
        <div className="plantillas">
          {PLANTILLAS.map((p) => (
            <button key={p.nombre} className="plantilla" onClick={() => actualizarNegocio({ categorias: p.categorias, modulos: p.modulos })}>
              <strong>{p.nombre}</strong>
              <small>{p.categorias.slice(0, 3).join(', ')}…</small>
            </button>
          ))}
        </div>
        <div className="interruptores">
          <Interruptor
            titulo="Servicio técnico / reparaciones"
            detalle="Órdenes de reparación, estados y aviso por WhatsApp"
            activo={negocio.modulos.reparaciones}
            onChange={(v) => actualizarNegocio({ modulos: { ...negocio.modulos, reparaciones: v } })}
          />
          <Interruptor
            titulo="Registrar IMEI en celulares"
            detalle="Pide el N° de serie en productos de la categoría Celulares"
            activo={negocio.modulos.imei}
            onChange={(v) => actualizarNegocio({ modulos: { ...negocio.modulos, imei: v } })}
          />
        </div>
      </section>

      <section className="tarjeta">
        <h2><Tags size={18} /> Categorías</h2>
        <div className="chips envuelve">
          {negocio.categorias.map((c) => (
            <span key={c} className="chip chip-quitar">
              {c}
              <button onClick={() => actualizarNegocio({ categorias: negocio.categorias.filter((x) => x !== c) })} aria-label={`Quitar ${c}`}><X size={14} /></button>
            </span>
          ))}
        </div>
        <form className="fila-agregar" onSubmit={agregarCat}>
          <input value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Nueva categoría" />
          <button className="btn btn-sec" type="submit"><Plus size={17} /> Agregar</button>
        </form>
      </section>

      <section className="tarjeta">
        <h2><Database size={18} /> Datos y respaldo</h2>
        <p className="ayuda">
          La información vive en este equipo. Si el celular se pierde, se malogra o se moja, los datos se van con él:
          descarga un respaldo cada semana y guárdalo en otro lado (envíatelo por WhatsApp o pásalo a una USB).
        </p>
        <p className={`respaldo-estado ${dias == null || dias > 7 ? 'atrasado' : ''}`}>
          {dias == null ? 'Todavía no se ha descargado ningún respaldo.'
            : dias === 0 ? `Último respaldo: hoy (${fechaCorta(ultimoRespaldo)}).`
            : `Último respaldo: hace ${dias} ${dias === 1 ? 'día' : 'días'} (${fechaCorta(ultimoRespaldo)}).`}
        </p>
        <div className="botones-datos">
          <button className="btn btn-sec" onClick={exportar}><Download size={17} /> Descargar respaldo</button>
          <button className="btn btn-sec" onClick={() => archivo.current?.click()}><Upload size={17} /> Cargar respaldo</button>
          <input ref={archivo} type="file" accept="application/json" hidden onChange={leerRespaldo} />
          {!nube.cuenta && <button className="btn btn-sec" onClick={() => setConfirmar('demo')}><RotateCcw size={17} /> Datos de ejemplo</button>}
          <button className="btn btn-sec texto-peligro" onClick={() => setConfirmar('vacio')}><Eraser size={17} /> Empezar de cero</button>
        </div>
        {confirmar && (
          <div className="aviso-peligro">
            <p>{accionesPeligrosas[confirmar].texto}</p>
            <div>
              <button className="btn btn-sec btn-peq" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn btn-peligro btn-peq" onClick={() => { accionesPeligrosas[confirmar].hacer(); setConfirmar(null) }}>Sí, continuar</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Interruptor({ titulo, detalle, activo, onChange }) {
  return (
    <label className="interruptor">
      <span>
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <input type="checkbox" checked={activo} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}
