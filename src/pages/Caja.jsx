import { useState } from 'react'
import { Wallet, LockKeyhole, Unlock, Plus, Trash2, Receipt, Calculator, Send, Printer, ChevronRight, AlertTriangle, Smartphone } from 'lucide-react'
import { useStore } from '../store'
import { dinero, fechaCorta, hora, mismoDia, linkWhatsApp } from '../utils'
import { cajaAbierta, resumenCaja, fotoResumen, textoDiferencia, tonoDiferencia, textoCierre, DENOMINACIONES } from '../caja'
import Modal from '../components/Modal'

const CONCEPTOS = ['Pasaje', 'Flete', 'Almuerzo', 'Luz / agua', 'Compra de mercadería', 'Recarga de saldo']
const METODOS_GASTO = ['Efectivo', 'Yape', 'Plin']
const redondear = (n) => Math.round(n * 100) / 100

const cuando = (iso) => (mismoDia(iso, new Date()) ? `hoy a las ${hora(iso)}` : `el ${fechaCorta(iso)} a las ${hora(iso)}`)

export default function Caja() {
  const { data, abrirCaja, cerrarCaja, registrarGasto, eliminarGasto } = useStore()
  const { negocio, cajas } = data
  const m = negocio.moneda
  const abierta = cajaAbierta(cajas)
  const cerradas = cajas.filter((c) => c.estado === 'cerrada')

  const [monto, setMonto] = useState('')
  const [gasto, setGasto] = useState(null)
  const [borrarGasto, setBorrarGasto] = useState(null)
  const [cerrando, setCerrando] = useState(false)
  const [detalle, setDetalle] = useState(null)

  if (!abierta) {
    const ultima = cerradas[0]
    return (
      <>
        <section className="tarjeta abrir-caja">
          <span className="abrir-caja-icono"><Unlock size={26} /></span>
          <h2>Abrir caja</h2>
          <p className="ayuda">Cuenta el efectivo con el que empiezas el día (el sencillo para dar vuelto).</p>
          <form className="form abrir-caja-form" onSubmit={(e) => {
            e.preventDefault()
            abrirCaja(redondear(Number(monto) || 0))
            setMonto('')
          }}>
            <label>Efectivo inicial ({m})
              <input type="number" inputMode="decimal" min="0" step="0.1" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" autoFocus />
            </label>
            {ultima && (
              <button type="button" className="enlace" onClick={() => setMonto(String(ultima.efectivoContado))}>
                La última caja cerró con {dinero(ultima.efectivoContado, m)} · usar ese monto
              </button>
            )}
            <button className="btn btn-pri btn-grande" type="submit"><Unlock size={18} /> Abrir caja</button>
          </form>
        </section>
        <Historial cerradas={cerradas} negocio={negocio} onVer={setDetalle} />
        {detalle && <ModalDetalle caja={detalle} negocio={negocio} onClose={() => setDetalle(null)} />}
      </>
    )
  }

  const r = resumenCaja(abierta, data)
  const digital = r.porMetodo.Yape + r.porMetodo.Plin + r.porMetodo.Tarjeta
  const deOtroDia = !mismoDia(abierta.apertura, new Date())

  return (
    <>
      <div className="caja-estado">
        <span className="caja-punto" />
        <span><b>Caja N° {abierta.numero} abierta</b> {cuando(abierta.apertura)} con {dinero(abierta.montoInicial, m)}</span>
      </div>
      {deOtroDia && (
        <p className="aviso-caja"><AlertTriangle size={17} /> Esta caja quedó abierta desde un día anterior. Ciérrala para empezar el día de hoy con las cuentas en orden.</p>
      )}

      <div className="kpis">
        <div className="kpi destacado">
          <span className="kpi-et"><Wallet size={16} /> Efectivo en caja</span>
          <strong>{dinero(r.efectivoEsperado, m)}</strong>
          <small>lo que debería haber ahora</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><Receipt size={16} /> Vendido</span>
          <strong>{dinero(r.total, m)}</strong>
          <small>{r.ventas} {r.ventas === 1 ? 'venta' : 'ventas'}</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><Smartphone size={16} /> Yape, Plin y tarjeta</span>
          <strong>{dinero(digital, m)}</strong>
          <small>no entra a la caja física</small>
        </div>
        <div className="kpi">
          <span className="kpi-et"><Trash2 size={16} /> Gastos</span>
          <strong>{dinero(r.gastosTotal, m)}</strong>
          <small>{r.gastos.length} {r.gastos.length === 1 ? 'gasto' : 'gastos'}</small>
        </div>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta">
          <h2><Calculator size={18} /> Cómo se calcula el efectivo</h2>
          <ul className="cuenta-caja">
            <li><span>Caja inicial</span><span>{dinero(abierta.montoInicial, m)}</span></li>
            <li><span>+ Ventas en efectivo</span><span>{dinero(r.porMetodo.Efectivo, m)}</span></li>
            {r.adelantos > 0 && <li><span>+ Adelantos de reparaciones</span><span>{dinero(r.adelantos, m)}</span></li>}
            <li className="resta"><span>− Gastos pagados en efectivo</span><span>{dinero(r.gastosEfectivo, m)}</span></li>
            <li className="total"><span>Debería haber</span><span>{dinero(r.efectivoEsperado, m)}</span></li>
          </ul>
        </section>

        <section className="tarjeta">
          <h2>Por método de pago</h2>
          <ul className="cuenta-caja">
            {Object.entries(r.porMetodo).map(([metodo, v]) => (
              <li key={metodo} className={v ? '' : 'apagado'}><span>{metodo}</span><span>{dinero(v, m)}</span></li>
            ))}
            {r.adelantos > 0 && <li><span>Adelantos (efectivo)</span><span>{dinero(r.adelantos, m)}</span></li>}
            <li className="total"><span>Total</span><span>{dinero(r.total, m)}</span></li>
          </ul>
        </section>
      </div>

      <section className="tarjeta">
        <div className="tarjeta-cab">
          <h2>Gastos del día</h2>
          <button className="btn btn-sec btn-peq" onClick={() => setGasto({ concepto: '', monto: '', metodo: 'Efectivo' })}>
            <Plus size={16} /> Registrar gasto
          </button>
        </div>
        {r.gastos.length === 0 ? <p className="vacio">Sin gastos registrados en esta caja.</p> : (
          <ul className="lista-gastos">
            {r.gastos.map((g) => (
              <li key={g.id}>
                <span className="gasto-info">
                  <strong>{g.concepto}</strong>
                  <small>{hora(g.fecha)} · {g.metodo}</small>
                </span>
                <span className="gasto-monto">− {dinero(g.monto, m)}</span>
                {borrarGasto === g.id
                  ? <button className="btn btn-peligro btn-peq" onClick={() => { eliminarGasto(g.id); setBorrarGasto(null) }}>Borrar</button>
                  : <button className="btn-icono" onClick={() => setBorrarGasto(g.id)} aria-label="Borrar gasto"><Trash2 size={16} /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="btn btn-pri btn-grande btn-cerrar-caja" onClick={() => setCerrando(true)}>
        <LockKeyhole size={19} /> Cerrar caja
      </button>

      <Historial cerradas={cerradas} negocio={negocio} onVer={setDetalle} />

      {gasto && (
        <Modal titulo="Registrar gasto" onClose={() => setGasto(null)} ancho={440}>
          <form className="form" onSubmit={(e) => {
            e.preventDefault()
            const valor = redondear(Number(gasto.monto))
            if (!gasto.concepto.trim() || !(valor > 0)) return
            registrarGasto({ concepto: gasto.concepto.trim(), monto: valor, metodo: gasto.metodo })
            setGasto(null)
          }}>
            <label>¿En qué se gastó?
              <input autoFocus value={gasto.concepto} onChange={(e) => setGasto({ ...gasto, concepto: e.target.value })} placeholder="Ej. Flete de mercadería" />
            </label>
            <div className="chips envuelve">
              {CONCEPTOS.map((c) => (
                <button type="button" key={c} className={`chip ${gasto.concepto === c ? 'activo' : ''}`} onClick={() => setGasto({ ...gasto, concepto: c })}>{c}</button>
              ))}
            </div>
            <label>Monto ({m})
              <input type="number" inputMode="decimal" min="0" step="0.1" value={gasto.monto} onChange={(e) => setGasto({ ...gasto, monto: e.target.value })} />
            </label>
            <span className="etiqueta">Se pagó con</span>
            <div className="metodos metodos-3">
              {METODOS_GASTO.map((x) => (
                <button type="button" key={x} className={`metodo ${gasto.metodo === x ? 'activo' : ''}`} onClick={() => setGasto({ ...gasto, metodo: x })}>{x}</button>
              ))}
            </div>
            {gasto.metodo !== 'Efectivo' && <p className="ayuda">Los gastos con {gasto.metodo} no se restan del efectivo de la caja.</p>}
            <button className="btn btn-pri" type="submit">Guardar gasto</button>
          </form>
        </Modal>
      )}

      {cerrando && (
        <ModalCierre
          caja={abierta}
          resumen={r}
          negocio={negocio}
          onClose={() => setCerrando(false)}
          onConfirmar={({ efectivoContado, nota }) => {
            const resumen = fotoResumen(resumenCaja(abierta, data))
            const cierre = cerrarCaja(abierta.id, { efectivoContado, nota, resumen })
            setCerrando(false)
            setDetalle({ ...abierta, estado: 'cerrada', cierre, efectivoContado, nota, resumen, diferencia: efectivoContado - resumen.efectivoEsperado })
          }}
        />
      )}
      {detalle && <ModalDetalle caja={detalle} negocio={negocio} onClose={() => setDetalle(null)} />}
    </>
  )
}

function Historial({ cerradas, negocio, onVer }) {
  if (!cerradas.length) return null
  const m = negocio.moneda
  return (
    <section className="tarjeta">
      <h2>Cierres anteriores</h2>
      <ul className="lista-cierres">
        {cerradas.slice(0, 30).map((c) => (
          <li key={c.id}>
            <button onClick={() => onVer(c)}>
              <span className="cierre-info">
                <strong>Caja N° {c.numero} · {fechaCorta(c.apertura)}</strong>
                <small>{hora(c.apertura)} – {hora(c.cierre)} · vendido {dinero(c.resumen.total, m)}</small>
              </span>
              <span className={`chip-diferencia ${tonoDiferencia(c.diferencia)}`}>{textoDiferencia(c.diferencia, m)}</span>
              <ChevronRight size={17} className="cierre-flecha" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ModalCierre({ caja, resumen, negocio, onClose, onConfirmar }) {
  const m = negocio.moneda
  const [contado, setContado] = useState('')
  const [billetes, setBilletes] = useState(null)
  const [nota, setNota] = useState('')

  const totalBilletes = billetes ? redondear(DENOMINACIONES.reduce((s, d) => s + d * (Number(billetes[d]) || 0), 0)) : 0
  const valor = billetes ? totalBilletes : redondear(Number(contado) || 0)
  const hayValor = billetes ? Object.values(billetes).some((n) => n !== '') : contado !== ''
  const diferencia = redondear(valor - resumen.efectivoEsperado)

  return (
    <Modal titulo={`Cerrar caja N° ${caja.numero}`} onClose={onClose} ancho={480}>
      <div className="form">
        <div className="esperado">
          <span>Debería haber en efectivo</span>
          <strong>{dinero(resumen.efectivoEsperado, m)}</strong>
        </div>

        {billetes ? (
          <div className="conteo">
            <div className="conteo-cab"><span>Billete / moneda</span><span>Cantidad</span><span>Subtotal</span></div>
            {DENOMINACIONES.map((d) => (
              <label key={d} className="conteo-fila">
                <span className={d >= 10 ? 'billete' : 'moneda'}>{m} {d < 1 ? d.toFixed(2) : d}</span>
                <input type="number" inputMode="numeric" min="0" value={billetes[d]} onChange={(e) => setBilletes({ ...billetes, [d]: e.target.value })} placeholder="0" />
                <span className="conteo-sub">{dinero(d * (Number(billetes[d]) || 0), m)}</span>
              </label>
            ))}
            <div className="conteo-total"><span>Total contado</span><strong>{dinero(totalBilletes, m)}</strong></div>
            <button type="button" className="enlace" onClick={() => { setContado(totalBilletes ? String(totalBilletes) : ''); setBilletes(null) }}>Escribir el total directamente</button>
          </div>
        ) : (
          <>
            <label>¿Cuánto efectivo hay en la caja? ({m})
              <input autoFocus type="number" inputMode="decimal" min="0" step="0.1" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="Cuenta el dinero y escribe el total" />
            </label>
            <button type="button" className="enlace" onClick={() => setBilletes(Object.fromEntries(DENOMINACIONES.map((d) => [d, ''])))}>
              <Calculator size={15} /> Ayúdame a contar billetes y monedas
            </button>
          </>
        )}

        {hayValor && (
          <div className={`resultado-cierre ${tonoDiferencia(diferencia)}`}>
            <strong>{textoDiferencia(diferencia, m)}</strong>
            <small>
              {Math.abs(diferencia) < 0.005 ? 'El efectivo coincide con lo registrado.'
                : diferencia > 0 ? 'Hay más dinero del registrado. ¿Alguna venta sin anotar?'
                  : 'Hay menos dinero del registrado. ¿Algún gasto o vuelto sin anotar?'}
            </small>
          </div>
        )}

        <label>Nota (opcional)
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Retiré S/ 300 para pagar al proveedor" />
        </label>
        <button className="btn btn-pri btn-grande" disabled={!hayValor} onClick={() => onConfirmar({ efectivoContado: valor, nota: nota.trim() })}>
          <LockKeyhole size={18} /> Confirmar cierre
        </button>
      </div>
    </Modal>
  )
}

function ModalDetalle({ caja, negocio, onClose }) {
  const m = negocio.moneda
  const r = caja.resumen
  return (
    <Modal titulo={`Cierre de caja N° ${caja.numero}`} onClose={onClose} ancho={420}>
      <div className="ticket-envoltura">
        <div className="ticket" id="ticket-imprimible">
          <div className="ticket-cab">
            <strong>{negocio.nombre}</strong>
            <span>Cierre de caja N° {caja.numero}</span>
          </div>
          <div className="ticket-fila"><span>Abrió</span><span>{fechaCorta(caja.apertura)} · {hora(caja.apertura)}</span></div>
          <div className="ticket-fila"><span>Cerró</span><span>{fechaCorta(caja.cierre)} · {hora(caja.cierre)}</span></div>
          <ul className="ticket-items">
            {Object.entries(r.porMetodo).filter(([, v]) => v > 0).map(([k, v]) => (
              <li key={k}><span>Ventas {k}</span><span>{dinero(v, m)}</span></li>
            ))}
            {r.adelantos > 0 && <li><span>Adelantos reparaciones</span><span>{dinero(r.adelantos, m)}</span></li>}
            <li><span>Gastos</span><span>− {dinero(r.gastosTotal, m)}</span></li>
          </ul>
          <div className="ticket-total"><span>VENDIDO</span><span>{dinero(r.total, m)}</span></div>
          <div className="ticket-fila"><span>{r.ventas} ventas · ganancia aprox.</span><span>{dinero(r.ganancia, m)}</span></div>
          <div className="ticket-fila"><span>Caja inicial</span><span>{dinero(caja.montoInicial, m)}</span></div>
          <div className="ticket-fila"><span>Efectivo esperado</span><span>{dinero(r.efectivoEsperado, m)}</span></div>
          <div className="ticket-fila"><span>Efectivo contado</span><span>{dinero(caja.efectivoContado, m)}</span></div>
          <div className={`resultado-cierre compacto ${tonoDiferencia(caja.diferencia)}`}>
            <strong>{textoDiferencia(caja.diferencia, m)}</strong>
          </div>
          {caja.nota && <p className="ticket-gracias">Nota: {caja.nota}</p>}
        </div>
        <div className="ticket-acciones">
          <a className="btn btn-wsp" href={linkWhatsApp('', textoCierre(caja, negocio))} target="_blank" rel="noreferrer">
            <Send size={17} /> Enviar por WhatsApp
          </a>
          <button className="btn btn-sec" onClick={() => window.print()}><Printer size={17} /> Imprimir</button>
        </div>
      </div>
    </Modal>
  )
}
