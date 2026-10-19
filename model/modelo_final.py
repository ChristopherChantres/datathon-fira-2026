"""
modelo_final.py · Reto AgroCebada FIRA 2026
===========================================

El modelo que se entrega, solo, sin los experimentos. Es lo que eligió el notebook v2
(regla estricta: ningún cambio de v2 superó a v1 de forma distinguible).

    rendimiento = 0.46 * MODELO A  +  0.54 * MODELO B      (recortado a [2.00, 5.59] t/ha)

MODELO A · "Prior espacial + residual" (PriorEspacialResidual)
    1. Expectativa por ubicación = 0.2 * promedio suavizado del municipio
                                 + 0.8 * promedio de las 40 parcelas más cercanas (pesado por 1/distancia)
    2. Corrección: Ridge con las 3 variables de fenología que más correlacionan con lo que
       la ubicación no explica (en el ajuste final salieron fen_pl_lai_base, fen_s2_ndvi_base
       y fen_pl_ndvi_base: el verdor de la parcela antes de que arranque el cultivo).

MODELO B · Ridge solo con ubicación
    Coordenadas, área (y su logaritmo), estado y municipio → imputación → estandarización → RidgeCV.

Validación (5 folds * 10 repeticiones, estratificada por municipio): RMSE 0.479 ± 0.005, R² 0.68.

Uso
---
    python modelo_final.py tabla_maestra.csv            # valida (imprime el RMSE) y escribe las 59 predicciones
    python modelo_final.py tabla_maestra.csv --rapido   # solo las predicciones, sin validar

`tabla_maestra.csv` sale del notebook (197 parcelas * variables). Solo usa las columnas ubi_* y fen_*.
Requiere numpy, pandas y scikit-learn.
"""
import sys
import numpy as np
import pandas as pd
from scipy.optimize import nnls
from sklearn.base import BaseEstimator, RegressorMixin, TransformerMixin, clone
from sklearn.impute import SimpleImputer
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import StratifiedKFold
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

PESOS = {'A': 0.4637, 'B': 0.5363}                                  # NNLS sobre predicciones fuera de fold
SEMIANCHO_80 = {'medido': 0.568, 'redondeado': 0.554}               # intervalo conformal al 80 %
MUN_REDONDEADOS = {'CALPULALPAN', 'SINGUILUCAN', 'EMILIANO ZAPATA', 'APAN', 'NANACAMILPA DE MARIANO ARISTA'}


# ── MODELO A ─────────────────────────────────────────────────────────────────
class PriorEspacialResidual(BaseEstimator, RegressorMixin):
    def __init__(self, k_vecinos=40, suavizado=0.5, peso_knn=0.8, n_vars=3, prefijos_vars=('fen_',)):
        self.k_vecinos = k_vecinos
        self.suavizado = suavizado
        self.peso_knn = peso_knn
        self.n_vars = n_vars
        self.prefijos_vars = prefijos_vars

    @staticmethod
    def _xy_km(X):                       # lon/lat → km (aproximación local a 19.75° N)
        return np.c_[X['ubi_lon'].values * 111.32 * np.cos(np.radians(19.75)), X['ubi_lat'].values * 110.57]

    @staticmethod
    def _mun(X):
        cols = [c for c in X.columns if c.startswith('ubi_mun_')]
        return np.array(cols)[X[cols].values.argmax(1)]

    def _prior(self, X, fuera_de_si=False):
        mun = self._mun(X)
        s = pd.Series(mun).map(self.sum_mun_).fillna(0).values
        n = pd.Series(mun).map(self.n_mun_).fillna(0).values
        if fuera_de_si:                                  # en entrenamiento, la parcela no se ve a sí misma
            s, n = s - self.y_, n - 1
        p_mun = (s + self.suavizado * self.media_) / (n + self.suavizado)
        k = int(min(self.k_vecinos, len(self.y_) - 1))
        d, idx = self.nn_.kneighbors(self._xy_km(X), n_neighbors=k + int(fuera_de_si))
        if fuera_de_si:
            d, idx = d[:, 1:], idx[:, 1:]
        w = 1.0 / np.maximum(d, 0.05)
        p_knn = (self.y_[idx] * w).sum(1) / w.sum(1)
        return (1 - self.peso_knn) * p_mun + self.peso_knn * p_knn

    def fit(self, X, y):
        y = np.asarray(y, float)
        self.y_, self.media_ = y, y.mean()
        g = pd.DataFrame({'m': self._mun(X), 'y': y}).groupby('m').y
        self.sum_mun_, self.n_mun_ = g.sum(), g.count()
        self.nn_ = NearestNeighbors().fit(self._xy_km(X))
        prior = self._prior(X, fuera_de_si=True)
        resid = y - prior
        self.vars_cand_ = [c for c in X.columns if c.startswith(tuple(self.prefijos_vars))]
        Z = X[self.vars_cand_]
        self.med_ = Z.median()
        Z = Z.fillna(self.med_)
        self.mu_, self.sd_ = Z.mean(), Z.std().replace(0, 1).fillna(1)
        Z = (Z - self.mu_) / self.sd_
        corr = Z.apply(lambda c: np.corrcoef(c, resid)[0, 1] if c.std() > 0 else 0).fillna(0).abs()
        self.vars_ = list(corr.sort_values(ascending=False).index[: self.n_vars])
        self.ridge_ = RidgeCV(alphas=np.logspace(-1, 4, 30)).fit(np.c_[Z[self.vars_].values, prior], resid)
        return self

    def predict(self, X):
        prior = self._prior(X)
        Z = ((X[self.vars_cand_].fillna(self.med_) - self.mu_) / self.sd_)[self.vars_]
        return prior + self.ridge_.predict(np.c_[Z.values, prior])


