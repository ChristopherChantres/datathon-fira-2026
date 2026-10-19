# AgroCebada FIRA 2026 · Web

Interactive website for our entry to the Reto AgroCebada FIRA 2026: it explains how our barley-yield model works and lets the jury run it on the 59 parcels we had to predict. The jury opens a public URL (Google Cloud Run).

## Rules (non-negotiable)

1. **Git is off-limits.** Never run `git commit`, `git push`, `git pull`, `git merge`, `git rebase`, `git checkout`/`git switch`, `git reset`, `git stash`, `git tag`, or anything that changes history, branches or remotes. Read-only `git status` and `git diff` are fine. Christopher is the only person who commits, pushes and pulls.
2. **Do not modify `model/` or `data/`.** They are produced from the validated Python model. If something in them looks wrong, stop and report it; never patch the numbers.
3. **Every number on the page comes from `data/*.json`**, directly or through the documented formula below. Never hardcode, round differently, invent or "estimate" a figure.
4. **The real yields of the 59 `predict` parcels are unknown** (held by the committee). They are not in the data; never present a `predict` parcel as having a known yield.
5. **Language:** code, identifiers, comments, tests and technical docs in **English**. Everything the visitor reads on the page in **Spanish (Mexico)**; the jury is FIRA.
6. **Deploy:** prepare the files and the exact commands; Christopher runs `gcloud` himself.
7. Do not mention an "error floor" or the value 0.416 anywhere on the page.
8. Respect `prefers-reduced-motion`, keep the page usable on phones (≥ 360 px wide), and keep it working if JavaScript animations fail (content first, motion second).

## Repository layout

```
agrocebada-web/
├── CLAUDE.md                 this file
├── data/                     generated, read-only (see "Data contract")
│   ├── model.json
│   ├── ndvi_curves.json
│   └── parcels.geojson
├── docs/
│   ├── model.md              what the model does, with all the figures the page may cite
│   └── palette.md            colors and visual style (shared with the team's video)
├── model/                    read-only; the Python source the data was generated from
│   ├── modelo_final.py       the validated model (ensemble v1)
│   ├── phenology.py          NDVI curve smoothing and season milestones
│   ├── export_web_data.py    builds data/ and self-tests the formula against Python
│   ├── tabla_maestra.csv     model input (197 parcels × 271 features)
│   └── reference/            submitted predictions and validation metrics
└── web/                      the site (to be created)
```

## Stack

- Vite + React 18 + TypeScript (`strict: true`).
- GSAP 3 with ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin and SplitText (all free since 2025) for scroll-driven, 3Blue1Brown-style animation.
- D3 modules (`d3-geo`, `d3-scale`, `d3-shape`, `d3-array`) for the map and charts, rendered as SVG in React.
- KaTeX for formulas.
- Vitest for tests.
- Plain CSS with design tokens (CSS custom properties) defined from `docs/palette.md`. No UI component kit.
- Production: static build served by nginx in a container on Cloud Run (port 8080).

## Data contract

### `data/model.json`

- `ensemble`: `weightA`, `weightB`, `clip: [lo, hi]`.
- `modelA`: `intercept`, `priorCoef`, `features[]` (3 items: `name`, `label.es`, `mean`, `sd`, `coef`, `min`, `max`), plus prior parameters (`municipalWeight`, `knnWeight`, `k`, `smoothing`, `globalMean`).
- `modelB`: `intercept`, `features[]` (16 items: `name`, `mean`, `scale`, `coef`), `derived: { ubi_log_area: "ln(ubi_area_ha)" }`.
- `intervals`: `level` (0.8), `halfWidth.measured`, `halfWidth.rounded`, `cvCoverage`.
- `validation`: `rmse`, `rmseSd`, `mae`, `r2`, `perRepeat[]`, `baselines.globalMeanRmse`, `baselines.municipalMeanRmse`.
- `municipalities[]`: `name`, `state`, `nTrain`, `nPredict`, `meanYield`, `regime`.
- `parcels[]` (197):
  - all: `id`, `set` (`"train"` | `"predict"`), `municipality`, `state`, `lon`, `lat`, `areaHa`, `regime` (`"measured"` | `"rounded"`).
  - `train` only: `actualYield`, `oofPrediction` (out-of-fold prediction, average of 10 CV repeats).
  - `predict` only: `features` (all 19 inputs), `prior` (`municipalMean`, `neighborMean`, `combined`, `municipalN`, `neighbors[40]` with `id`, `distanceKm`, `weight`), `modelA`, `modelB`, `prediction`, `interval80`, `attentionFlag`.
- `selfTest`: the export script's own check (max diff vs Python ≈ 1e-10).

### `data/ndvi_curves.json`

`curves[id]` for all 197 parcels: `raw` (`[date, ndvi]` Planet points, cloud ≤ 40 %), `smooth` (`[date, ndvi]` on a 5-day grid), `milestones` (`base`, `peak`, `peakDate`, `sosDate`, `eosDate`, `seasonLengthDays`, and day-of-year versions).

### `data/parcels.geojson`

One polygon per parcel (WGS84), properties `id`, `set`, `municipality`.

## The prediction formula (must match Python exactly)

```
prior   = parcel.prior.combined                                   (fixed per parcel)
z_j     = (x_j − modelA.features[j].mean) / modelA.features[j].sd       j = 1..3
A       = prior + modelA.intercept + Σ_j modelA.features[j].coef · z_j + modelA.priorCoef · prior
u_k     = (x_k − modelB.features[k].mean) / modelB.features[k].scale   k = 1..16
B       = modelB.intercept + Σ_k modelB.features[k].coef · u_k
y       = clip(ensemble.weightA · A + ensemble.weightB · B, ensemble.clip)
```

- `x` values come from `parcel.features`. When the visitor changes the area, set `ubi_area_ha = area` and `ubi_log_area = ln(area)`; nothing else changes.
- The prior never changes in the browser (it depends on location and the training neighbors).
- Interval: `y ± intervals.halfWidth[parcel.regime]`.
- A test must assert `|predict(p) − p.prediction| < 1e-9` and the same for `modelA` and `modelB`, for all 59 `predict` parcels.

## Regenerating `data/` (only Christopher, only if the model changes)

```
python model/export_web_data.py --dataset path/to/DATASET_RETO_AGRO_2026
```
