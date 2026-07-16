# 🩺 TrackVitals

**Built for people with diabetes**

Aplicación web orientada al seguimiento integral de pacientes con diabetes, diseñada para centralizar información clínica, facilitar la comunicación médico-paciente y mejorar el acompañamiento del tratamiento.

---

## 📌 Descripción

**TrackVitals** es una plataforma web que conecta médicos y pacientes mediante paneles diferenciados según el rol de cada usuario.

Las personas con diabetes suelen registrar información como glucemia, insulina, medicación, alimentación y turnos en distintos medios. Esta fragmentación puede dificultar el seguimiento clínico, la interpretación de los datos y la detección temprana de posibles anomalías.

El proyecto busca resolver este problema mediante una plataforma clara, accesible y centralizada, en la que médicos y pacientes puedan consultar información relevante y mantener una comunicación continua.

La aplicación cuenta con una landing page, sistema de registro e inicio de sesión, dashboards específicos para cada rol y soporte para modo claro y oscuro dentro del panel principal.

---

## 🎯 Objetivo

Facilitar el monitoreo continuo de pacientes con diabetes, permitiendo:

* Centralizar registros clínicos y controles diarios
* Visualizar la evolución del paciente mediante gráficos
* Detectar patrones, valores fuera de rango y posibles anomalías
* Organizar medicación, prescripciones, turnos y planes alimentarios
* Mejorar la comunicación entre médicos y pacientes
* Resumir la información clínica relevante de las conversaciones
* Promover una mayor participación del paciente en su tratamiento

---

## ⚙️ Funcionalidades implementadas

### 🌐 Funcionalidades generales

* Landing page informativa y responsive
* Registro e inicio de sesión
* Acceso diferenciado según el rol del usuario
* Dashboard con modo claro y oscuro
* Diseño adaptable a computadoras, tablets y dispositivos móviles
* Gestión de perfil y fotografía personal
* Comunicación directa entre médicos y pacientes

### 👨‍⚕️ Para médicos

* Panel principal con métricas e información resumida
* Gestión de pacientes vinculados
* Incorporación de nuevos pacientes
* Visualización de información clínica por períodos:

  * Últimos 7 días
  * Último mes
  * Últimos 3 meses
* Exploración de registros diarios:

  * Glucemia
  * Carbohidratos consumidos
  * Tipo de insulina
  * Dosis administrada
  * Momento del día
* Visualización de gráficos y tendencias clínicas
* Revisión del historial de registros del paciente
* Creación y seguimiento de prescripciones
* Organización y programación de turnos
* Centro de alertas clínicas
* Consulta del plan alimentario
* Mensajería directa con pacientes
* Generación y consulta de un resumen clínico de las conversaciones
* Gestión del perfil y foto personal

### 👤 Para pacientes

* Panel principal con información relevante para el seguimiento diario
* Selección y vinculación con el médico de cabecera
* Carga y consulta de controles diarios:

  * Glucemia
  * Carbohidratos consumidos
  * Tipo de insulina
  * Dosis administrada
  * Momento del día
* Calendario con historial de registros
* Visualización de gráficos de evolución
* Consulta de medicación y dosis indicadas
* Consulta de prescripciones médicas
* Visualización de próximos turnos
* Consulta del plan alimentario
* Registro del cumplimiento diario del plan
* Mensajería directa con el médico de cabecera
* Gestión del perfil y foto personal

---


## 🧩 Arquitectura

La aplicación utiliza una arquitectura web moderna basada en **Next.js App Router**.

* Frontend y backend integrados con **Next.js 15**
* Interfaces dinámicas construidas con **React 19**
* Desarrollo tipado mediante **TypeScript**
* Endpoints internos implementados con **Next.js Route Handlers**
* Base de datos relacional principal en **Supabase PostgreSQL**
* Almacenamiento de imágenes mediante **Supabase Storage**
* Base documental complementaria en **MongoDB Atlas**
* Accesos y funcionalidades diferenciadas para médicos y pacientes
* Diseño responsive con CSS personalizado
* Gráficos y visualizaciones clínicas desarrollados con SVG