# ── MODELO B ─────────────────────────────────────────────────────────────────
class SeleccionarColumnas(BaseEstimator, TransformerMixin):
    def __init__(self, prefijos=('ubi_',)):
        self.prefijos = prefijos

    def fit(self, X, y=None):
        self.cols_ = [c for c in X.columns if c.startswith(tuple(self.prefijos))]
        return self

    def transform(self, X):
        return X[self.cols_]


def modelo_B():
    return make_pipeline(SeleccionarColumnas(('ubi_',)), SimpleImputer(strategy='median'),
                         StandardScaler(), RidgeCV(alphas=np.logspace(-1, 3.5, 40)))


# ── Datos, entrenamiento y predicción ────────────────────────────────────────
def cargar(ruta):
    T = pd.read_csv(ruta, index_col='ID_POLIGONO')
    X = T[[c for c in T.columns if c.startswith(('ubi_', 'fen_'))]].astype(float)
    tr = (T.CONJUNTO == 'ENTRENAMIENTO').values
    return T, X[tr], T.loc[tr, 'RENDIMIENTO_T_HA'].values, X[~tr]


def entrenar(X_tr, y_tr):
    return {'A': PriorEspacialResidual().fit(X_tr, y_tr), 'B': modelo_B().fit(X_tr, y_tr)}


def predecir(modelos, X, y_tr):
    p = sum(PESOS[k] * modelos[k].predict(X) for k in PESOS)
    return np.clip(p, y_tr.min(), y_tr.max())


def validar(X_tr, y_tr, municipios, n_rep=10, seed=42 + 2000):
    """RMSE, MAE y R² con validación cruzada 5 folds × 10 repeticiones, estratificada por municipio
    (las mismas particiones de confirmación del notebook, semilla 2042).

    Cada parcela se predice con un modelo que NO la vio al entrenar. Los pesos del ensamble se
    estiman con 9 repeticiones y se evalúan en la décima (RMSE "anidado"), así que la cifra no
    premia al ensamble por haberse ajustado a sí mismo.
    """
    mun = pd.Series(municipios)
    estrato = mun.where(mun.map(mun.value_counts()) >= 5, 'OTROS').values
    oof = {k: np.zeros((n_rep, len(y_tr))) for k in PESOS}
    for r in range(n_rep):
        for a, b in StratifiedKFold(5, shuffle=True, random_state=seed + r).split(np.zeros(len(y_tr)), estrato):
            for k, m in {'A': PriorEspacialResidual(), 'B': modelo_B()}.items():
                oof[k][r, b] = clone(m).fit(X_tr.iloc[a], y_tr[a]).predict(X_tr.iloc[b])
    M = np.stack([oof['A'], oof['B']], -1)
    filas = []
    for r in range(n_rep):
        A = np.concatenate([M[i] for i in range(n_rep) if i != r])
        w, _ = nnls(A, np.tile(y_tr, n_rep - 1))
        p = M[r] @ (w / w.sum())
        filas.append({'repeticion': r + 1,
                      'RMSE': np.sqrt(np.mean((p - y_tr) ** 2)),
                      'MAE': np.mean(np.abs(p - y_tr)),
                      'R2': 1 - np.sum((p - y_tr) ** 2) / np.sum((y_tr - y_tr.mean()) ** 2)})
    return pd.DataFrame(filas)


if __name__ == '__main__':
    ruta = sys.argv[1] if len(sys.argv) > 1 else 'tabla_maestra.csv'
    T, X_tr, y_tr, X_te = cargar(ruta)

    # 1) Validación: aquí sale el RMSE (las 59 parcelas no tienen rendimiento, así que no hay RMSE de ellas)
    if '--rapido' not in sys.argv:
        print('Validando (5 folds × 10 repeticiones, ~7 s)...')
        met = validar(X_tr, y_tr, T.loc[X_tr.index, 'Municipio'].values)
        met.to_csv('metricas_validacion.csv', index=False)
        print('\n══════════ RESULTADO DE LA VALIDACIÓN ══════════')
        print(f"  RMSE = {met.RMSE.mean():.3f} ± {met.RMSE.std():.3f} t/ha")
        print(f"  MAE  = {met.MAE.mean():.3f} t/ha")
        print(f"  R²   = {met.R2.mean():.3f}")
        print(f"  Referencia: predecir siempre la media da RMSE = {y_tr.std():.3f}")
        print('════════════════════════════════════════════════')
        print('  (detalle por repetición en metricas_validacion.csv)\n')

    # 2) Modelo final con las 138 parcelas → 59 predicciones
    modelos = entrenar(X_tr, y_tr)
    pred = predecir(modelos, X_te, y_tr)
    regimen = np.where(T.loc[X_te.index, 'Municipio'].isin(MUN_REDONDEADOS), 'redondeado', 'medido')
    q = np.array([SEMIANCHO_80[r] for r in regimen])
    out = pd.DataFrame({'ID_POLIGONO': X_te.index, 'RENDIMIENTO_T_HA': np.round(pred, 3)})
    out.to_csv('predicciones_59_parcelas.csv', index=False)
    out.assign(inf_80=np.round(pred - q, 2), sup_80=np.round(pred + q, 2)).to_csv('predicciones_59_con_intervalos.csv', index=False)
    print('Variables de fenología elegidas por el modelo A:', modelos['A'].vars_)
    print('Predicciones de las 59 parcelas:', out.RENDIMIENTO_T_HA.describe().round(2).to_dict())
    print('Archivos escritos: predicciones_59_parcelas.csv, predicciones_59_con_intervalos.csv'
          + ('' if '--rapido' in sys.argv else ', metricas_validacion.csv'))
