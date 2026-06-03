# Tablero de Gestión SGM
## Chilquinta Distribución — Visualización ejecutiva

Panel web que integra actividades desde WhatsApp (**SGM** y **Reporte SAT Costa_MM**),
pronóstico del tiempo (Meteored) e interrupciones eléctricas (SEC Chile).
Publicado automáticamente en GitHub Pages: https://friveraurbina-dot.github.io/sgmdistribucion/

---

## Estructura del proyecto

```
tablero-sgm/
├── index.html                        ← Dashboard principal
├── css/style.css                     ← Estilos identidad Chilquinta
├── js/dashboard.js                   ← Lógica del tablero
├── data/
│   ├── config.json                   ← Configuración central (intervalos, token, grupos)
│   ├── sgm.json                      ← Actividades grupo SGM
│   ├── sat.json                      ← Actividades grupo Reporte SAT Costa_MM
│   ├── clima.json                    ← Datos Meteored Valparaíso
│   ├── sec.json                      ← Datos SEC interrupciones
│   └── last_sync.json                ← Control incremental (NO borrar)
├── media/                            ← Fotografías descargadas de WhatsApp
├── extractor/
│   ├── whatsapp.js                   ← Extractor WhatsApp incremental
│   ├── scraper.py                    ← Scraper SEC + Meteored
│   ├── github_manager.py             ← Gestión autónoma de GitHub
│   └── run.py                        ← Orquestador principal
├── .github/workflows/deploy.yml      ← Deploy automático a GitHub Pages
├── package.json
├── .gitignore
└── README.md
```

---

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 18+ |
| Python | 3.10+ |
| Google Chrome | Reciente |
| Git | Cualquier versión |

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/friveraurbina-dot/sgmdistribucion.git
cd sgmdistribucion
```

### 2. Instalar dependencias Node.js
```bash
npm install
```

### 3. Instalar dependencias Python
```bash
pip install requests beautifulsoup4 lxml PyGithub
```

### 4. Configurar token de GitHub

Edita `data/config.json` y reemplaza el token:
```json
{
  "github_token": "ghp_TU_TOKEN_REAL_AQUI"
}
```

Obtén tu token en: https://github.com/settings/tokens
Permisos necesarios: **repo** (completo)

### 5. Inicializar repositorio desde cero (primera vez)
```bash
npm run github-init
```
Esto borra el contenido previo y sube el proyecto limpio.

### 6. Primera autenticación WhatsApp

```bash
npm run whatsapp-solo
```
Escanea el QR con tu teléfono → WhatsApp → Dispositivos vinculados.
La sesión queda guardada y **no se vuelve a pedir**.

---

## Uso diario

| Comando | Acción |
|---|---|
| `npm run actualizar` | Todo: WhatsApp + SEC/Clima + push GitHub |
| `npm run solo-web` | Solo SEC + Meteored + push GitHub |
| `npm run solo-whatsapp` | Solo WhatsApp + push GitHub |
| `npm run sin-github` | Extraer todo sin subir a GitHub |
| `npm run github-push` | Solo subir data/ y media/ a GitHub |
| `npm run github-push-full` | Subir todos los archivos del proyecto |
| `npm run github-status` | Ver estado del repositorio |

---

## Lógica de actualización incremental

El archivo `data/last_sync.json` controla el avance:

```json
{
  "SGM": "2026-06-03T22:00:00",
  "Reporte_SAT_Costa_MM": "2026-06-03T22:00:00",
  "clima": "2026-06-03T09:00:00",
  "sec": "2026-06-03T09:00:00"
}
```

- **WhatsApp:** solo procesa mensajes **posteriores** al último timestamp. Si se actualizó a las 22:00, mañana parte desde las 22:00.
- **SEC:** espera el intervalo configurado (por defecto **6 horas**).
- **Clima:** espera el intervalo configurado (por defecto **6 horas**).
- **Nunca borrar** `last_sync.json`.

---

## Intervalos configurables

En `data/config.json`:
```json
{
  "intervalo_sec_horas":   6,
  "intervalo_clima_horas": 6,
  "intervalo_whatsapp_minutos": 15
}
```

También desde el tablero web con los selectores en la barra superior:
- **Dashboard:** cada cuánto recargar los JSON en pantalla
- **SEC / Clima:** cada cuánto refrescar los datos externos

---

## Fotografías

Todas las imágenes descargadas de WhatsApp se guardan en `media/`.
Al hacer `npm run actualizar` o `npm run github-push`, la carpeta completa se sube a GitHub.
En el tablero, cada actividad muestra su galería con visor ampliado.

---

## Flujo recomendado

```
Cada mañana:
  npm run actualizar
  → Extrae WhatsApp desde la última hora procesada
  → Actualiza SEC y Clima si pasaron 6 horas
  → Sube data/ + media/ a GitHub
  → GitHub Actions publica el tablero en ~1 min
```

---

## Tablero en línea

https://friveraurbina-dot.github.io/sgmdistribucion/

Período de recopilación: desde **1 de junio de 2026**
Uso interno ejecutivo · Chilquinta Distribución
