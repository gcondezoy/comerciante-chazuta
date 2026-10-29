import { Printer, Send } from 'lucide-react'
import { codigoVenta } from '../store'
import { dinero, fechaCorta, hora, linkWhatsApp } from '../utils'

export function textoTicket(venta, negocio) {
  const m = negocio.moneda
  const lineas = venta.items.map((i) => `${i.cant} x ${i.nombre}  ${dinero(i.precio * i.cant, m)}`)
  return [
    `*${negocio.nombre}*`,
    `Comprobante ${codigoVenta(venta)} · ${fechaCorta(venta.fecha)} ${hora(venta.fecha)}`,
    '',
    ...lineas,
    '',
    `*TOTAL: ${dinero(venta.total, m)}*`,
    `Pago: ${venta.metodo}`,
    '',
    '¡Gracias por su compra!',
  ].join('\n')
}

export default function Ticket({ venta, negocio, telefono }) {
  const m = negocio.moneda
  const vuelto = venta.recibido ? venta.recibido - venta.total : null
  const saldo = venta.adelanto ? venta.total - venta.adelanto : null

  return (
    <div className="ticket-envoltura">
      <div className="ticket" id="ticket-imprimible">
        <div className="ticket-cab">
          <strong>{negocio.nombre}</strong>
          {negocio.ruc && <span>RUC {negocio.ruc}</span>}
          <span>{negocio.direccion}</span>
          {negocio.telefono && <span>Tel. {negocio.telefono}</span>}
        </div>
        <div className="ticket-meta">
          <span>{codigoVenta(venta)}</span>
          <span>{fechaCorta(venta.fecha)} · {hora(venta.fecha)}</span>
        </div>
        {venta.cliente && <div className="ticket-cliente">Cliente: {venta.cliente}</div>}
        <ul className="ticket-items">
          {venta.items.map((i, k) => (
            <li key={k}>
              <span>{i.cant} × {i.nombre}</span>
              <span>{dinero(i.precio * i.cant, m)}</span>
            </li>
          ))}
        </ul>
        <div className="ticket-total"><span>TOTAL</span><span>{dinero(venta.total, m)}</span></div>
        {saldo != null && (
          <>
            <div className="ticket-fila"><span>Adelanto recibido</span><span>{dinero(venta.adelanto, m)}</span></div>
            <div className="ticket-fila"><span>Saldo cobrado hoy</span><span>{dinero(saldo, m)}</span></div>
          </>
        )}
        <div className="ticket-fila"><span>Pago</span><span>{venta.metodo}</span></div>
        {vuelto != null && vuelto >= 0 && (
          <>
            <div className="ticket-fila"><span>Recibido</span><span>{dinero(venta.recibido, m)}</span></div>
            <div className="ticket-fila destacado"><span>Vuelto</span><span>{dinero(vuelto, m)}</span></div>
          </>
        )}
        {venta.anulada && <div className="ticket-anulado">ANULADA</div>}
        <p className="ticket-gracias">¡Gracias por su preferencia!</p>
      </div>
      <div className="ticket-acciones">
        <a className="btn btn-wsp" href={linkWhatsApp(telefono, textoTicket(venta, negocio))} target="_blank" rel="noreferrer">
          <Send size={17} /> Enviar por WhatsApp
        </a>
        <button className="btn btn-sec" onClick={() => window.print()}><Printer size={17} /> Imprimir</button>
      </div>
    </div>
  )
}
