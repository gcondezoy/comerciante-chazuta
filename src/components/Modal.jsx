import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ titulo, onClose, children, pie, ancho }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <header className="modal-cab">
          <h3>{titulo}</h3>
          <button className="btn-icono" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <div className="modal-cuerpo">{children}</div>
        {pie && <footer className="modal-pie">{pie}</footer>}
      </div>
    </div>
  )
}
