"""
export_web_data.py · AgroCebada FIRA 2026

Builds the three files the web page consumes from the validated Python model:

  data/model.json        trained model "compiled" to numbers + the 197 parcels
  data/ndvi_curves.json  Planet NDVI season curve and milestones per parcel
  data/parcels.geojson   parcel polygons

The page never runs Python. Python trains `modelo_final.py` once (here), and the browser
applies the resulting linear formula:

  prediction = clip( wA * A + wB * B , lo, hi )
  A = prior + a0 + sum_j aj * (xj - mean_j) / sd_j + a_prior * prior      (3 phenology features)
  B = b0 + sum_k bk * (uk - mean_k) / scale_k                             (16 location features)
  prior = (1 - knnWeight) * municipalMean + knnWeight * neighborMean      (fixed per parcel)

Before writing anything, the script re-computes every prediction with that formula using
only the exported numbers and checks it against `modelo_final.py` (max |diff| < 1e-9) and
against the submitted CSV (rounded to 3 decimals).

Usage (from the repository root):
  python model/export_web_data.py --dataset path/to/DATASET_RETO_AGRO_2026
"""
import argparse
import json
import math
import struct
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from modelo_final import cargar, entrenar, predecir, PESOS, SEMIANCHO_80, MUN_REDONDEADOS  # noqa: E402
import phenology  # noqa: E402

FEATURE_LABELS = {
    'fen_pl_lai_base': {'es': 'Verdor inicial · LAI (Planet)', 'en': 'Initial greenness · LAI (Planet)'},
    'fen_s2_ndvi_base': {'es': 'Verdor inicial · NDVI (Sentinel-2)', 'en': 'Initial greenness · NDVI (Sentinel-2)'},
    'fen_pl_ndvi_base': {'es': 'Verdor inicial · NDVI (Planet)', 'en': 'Initial greenness · NDVI (Planet)'},
}
# Figures produced by the modelling notebooks (not recomputed here)
MUNICIPAL_MEAN_RMSE = 0.516          # 5x10 CV, notebook v2
COVERAGE_80 = {'measured': 0.799, 'rounded': 0.816}   # conformal coverage in CV, notebook v2
HALF_WIDTH_80 = {'measured': SEMIANCHO_80['medido'], 'rounded': SEMIANCHO_80['redondeado']}


