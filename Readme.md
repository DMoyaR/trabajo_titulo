# Proyecto Trabajo de Título

Este repositorio contiene:

- **Backend** en Django (carpeta `backend`).
- **Frontend** en Angular (carpeta `frontend`).

El objetivo de este README es permitir ejecutar el proyecto desde un PC **sin requerimientos previos** instalados, detallando **cada requisito** y explicando **para qué sirve cada paso**.  
Las instrucciones están **enfocadas en Windows**, con equivalentes **opcionales para Linux/macOS**.

---

## Requisitos del sistema (instalar primero)

> Instala estos componentes en el sistema operativo antes de continuar.

1. **Git**
   - Para clonar el repositorio desde GitHub/GitLab.
   - Descarga: https://git-scm.com/downloads
2. **Python 3.10+** (recomendado 3.11+)
   - Necesario para ejecutar el backend en Django 5.2.5.
   - Descarga: https://www.python.org/downloads/
3. **pip** (incluido con Python)
   - Gestor de paquetes que instala las librerías del backend.
4. **Node.js 20+ (LTS)**
   - Necesario para el frontend Angular 20.
   - Incluye **npm**, que instala dependencias del frontend.
   - Descarga: https://nodejs.org/
5. **PostgreSQL 14+ (opcional)**
   - Solo si deseas usar PostgreSQL en lugar de SQLite.
   - Descarga: https://www.postgresql.org/download/

---

## Dependencias del backend (Python)

Estas librerías se instalan desde `requirements.txt`:

- `asgiref==3.9.1`
- `Django==5.2.5`
- `django-cors-headers==4.8.0`
- `djangorestframework==3.16.1`
- `psycopg==3.2.10`
- `psycopg-binary==3.2.10`
- `psycopg2-binary==2.9.10`
- `python-dotenv==1.1.1`
- `sqlparse==0.5.3`
- `typing_extensions==4.15.0`
- `tzdata==2025.2`

---

## Dependencias del frontend (Node/NPM)

### Dependencias de producción

- `@angular/common` ^20.2.0
- `@angular/compiler` ^20.2.0
- `@angular/core` ^20.2.0
- `@angular/forms` ^20.2.0
- `@angular/platform-browser` ^20.2.0
- `@angular/router` ^20.2.0
- `@types/jspdf` ^1.3.3
- `jspdf` ^3.0.3
- `rxjs` ~7.8.0
- `tslib` ^2.3.0
- `zone.js` ~0.15.0

### Dependencias de desarrollo

- `@angular/build` ^20.2.0
- `@angular/cli` ^20.2.0
- `@angular/compiler-cli` ^20.2.0
- `@types/jasmine` ~5.1.0
- `jasmine-core` ~5.9.0
- `karma` ~6.4.0
- `karma-chrome-launcher` ~3.2.0
- `karma-coverage` ~2.2.0
- `karma-jasmine` ~5.1.0
- `karma-jasmine-html-reporter` ~2.1.0
- `typescript` ~5.9.2

---

## Configuración del entorno

### 1) Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd trabajo_titulo
```

**¿Para qué sirve?** Descarga el código fuente en tu PC y entra a la carpeta del proyecto.

### 2) Variables de entorno (`.env`)

El proyecto ya incluye un archivo `.env` en la raíz con variables de ejemplo.

**¿Para qué sirve?** Define credenciales y configuración (base de datos, correo, modo debug) que el backend carga al iniciar.

> **SQLite (por defecto):** si `DB_NAME` está vacío o no existe, Django usa SQLite.  
> **PostgreSQL:** si deseas usar PostgreSQL, define `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_PORT`.

Ejemplo (ya incluido en `.env`):

```
SECRET_KEY=django-insecure-placeholder
DB_NAME=titulodb
DB_USER=postgres
DB_PASSWORD=123
DB_HOST=localhost
DB_PORT=5432
DEBUG=True

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=titulotest@gmail.com
EMAIL_HOST_PASSWORD=mywkpwynpyxqirig
```

> Si no deseas usar PostgreSQL, puedes eliminar `DB_NAME` (y el resto de variables `DB_*`) o dejarla vacía para que use SQLite.

---

## Instalación y ejecución del backend (Django)

Desde la raíz del repositorio:

```bash
cd backend
```

**¿Para qué sirve?** Entra a la carpeta del backend, donde está el proyecto Django.

1) **Crear y activar entorno virtual**  
El entorno virtual aísla las librerías de Python del resto del sistema.

**Windows (PowerShell):**
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> Si PowerShell bloquea la activación, ejecuta una vez:  
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Windows (CMD):**
```bash
python -m venv .venv
.\.venv\Scripts\activate.bat
```

**Linux/macOS (opcional):**
```bash
python -m venv .venv
source .venv/bin/activate
```

2) **Instalar dependencias**  
Instala todas las librerías del backend listadas en `requirements.txt`.

```bash
python -m pip install --upgrade pip
python -m pip install -r ../requirements.txt
```

> Si `pip` muestra errores de codificación al leer `requirements.txt`, abre el archivo con un editor y guarda en UTF-8, o usa un convertidor de texto. Luego vuelve a ejecutar el comando.

3) **Migraciones de base de datos**  
Crea las tablas necesarias en la base de datos (SQLite o PostgreSQL).

```bash
python manage.py migrate
```

4) **(Opcional) Crear superusuario**  
Permite acceder al panel de administración de Django.

```bash
python manage.py createsuperuser
```

5) **Levantar el servidor**  
Inicia el backend en modo desarrollo.

```bash
python manage.py runserver
```

El backend quedará disponible en `http://127.0.0.1:8000/`.

---

## Instalación y ejecución del frontend (Angular)

Desde la raíz del repositorio:

```bash
cd frontend
```

**¿Para qué sirve?** Entra a la carpeta del frontend, donde vive el proyecto Angular.

1) **Instalar dependencias**  
Descarga todas las librerías del frontend indicadas en `package.json`.

```bash
npm install
```

2) **Levantar el servidor**  
Inicia Angular en modo desarrollo.

```bash
ng serve
```

El frontend quedará disponible en `http://localhost:4200/`.

---

## Flujo recomendado de ejecución

1. Inicia el **backend** en `http://127.0.0.1:8000/`.
2. Inicia el **frontend** en `http://localhost:4200/`.
3. El frontend usa `proxy.conf.json` para comunicarse con el backend local.

---

## Comandos útiles

**Backend**
- `python manage.py migrate` → crea/actualiza tablas en la base de datos.
- `python manage.py createsuperuser` → crea un usuario administrador.
- `python manage.py runserver` → inicia el backend.

**Frontend**
- `ng serve` → inicia el frontend.
- `npm run build` → genera una versión de producción.
- `npm test` → ejecuta pruebas del frontend.

---

## Problemas comunes

- **El backend no conecta a PostgreSQL:** revisa que PostgreSQL esté instalado, corriendo y que las variables `DB_*` sean correctas.
- **El frontend no levanta:** verifica versión de Node (`node -v`) y que las dependencias se hayan instalado correctamente.
- **Errores de CORS:** el backend ya permite `http://localhost:4200` y `http://127.0.0.1:4200`.

---

## Estructura del proyecto

```
.
├── backend/   # Django
├── frontend/  # Angular
├── requirements.txt
└── .env
```