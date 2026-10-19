# Deploy

The site is a static Vite build served by nginx in one container on Cloud Run (port 8080).
The `Dockerfile` at the repo root runs the tests (browser model vs Python) and the build;
if a test fails, the image is not built and nothing is deployed.

Only Christopher runs `gcloud`.

## 1. Test the image locally (optional, recommended)

From the repo root:

```bash
docker build -t agrocebada-web .
docker run --rm -p 8080:8080 agrocebada-web
# open http://localhost:8080
```

If port 8080 is busy on your machine, map another host port: `-p 8089:8080` and open
http://localhost:8089.

Quick header check (in another terminal):

```bash
curl -sI http://localhost:8080/                      # 200, Cache-Control: no-cache
curl -sI http://localhost:8080/data/parcels.geojson  # 200, Content-Type: application/geo+json
```

## 2. One-time setup (only the first time)

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 3. Deploy

From the repo root:

```bash
gcloud run deploy agrocebada-web --source . --region us-central1 --allow-unauthenticated --port 8080
```

`--source .` uploads the repo (minus `.gcloudignore`), Cloud Build builds the
`Dockerfile`, and Cloud Run serves it. The first deploy may ask to create an Artifact
Registry repository; answer yes. The command prints the public URL at the end.

Redeploying is the same command; it creates a new revision and shifts traffic to it.

## What is in the image

- `data/*.json` and `data/parcels.geojson`, copied into the site at build time by
  `web/scripts/sync-data.mjs` (served at `/data/…`, revalidated on every request).
- The built site (`/assets/…` is content-hashed and cached for a year; `index.html` is
  never cached, so a new deploy is picked up immediately).
- `model/` and `docs/` are not uploaded or copied.