# ── shapefile (no geopandas) ────────────────────────────────────────────────
def read_shapefile(shp_path):
    base = str(shp_path)[:-4]
    enc = 'utf-8'
    try:
        enc = open(base + '.cpg').read().strip() or 'utf-8'
    except FileNotFoundError:
        pass
    with open(base + '.dbf', 'rb') as f:
        h = f.read(32)
        n, hlen, rlen = struct.unpack('<IHH', h[4:12])
        fields = []
        for _ in range((hlen - 33) // 32):
            fd = f.read(32)
            fields.append((fd[:11].split(b'\0')[0].decode(enc, 'replace'), fd[16]))
        f.seek(hlen)
        rows = []
        for _ in range(n):
            r = f.read(rlen); o = 1; v = []
            for _, ln in fields:
                v.append(r[o:o + ln].decode(enc, 'replace').strip()); o += ln
            rows.append(v)
    attrs = pd.DataFrame(rows, columns=[c[0] for c in fields])
    data = open(shp_path, 'rb').read()
    pos, rings = 100, []
    while pos < len(data):
        _, length = struct.unpack('>ii', data[pos:pos + 8])
        c = data[pos + 8: pos + 8 + length * 2]
        pos += 8 + length * 2
        nparts, npts = struct.unpack('<ii', c[36:44])
        parts = list(struct.unpack(f'<{nparts}i', c[44:44 + 4 * nparts])) + [npts]
        pts = np.frombuffer(c[44 + 4 * nparts:44 + 4 * nparts + 16 * npts], dtype='<f8').reshape(-1, 2)
        rings.append(max((pts[s:e] for s, e in zip(parts[:-1], parts[1:])), key=len))
    return attrs, rings


def r(x, nd=6):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), nd)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dataset', required=True, help='folder DATASET_RETO_AGRO_2026 (unzipped)')
    ap.add_argument('--table', default=str(HERE / 'tabla_maestra.csv'))
    ap.add_argument('--out', default=str(HERE.parent / 'data'))
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    ref = HERE / 'reference'

    # ── 1. train the validated model ──────────────────────────────────────────
    T, X_tr, y_tr, X_te = cargar(args.table)
    models = entrenar(X_tr, y_tr)
    A, B = models['A'], models['B']
    py_pred = pd.Series(predecir(models, X_te, y_tr), index=X_te.index)

    sel, imp, sc, rg = [s[1] for s in B.steps]
    b_cols = sel.cols_
    a_cols = A.vars_
    lo, hi = float(y_tr.min()), float(y_tr.max())

    model_a = {
        'municipalWeight': round(1 - A.peso_knn, 10), 'knnWeight': A.peso_knn, 'k': A.k_vecinos, 'smoothing': A.suavizado,
        'globalMean': float(A.media_), 'minDistanceKm': 0.05,
        'intercept': float(A.ridge_.intercept_), 'priorCoef': float(A.ridge_.coef_[-1]), 'ridgeAlpha': float(A.ridge_.alpha_),
        'features': [{'name': c, 'label': FEATURE_LABELS.get(c, {'es': c, 'en': c}),
                      'mean': float(A.mu_[c]), 'sd': float(A.sd_[c]), 'fillValue': float(A.med_[c]),
                      'coef': float(A.ridge_.coef_[j])} for j, c in enumerate(a_cols)]}
    model_b = {
        'intercept': float(rg.intercept_), 'ridgeAlpha': float(rg.alpha_),
        'features': [{'name': c, 'mean': float(sc.mean_[k]), 'scale': float(sc.scale_[k]),
                      'fillValue': float(imp.statistics_[k]), 'coef': float(rg.coef_[k])} for k, c in enumerate(b_cols)],
        'derived': {'ubi_log_area': 'ln(ubi_area_ha)'}}

    # slider ranges over all 197 parcels
    X_all = pd.concat([X_tr, X_te])
    for f in model_a['features']:
        v = X_all[f['name']].fillna(f['fillValue'])
        f['min'], f['max'] = float(v.min()), float(v.max())
    area = X_all['ubi_area_ha']

    # ── 2. per-parcel records ─────────────────────────────────────────────────
    detail = pd.read_csv(ref / 'predictions_59_detail.csv').set_index('ID_POLIGONO')
    oof = pd.read_csv(ref / 'oof_training.csv').set_index('ID_POLIGONO')
    train_ids = list(X_tr.index)
    xy_te = A._xy_km(X_te)
    dist, idx = A.nn_.kneighbors(xy_te, n_neighbors=A.k_vecinos)
    mun_te = A._mun(X_te)
    parcels = []
    for i, pid in enumerate(X_te.index):
        x = X_te.loc[pid]
        m = mun_te[i]
        s, n = float(A.sum_mun_.get(m, 0.0)), float(A.n_mun_.get(m, 0.0))
        p_mun = (s + A.suavizado * A.media_) / (n + A.suavizado)
        w = 1.0 / np.maximum(dist[i], 0.05)
        p_knn = float((A.y_[idx[i]] * w).sum() / w.sum())
        prior = (1 - A.peso_knn) * p_mun + A.peso_knn * p_knn
        feats = {c: float(x[c]) if pd.notna(x[c]) else model_a['features'][j]['fillValue'] for j, c in enumerate(a_cols)}
        feats.update({c: float(x[c]) if pd.notna(x[c]) else float(imp.statistics_[k]) for k, c in enumerate(b_cols)})
        regime = 'rounded' if T.loc[pid, 'Municipio'] in MUN_REDONDEADOS else 'measured'
        parcels.append({
            'id': pid, 'set': 'predict', 'municipality': T.loc[pid, 'Municipio'], 'state': T.loc[pid, 'Estado'],
            'lon': r(x['ubi_lon']), 'lat': r(x['ubi_lat']), 'areaHa': r(x['ubi_area_ha'], 2), 'regime': regime,
            'features': {k: r(v, 10) for k, v in feats.items()},
            'prior': {'municipalMean': r(p_mun, 10), 'neighborMean': r(p_knn, 10), 'combined': r(prior, 10),
                      'municipalN': int(n),
                      'neighbors': [{'id': train_ids[j], 'distanceKm': r(d, 4), 'weight': r(ww / w.sum(), 6)}
                                    for j, d, ww in zip(idx[i], dist[i], w)]},
            'prediction': r(py_pred[pid], 10),
            'interval80': [r(py_pred[pid] - HALF_WIDTH_80[regime], 4), r(py_pred[pid] + HALF_WIDTH_80[regime], 4)],
            'attentionFlag': bool(detail.loc[pid, 'bandera_atencion']),
        })
    for pid in X_tr.index:
        x = X_tr.loc[pid]
        regime = 'rounded' if T.loc[pid, 'Municipio'] in MUN_REDONDEADOS else 'measured'
        parcels.append({'id': pid, 'set': 'train', 'municipality': T.loc[pid, 'Municipio'], 'state': T.loc[pid, 'Estado'],
                        'lon': r(x['ubi_lon']), 'lat': r(x['ubi_lat']), 'areaHa': r(x['ubi_area_ha'], 2), 'regime': regime,
                        'actualYield': r(T.loc[pid, 'RENDIMIENTO_T_HA'], 2),
                        'oofPrediction': r(oof.loc[pid, 'predicho_oof'], 3)})
    parcels.sort(key=lambda p: p['id'])

    # ── 3. self-test: the browser formula, using only exported numbers ───────
    def browser_formula(p):
        f = p['features']
        a = p['prior']['combined'] + model_a['intercept'] + model_a['priorCoef'] * p['prior']['combined']
        a += sum(ft['coef'] * (f[ft['name']] - ft['mean']) / ft['sd'] for ft in model_a['features'])
        b = model_b['intercept'] + sum(ft['coef'] * (f[ft['name']] - ft['mean']) / ft['scale'] for ft in model_b['features'])
        y = PESOS['A'] * a + PESOS['B'] * b
        return min(max(y, lo), hi), a, b

    submitted = pd.read_csv(ref / 'predictions_59.csv').set_index('ID_POLIGONO')['RENDIMIENTO_T_HA']
    diffs_py, diffs_csv = [], []
    for p in parcels:
        if p['set'] != 'predict':
            continue
        y, a, b = browser_formula(p)
        p['modelA'], p['modelB'] = r(a, 10), r(b, 10)
        diffs_py.append(abs(y - py_pred[p['id']]))
        diffs_csv.append(abs(round(y, 3) - submitted[p['id']]))
    assert max(diffs_py) < 1e-9, f'formula vs modelo_final.py: max diff {max(diffs_py)}'
    assert max(diffs_csv) < 5e-4, f'formula vs submitted CSV: max diff {max(diffs_csv)}'

    # ── 4. validation and municipality summary ───────────────────────────────
    val = pd.read_csv(ref / 'validation_metrics.csv')
    tr = T[T.CONJUNTO == 'ENTRENAMIENTO']
    munis = [{'name': m, 'state': g.Estado.iloc[0], 'nTrain': int(len(g)), 'meanYield': r(g.RENDIMIENTO_T_HA.mean(), 3),
              'regime': 'rounded' if m in MUN_REDONDEADOS else 'measured',
              'nPredict': int((T[T.CONJUNTO == 'PREDICCION'].Municipio == m).sum())}
             for m, g in tr.groupby('Municipio')]
    model_json = {
        'meta': {'generatedOn': date.today().isoformat(), 'source': 'model/modelo_final.py (validated ensemble v1)',
                 'target': 'barley grain yield', 'units': 't/ha', 'season': 'April–October 2025',
                 'nTrain': int(len(X_tr)), 'nPredict': int(len(X_te))},
        'ensemble': {'weightA': PESOS['A'], 'weightB': PESOS['B'], 'clip': [lo, hi]},
        'modelA': model_a, 'modelB': model_b,
        'intervals': {'level': 0.8, 'halfWidth': HALF_WIDTH_80, 'cvCoverage': COVERAGE_80},
        'validation': {'scheme': '5-fold x 10 repeats, stratified by municipality, nested ensemble weights',
                       'rmse': r(val.RMSE.mean(), 4), 'rmseSd': r(val.RMSE.std(), 4), 'mae': r(val.MAE.mean(), 4),
                       'r2': r(val.R2.mean(), 4), 'perRepeat': [{k: r(v, 4) for k, v in row.items()} for row in val.to_dict('records')],
                       'baselines': {'globalMeanRmse': r(y_tr.std(), 4), 'municipalMeanRmse': MUNICIPAL_MEAN_RMSE}},
        'municipalities': munis,
        'parcels': parcels,
        'selfTest': {'maxDiffVsPython': float(max(diffs_py)), 'maxDiffVsSubmittedCsv': float(max(diffs_csv)), 'nChecked': len(diffs_py)},
    }

    # ── 5. NDVI curves (Planet) ──────────────────────────────────────────────
    ds = Path(args.dataset)
    pro = pd.read_csv(next(ds.rglob('Conjunto_datos_PRO_AgroCebada.csv')))
    pro['fecha'] = pd.to_datetime(pro['fecha_captura'], format='%d/%m/%Y')
    pl = pro[pro.ndvi_promedio.notna() & (pro.porcentaje_nubosidad <= phenology.CLOUD_MAX)]
    curves, mismatches = {}, 0
    for pid, g in pl.groupby('ID_POLIGONO'):
        raw = phenology.raw_series(g, 'ndvi_promedio')
        smooth = phenology.smooth_curve(g, 'ndvi_promedio')
        ms = phenology.milestones(smooth)
        if pid in T.index and 'sosDoy' in ms:          # consistency with the model's table
            row = T.loc[pid]
            if (ms['sosDoy'] != row['fen_pl_ndvi_doy_sos'] or ms['peakDoy'] != row['fen_pl_ndvi_doy_pico']
                    or abs(ms['base'] - row['fen_pl_ndvi_base']) > 1e-9):
                mismatches += 1
        curves[pid] = {'raw': [[d.strftime('%Y-%m-%d'), r(v, 4)] for d, v in raw.items()],
                       'smooth': [] if smooth is None else [[d.strftime('%Y-%m-%d'), r(v, 4)] for d, v in smooth.items()],
                       'milestones': ms}
    assert mismatches == 0, f'{mismatches} parcels: milestones differ from tabla_maestra.csv'
    ndvi_json = {'meta': {'sensor': 'Planet', 'index': 'NDVI (parcel mean)', 'cloudMax': phenology.CLOUD_MAX,
                          'window': [phenology.START, phenology.END], 'smoothing': 'Savitzky–Golay upper envelope, 5-day grid',
                          'sosThreshold': phenology.SOS_THRESHOLD, 'eosThreshold': phenology.EOS_THRESHOLD},
                 'curves': curves}

    # ── 6. polygons ───────────────────────────────────────────────────────────
    attrs, rings = read_shapefile(next(ds.rglob('Parcelas_Reto_AGC_CONJUNTO.shp')))
    sets = {p['id']: p['set'] for p in parcels}
    feats = [{'type': 'Feature', 'properties': {'id': pid, 'set': sets[pid], 'municipality': T.loc[pid, 'Municipio']},
              'geometry': {'type': 'Polygon', 'coordinates': [[[round(float(a), 6), round(float(b), 6)] for a, b in ring]]}}
             for pid, ring in zip(attrs['ID_POLIGON'], rings)]
    geo = {'type': 'FeatureCollection', 'features': feats}

    # hidden yields must never leak: predict parcels carry no actual yield
    assert all('actualYield' not in p for p in parcels if p['set'] == 'predict')

    for name, obj in [('model.json', model_json), ('ndvi_curves.json', ndvi_json), ('parcels.geojson', geo)]:
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'wrote {out / name} ({(out / name).stat().st_size / 1024:.0f} KB)')
    print(f'self-test OK · {len(diffs_py)} predictions · max diff vs Python {max(diffs_py):.2e} · vs CSV {max(diffs_csv):.1e}')
    print(f'NDVI milestones consistent with tabla_maestra.csv for all {len(curves)} parcels')


if __name__ == '__main__':
    main()