### 🟢 Uso de Supabase

**Supabase** funciona como la base principal de la aplicación y almacena información estructurada y relacionada, como:

* Usuarios
* Médicos y pacientes
* Relaciones entre médicos y pacientes
* Registros clínicos
* Prescripciones
* Medicación
* Turnos
* Alertas
* Planes alimentarios
* Mensajes
* Información de perfil

Además, **Supabase Storage** se utiliza para almacenar las fotos de perfil de los usuarios.

### 🍃 Uso de MongoDB

**MongoDB Atlas** se utiliza como base complementaria para información documental y dinámica.

Actualmente, su uso principal es almacenar los resúmenes clínicos de conversaciones dentro de la colección `conversation_summaries`.

Este enfoque permite modificar y ampliar la estructura de los resúmenes sin afectar el modelo relacional principal almacenado en Supabase.

---

## 🧠 Tecnologías

Herramientas utilizadas actualmente:

* **Next.js 15**

  * App Router
  * Route Handlers
  * Renderizado del lado del servidor y del cliente
* **React 19**
* **TypeScript**
* **Node.js**
* **CSS responsive personalizado**
* **SVG** para gráficos y visualizaciones clínicas
* **Supabase**

  * PostgreSQL
  * Storage
  * JavaScript SDK `@supabase/supabase-js`
* **MongoDB Atlas**

  * Almacenamiento documental
  * Colección `conversation_summaries`
* **npm** para la gestión de dependencias
* **Git** para el control de versiones
* **GitHub** para el alojamiento y seguimiento del proyecto

> El proyecto no utiliza Python ni Streamlit.

---

## 🚀 Puesta en marcha

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
MONGODB_URI=
MONGODB_DB_NAME=
```

Descripción de las variables:

* `SUPABASE_URL`: URL del proyecto de Supabase.
* `SUPABASE_SERVICE_ROLE_KEY`: clave privada utilizada para operaciones de Supabase ejecutadas desde el servidor.
* `AUTH_SECRET`: secreto utilizado por el sistema de autenticación de la aplicación.
* `MONGODB_URI`: cadena de conexión al clúster de MongoDB Atlas.
* `MONGODB_DB_NAME`: nombre de la base de datos utilizada en MongoDB.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` y `MONGODB_URI` contienen información sensible.
> Deben mantenerse únicamente del lado del servidor y nunca deben exponerse en componentes del cliente ni publicarse en GitHub.

También se recomienda incluir el archivo `.env` dentro de `.gitignore`.

### 4. Ejecutar el entorno de desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000 en el navegador.

### 5. Generar la versión de producción

```bash
npm run build
npm run start
```

---

## 🗄️ Bases de datos

Para ejecutar correctamente el proyecto se necesitan dos servicios de base de datos:

### Supabase PostgreSQL

Se utiliza como fuente principal de información relacional y transaccional de la plataforma.

Debe contener las tablas necesarias para administrar usuarios, pacientes, médicos, registros clínicos, turnos, prescripciones, planes alimentarios, alertas y mensajes.

### MongoDB Atlas

Se utiliza para guardar información documental complementaria.

La colección principal utilizada actualmente es:

```text
conversation_summaries
```

Cada documento puede representar el resumen clínico de la conversación entre un médico y un paciente, junto con sus fechas de creación y actualización.

---

## ⚠️ Aclaración

TrackVitals es un proyecto académico y una herramienta de apoyo para el seguimiento de pacientes.

La plataforma no realiza diagnósticos médicos y no reemplaza la evaluación, las indicaciones ni el criterio de un profesional de la salud.

---

## 🤝 Equipo

Proyecto desarrollado en el marco de la materia **Ciencia de Datos para la Medicina I**.

### Integrantes

Giuliano Albo Alma, Piñeiro Felicitas, Tobalina Camila 
