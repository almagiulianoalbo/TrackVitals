# 🩺 Track Vitals  
**Built for diabetics**

Aplicación web orientada al seguimiento integral de pacientes con diabetes, diseñada para centralizar información clínica, facilitar la comunicación médico-paciente y mejorar la toma de decisiones.

---

## 📌 Descripción

**Track Vitals** es una plataforma que conecta médicos y pacientes mediante paneles diferenciados según el rol de cada usuario.

Actualmente, muchos pacientes diabéticos manejan sus datos clínicos de forma dispersa: glucemia, insulina, medicación, alimentación y turnos. Esto dificulta el seguimiento y la detección de patrones.

El proyecto busca resolver ese problema mediante una plataforma clara y accesible.

---

## 🎯 Objetivo

Facilitar el monitoreo continuo de pacientes con diabetes, permitiendo:

- Centralizar los registros clínicos  
- Visualizar claramente la evolución del paciente  
- Detectar patrones y posibles anomalías  
- Organizar medicación, turnos y planes alimentarios  
- Mejorar la comunicación entre médicos y pacientes  
- Promover una mayor participación del paciente en su tratamiento  

---

## ⚙️ Funcionalidades implementadas

### 👨‍⚕️ Para médicos

- Registro e inicio de sesión según el rol  
- Panel principal con métricas resumidas por paciente  
- Gestión de pacientes vinculados  
- Visualización de datos por períodos:
  - Últimos 7 días  
  - Último mes  
  - Últimos 3 meses  
- Exploración de registros diarios:
  - Glucemia  
  - Carbohidratos consumidos  
  - Tipo de insulina  
  - Dosis administrada  
- Visualización de gráficos y tendencias clínicas  
- Creación y seguimiento de prescripciones  
- Consulta de turnos  
- Centro de alertas clínicas  
- Mensajería directa con pacientes  
- Gestión del perfil y foto personal  

### 👤 Para pacientes

- Registro e inicio de sesión según el rol  
- Selección del médico de cabecera por nombre e ID  
- Panel principal con información relevante  
- Carga y consulta de controles diarios:
  - Glucemia  
  - Carbohidratos consumidos  
  - Tipo de insulina  
  - Dosis administrada  
  - Momento del día  
- Calendario con historial de registros  
- Visualización de gráficos de evolución  
- Consulta de medicación y dosis indicadas  
- Visualización del plan alimentario:
  - Distribución de comidas  
  - Carbohidratos  
  - Calorías  
  - Objetivos nutricionales  
- Solicitud y consulta de turnos  
- Mensajería directa con el médico de cabecera  
- Gestión del perfil y foto personal  

---

## 🧩 Arquitectura

La aplicación utiliza una arquitectura web moderna:

- Frontend y backend integrados con **Next.js App Router**  
- Interfaces dinámicas creadas con **React**  
- Endpoints internos mediante **Next.js Route Handlers**  
- Base de datos relacional alojada en **Supabase PostgreSQL**  
- Almacenamiento de fotos de perfil con **Supabase Storage**  
- Accesos diferenciados para médicos y pacientes  

---

## 🧠 Tecnologías

Herramientas utilizadas actualmente:

- **TypeScript**  
- **Next.js 15**  
- **React 19**  
- **Node.js**  
- **CSS responsive personalizado**  
- **SVG** para gráficos clínicos  
- **Supabase**
  - PostgreSQL  
  - Storage  
  - SDK `@supabase/supabase-js`  
- **npm** para la gestión de dependencias  
- **Git** para el control de versiones  

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
```

> `SUPABASE_SERVICE_ROLE_KEY` debe mantenerse únicamente del lado del servidor.

### 3. Ejecutar el entorno de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### 4. Generar la versión de producción

```bash
npm run build
npm run start
```

---

## 🚧 Próximos pasos

- Ampliar las reglas automáticas para detectar alertas clínicas  
- Incorporar nuevas métricas, como peso y frecuencia cardíaca  
- Permitir que los médicos creen y editen planes alimentarios personalizados  
- Configurar políticas RLS para reforzar la seguridad de la base de datos  
- Restringir los permisos públicos del almacenamiento de imágenes  
- Migrar el almacenamiento de contraseñas a un algoritmo adaptativo como Argon2 o bcrypt  

---

## 🤝 Equipo

Proyecto desarrollado en el marco de la materia **Ciencia de Datos para la Medicina**.

Integrantes: Giuliano Albo Alma, Piñeiro Felicitas, Tobalina Camila
