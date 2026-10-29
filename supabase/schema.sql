-- =====================================================================
-- Sistema de Ventas · esquema para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
--
-- Idea: el celular trabaja sin internet y guarda todo localmente.
-- Cuando hay señal, sube cada cambio a la tabla `registros`.
-- Cada negocio es un usuario de Supabase Auth y solo ve sus propios datos.
-- =====================================================================

create table if not exists public.registros (
  negocio_id  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tipo        text        not null check (tipo in ('config', 'productos', 'ventas', 'reparaciones')),
  id          text        not null,
  datos       jsonb,
  eliminado   boolean     not null default false,
  actualizado timestamptz not null,               -- hora del cambio en el equipo
  servidor_en timestamptz not null default now(), -- hora en que llegó a la nube (para bajar cambios)
  primary key (negocio_id, tipo, id)
);

create index if not exists registros_sync_idx on public.registros (negocio_id, servidor_en);

-- Marca la hora de llegada y evita que un cambio viejo pise a uno más nuevo
create or replace function public.registros_al_guardar()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.actualizado < old.actualizado then
    return old;
  end if;
  new.servidor_en := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists registros_al_guardar on public.registros;
create trigger registros_al_guardar
  before insert or update on public.registros
  for each row execute function public.registros_al_guardar();

-- Seguridad: cada negocio solo lee y escribe sus filas
alter table public.registros enable row level security;

drop policy if exists "negocio lee lo suyo" on public.registros;
drop policy if exists "negocio crea lo suyo" on public.registros;
drop policy if exists "negocio edita lo suyo" on public.registros;

create policy "negocio lee lo suyo" on public.registros
  for select to authenticated using (negocio_id = auth.uid());
create policy "negocio crea lo suyo" on public.registros
  for insert to authenticated with check (negocio_id = auth.uid());
create policy "negocio edita lo suyo" on public.registros
  for update to authenticated using (negocio_id = auth.uid()) with check (negocio_id = auth.uid());

-- ---------------------------------------------------------------------
-- Vistas para revisar la información desde el panel de Supabase
-- (Table Editor o SQL), sin tocar el JSON a mano
-- ---------------------------------------------------------------------
create or replace view public.ventas_detalle with (security_invoker = on) as
select
  negocio_id,
  id,
  datos ->> 'tipo'                              as tipo,
  (datos ->> 'numero')::int                      as numero,
  (datos ->> 'fecha')::timestamptz               as fecha,
  (datos ->> 'total')::numeric                   as total,
  datos ->> 'metodo'                             as metodo,
  nullif(datos ->> 'cliente', '')                as cliente,
  coalesce((datos ->> 'anulada')::boolean, false) as anulada,
  jsonb_array_length(datos -> 'items')           as productos
from public.registros
where tipo = 'ventas' and not eliminado;

create or replace view public.inventario_detalle with (security_invoker = on) as
select
  negocio_id,
  id,
  datos ->> 'nombre'             as nombre,
  datos ->> 'categoria'          as categoria,
  (datos ->> 'precio')::numeric  as precio,
  (datos ->> 'costo')::numeric   as costo,
  (datos ->> 'stock')::int       as stock,
  nullif(datos ->> 'imei', '')   as imei
from public.registros
where tipo = 'productos' and not eliminado;

create or replace view public.ventas_por_dia with (security_invoker = on) as
select
  negocio_id,
  (fecha at time zone 'America/Lima')::date as dia,
  count(*)                                  as operaciones,
  sum(total)                                as total
from public.ventas_detalle
where not anulada
group by 1, 2
order by 2 desc;
