import { useEffect, useState } from 'react'

// El navegador avisa una sola vez que la app se puede instalar; se guarda el evento para usarlo luego
let eventoInstalar = null
const oyentes = new Set()
const avisar = () => oyentes.forEach((f) => f(eventoInstalar))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    eventoInstalar = e
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null
    avisar()
  })
}

export const yaInstalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export function useInstalar() {
  const [evento, setEvento] = useState(eventoInstalar)
  useEffect(() => {
    oyentes.add(setEvento)
    return () => oyentes.delete(setEvento)
  }, [])
  const instalar = async () => {
    if (!evento) return
    evento.prompt()
    await evento.userChoice
    eventoInstalar = null
    avisar()
  }
  return { puedeInstalar: !!evento, instalar }
}

export function useConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setEnLinea(true)
    const off = () => setEnLinea(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return enLinea
}

// Pide al navegador que no borre los datos guardados aunque el celular se quede sin espacio
export async function pedirAlmacenamientoPersistente() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch { /* no soportado */ }
}

export const diasDesde = (iso) => (iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : null)
