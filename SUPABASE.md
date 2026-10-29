# Conectar el sistema a la nube (Supabase)

El sistema guarda todo primero en el celular, así que **vende sin internet**.
Cuando hay señal, sube solo los cambios a Supabase. El vendedor no tiene que hacer nada.

## 1. Crear el proyecto (una sola vez)

1. Entra a [supabase.com](https://supabase.com), crea un proyecto nuevo. Región recomendada: **South America (São Paulo)**.
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**.
3. Ve a **Authentication → Sign In / Providers → Email** y **desactiva "Allow new users to sign up"**.
   Así nadie puede crearse una cuenta por su cuenta: las cuentas las creas tú.

## 2. Crear la cuenta de cada negocio

**Authentication → Users → Add user → Create new user**

- Correo y contraseña del negocio (ej. `tienda@chazuta.pe`)
- Marca **Auto Confirm User**

Cada cuenta es un negocio distinto y solo ve sus propios datos. Para vender el sistema a otro negocio
del pueblo, solo creas otra cuenta.

## 3. Poner las claves en el sistema

En **Project Settings → API** copia la *Project URL* y la clave *anon public*.

- **En tu PC:** copia `.env.example` como `.env.local` y pega los valores.
- **En Vercel:** Settings → Environment Variables → agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y vuelve a desplegar.

## 4. Primer ingreso en el celular

1. Con internet, abre el sistema e ingresa con el correo y la contraseña del negocio.
2. Si la cuenta está vacía, elige **Empezar en limpio** (borra los datos de prueba) o **Subir lo que hay en este equipo**.
3. Instálalo como app (Ajustes → Usar sin internet).

Desde ahí ya funciona sin señal. La sesión queda guardada y no vuelve a pedir la contraseña.

## Cómo funciona la sincronización

| Situación | Qué pasa |
|---|---|
| Vende sin internet | La venta se guarda en el celular y queda en una cola de "por subir" |
| Vuelve la señal | Se sube sola en unos segundos (se revisa al volver la conexión, al abrir la app y cada minuto; si falla, se reintenta cada 30 s) |
| Se pierde o malogra el celular | En el celular nuevo se ingresa con la misma cuenta y se descarga todo |
| El mismo registro se cambia en dos equipos | Gana el cambio más reciente |

En la barra lateral (o arriba, en el celular) siempre se ve el estado: **Guardado en la nube**,
**Sin señal · 3 por subir**, etc.

## Ver los datos desde Supabase

Además de la tabla `registros`, el esquema crea vistas para consultar fácil:

- `ventas_detalle`: cada venta con fecha, total, método de pago y cliente
- `ventas_por_dia`: total vendido por día (hora de Lima)
- `inventario_detalle`: productos con precio, costo, stock e IMEI

## Límite conocido

Está pensado para **un equipo principal por negocio** (o varios que no venden a la vez sin señal).
Si dos celulares venden **el mismo producto mientras ambos están sin internet**, el stock de ese producto
queda con el valor del último que sincronice. Las ventas en sí no se pierden nunca, solo el número de stock
podría necesitar un ajuste. Si en el futuro trabajan varios vendedores a la vez, se cambia el stock a
"movimientos" (entradas y salidas) para que se sumen correctamente.
