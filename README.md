# AgroCebada FIRA 2026 · print(desgranados?)

Proyecto del equipo **print(desgranados?)** (Universidad de las Américas Puebla) para el
**Reto AgroCebada FIRA 2026**: estimar el rendimiento de cebada de temporal (t/ha) de 59
parcelas en Hidalgo, Tlaxcala y Puebla con datos abiertos de satélite, clima y ubicación.

El repositorio contiene el modelo en Python y un sitio web interactivo que explica cómo
funciona el modelo y permite correrlo, en el navegador, sobre cada una de las 59 parcelas.

Sitio: https://datathon-fira-2026-1013944559771.us-central1.run.app

Integrantes: Luciana Hernández, Abraham Medina, Cesar Pérez, Viktor Chargoy y Christopher Chantres.

## Estructura del repositorio

```
├── model/                    el modelo validado (Python)
│   ├── modelo_final.py       entrena, valida y escribe las 59 predicciones
│   ├── phenology.py          suavizado de curvas NDVI e hitos de la temporada
│   ├── export_web_data.py    genera data/ para el sitio y verifica la fórmula contra Python
│   ├── tabla_maestra.csv     tabla de entrada: 197 parcelas × 271 variables
│   ├── requirements.txt      dependencias de Python
│   └── reference/            predicciones entregadas y métricas de validación
├── data/                     datos que usa el sitio (generados por export_web_data.py)
├── docs/                     cifras del modelo (model.md) y estilo visual (palette.md)
├── web/                      el sitio: Vite + React + TypeScript
├── Dockerfile, nginx.conf    imagen para Cloud Run
└── DEPLOY.md                 detalles de publicación
```

## Reproducir las 59 predicciones (Python)

Requiere Python 3 (probado con 3.11).

```bash
pip install -r model/requirements.txt
python model/modelo_final.py model/tabla_maestra.csv
```

El script valida el modelo (validación cruzada de 5 grupos × 10 repeticiones, estratificada
por municipio, unos segundos), imprime RMSE, MAE y R², y escribe en la carpeta actual:

- `predicciones_59_parcelas.csv` (ID_POLIGONO, RENDIMIENTO_T_HA)
- `predicciones_59_con_intervalos.csv` (además, intervalo de 80 %: inf_80, sup_80)
- `metricas_validacion.csv` (métricas por repetición)

Para obtener solo las predicciones, sin validar: agrega `--rapido`.
Los archivos producidos coinciden con los de `model/reference/`.

## Correr el sitio web localmente

Requiere Node.js 20.19 o superior.

```bash
cd web
npm ci
npm run dev        # http://localhost:5173
```

Otros comandos (desde `web/`):

```bash
npm test           # pruebas: el modelo del navegador reproduce al de Python (diferencia < 1e-9)
npm run typecheck  # verificación de tipos
npm run build      # versión de producción en web/dist
npm run preview    # sirve la versión de producción
```

Antes de `dev`, `build` y `test`, `npm` copia `data/` a `web/public/data/`. Los archivos de
`data/` solo se regeneran desde Python (`python model/export_web_data.py --dataset <carpeta DATASET_RETO_AGRO_2026>`).

## Cómo se publica

Cada `push` a la rama `main` en GitHub dispara un trigger de **Cloud Build**, que construye
la imagen con el `Dockerfile` (corre las pruebas y compila el sitio) y la despliega en
**Cloud Run** (servicio `datathon-fira-2026`, región `us-central1`, acceso público). Si alguna
prueba falla, no se publica nada. Ver `DEPLOY.md` para la alternativa con `gcloud`.

## Datos y uso de IA

Datos abiertos: Planet, Sentinel-2 y Landsat (índices de vegetación), CHIRPS (lluvia),
CHIRTS-ERA5 (temperatura) e INEGI (elevación y pendiente).

El modelado y este sitio se desarrollaron con ayuda de IA generativa (Claude, de Anthropic,
en chat y en Claude Code), bajo la dirección y revisión del equipo. La lista completa de
prompts está en la bibliografía del proyecto, como piden las reglas del reto.
