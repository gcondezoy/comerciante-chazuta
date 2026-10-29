// Conexión con Supabase. Sin estas variables el sistema funciona solo en el equipo (modo local).
//    VITE_SUPABASE_URL=https://xxxxx.supabase.co
//    VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const nubeConfigurada = Boolean(url && anonKey)
export const supabase = nubeConfigurada
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ventas-chazuta-auth' } })
  : null

export const COLECCIONES = ['productos', 'ventas', 'reparaciones', 'cajas', 'gastos']
const TABLA = 'registros'
const LOTE = 500

// La configuración del negocio viaja como un solo registro
export const registroConfig = (d) => ({ negocio: d.negocio, contadores: d.contadores, ultimoRespaldo: d.ultimoRespaldo || null })

export async function ingresar(email, clave) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave })
  if (error) throw error
  return { userId: data.user.id, email: data.user.email }
}

export async function salir() {
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* sin red: la sesión local igual se borra */ }
}

export async function contarRegistros() {
  const { count, error } = await supabase.from(TABLA).select('id', { count: 'exact', head: true })
  if (error) throw error
  return count || 0
}

export async function subir(filas) {
  for (let i = 0; i < filas.length; i += LOTE) {
    const { error } = await supabase.from(TABLA).upsert(filas.slice(i, i + LOTE), { onConflict: 'negocio_id,tipo,id' })
    if (error) throw error
  }
}

// Baja todo lo que llegó a la nube después de `desde`, por páginas
export async function bajar(desde) {
  const todas = []
  let cursor = desde || '1970-01-01T00:00:00Z'
  for (;;) {
    const { data, error } = await supabase.from(TABLA).select('*')
      .gt('servidor_en', cursor).order('servidor_en', { ascending: true }).limit(LOTE)
    if (error) throw error
    todas.push(...data)
    if (data.length < LOTE) break
    cursor = data[data.length - 1].servidor_en
  }
  return todas
}

// Errores de sesión vencida o cuenta inválida: reintentar no sirve, hay que volver a ingresar
export const esErrorDeSesion = (e) =>
  e?.status === 401 || e?.code === 'PGRST301' || /jwt|refresh token|not authenticated/i.test(e?.message || '')
