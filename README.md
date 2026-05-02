# TrackVitals

Aplicacion Next.js para pacientes con diabetes y medicos. Este primer corte incluye autenticacion por tipo de usuario, registro, login, logout, sesion con cookie HTTP-only y un dashboard inicial protegido.

## Requisitos

- Node.js
- npm
- Proyecto Supabase con las tablas `medicos` y `pacientes`

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` tomando `.env.example` como base:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
AUTH_SECRET=pon-un-secreto-largo-y-aleatorio
```

3. Ejecuta el servidor:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Notas de base de datos

- El registro no pide `id_medico` ni `id_paciente`; esas columnas deberian tener default autoincremental o identity en Supabase.
- `password_med` y `password_pac` guardan hashes PBKDF2 para no persistir contrasenas en texto plano.
- El login tolera contrasenas existentes en texto plano para facilitar migraciones iniciales, pero los nuevos registros se guardan hasheados.
