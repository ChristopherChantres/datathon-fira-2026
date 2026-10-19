# Deploy

The site is a static Vite build served by nginx in one container on Cloud Run
(service `datathon-fira-2026`, region `us-central1`, public access, port 8080).

Live site: https://datathon-fira-2026-1013944559771.us-central1.run.app
The `Dockerfile` at the repo root runs the tests (browser model vs Python) and the build;
if a test fails, the image is not built and nothing is deployed.

Only Christopher runs `gcloud` and pushes.

## 1. Primary path: continuous deployment from GitHub

Every push to `main` on GitHub starts a **Cloud Build trigger** that builds the
`Dockerfile` and deploys the image to the Cloud Run service `datathon-fira-2026`
(`us-central1`, unauthenticated access allowed). Nothing else to run:

```bash
git push origin main      # then watch Cloud Build → History in the Google Cloud console
```

Cloud Build clones the repository, so `.gcloudignore` does not apply here; the Docker
build context is filtered by `.dockerignore` (only `data/` and `web/` are used).

## 2. Alternative: deploy from your machine

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com   # first time only
gcloud run deploy datathon-fira-2026 --source . --region us-central1 --allow-unauthenticated --port 8080
```

`--source .` uploads the repo minus `.gcloudignore`, Cloud Build builds the `Dockerfile`,
and Cloud Run serves it. The command prints the public URL at the end.

## 3. Test the image locally (optional)

From the repo root:

```bash
docker build -t datathon-fira-2026 .
docker run --rm -p 8080:8080 datathon-fira-2026
# open http://localhost:8080   (if 8080 is busy: -p 8089:8080 and http://localhost:8089)
```

Quick header check:

```bash
curl -sI http://localhost:8080/                      # 200, Cache-Control: no-cache
curl -sI http://localhost:8080/data/parcels.geojson  # 200, Content-Type: application/geo+json
```

## What goes where

| | `gcloud --source` upload (`.gcloudignore`) | Docker build context (`.dockerignore`) |
|---|---|---|
| `data/` | uploaded | copied, served at `/data/…` |
| `web/` (minus `node_modules`, `dist`, `public/data`) | uploaded | built |
| `model/`, `docs/` | not uploaded | not copied |
| root `*.md` | uploaded | not copied |

Tests that read `model/` or `docs/` (CSV vs the reference file, facts vs `docs/model.md`)
are skipped inside Docker and run locally.

Caching: `/assets/…` is content-hashed and cached for a year; `index.html` and `/data/…`
are revalidated on every request, so a new deploy is picked up immediately.
