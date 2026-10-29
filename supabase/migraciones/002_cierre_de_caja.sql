-- =====================================================================
-- Cierre de caja: permite guardar en la nube las cajas y los gastos.
-- Ejecutar UNA vez en: Supabase → SQL Editor → New query → Run
-- (Solo hace falta en proyectos creados antes de esta versión.)
-- =====================================================================

alter table public.registros drop constraint if exists registros_tipo_check;
alter table public.registros add constraint registros_tipo_check
  check (tipo in ('config', 'productos', 'ventas', 'reparaciones', 'cajas', 'gastos'));

-- Historial de cierres para revisar desde el panel de Supabase
create or replace view public.cierres_caja with (security_invoker = on) as
select
  negocio_id,
  id,
  (datos ->> 'numero')::int                          as numero,
  (datos ->> 'apertura')::timestamptz                as apertura,
  (datos ->> 'cierre')::timestamptz                  as cierre,
  (datos ->> 'montoInicial')::numeric                as caja_inicial,
  (datos -> 'resumen' ->> 'total')::numeric          as vendido,
  (datos -> 'resumen' ->> 'gastosTotal')::numeric    as gastos,
  (datos -> 'resumen' ->> 'efectivoEsperado')::numeric as efectivo_esperado,
  (datos ->> 'efectivoContado')::numeric             as efectivo_contado,
  (datos ->> 'diferencia')::numeric                  as diferencia,
  nullif(datos ->> 'nota', '')                       as nota
from public.registros
where tipo = 'cajas' and not eliminado and datos ->> 'estado' = 'cerrada'
order by apertura desc;
