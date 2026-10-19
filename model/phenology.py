"""
phenology.py · AgroCebada FIRA 2026

Season curve and milestones for one parcel, exactly as computed in the modelling
notebook (cell "8b. Fenología por parcela"). The milestone values produced here are
the same `fen_pl_ndvi_*` columns stored in `tabla_maestra.csv`; `export_web_data.py`
checks that they match before writing the web data.

Algorithm
1. Median value per date, March 1 – December 15, 2025.
2. Drop sudden dips (> 20 % below the rolling median of 5 points): clouds the
   cloud-cover column missed.
3. Resample every 5 days, interpolate gaps.
4. Savitzky–Golay smoothing iterated toward the upper envelope (Chen et al., 2004).
5. Milestones: base (min of first 10 points), peak, start of season (SOS: first
   crossing of base + 30 % of amplitude), end of season (EOS: first point after the
   peak at or below base + 40 % of amplitude).
"""
import numpy as np
import pandas as pd
from scipy.signal import savgol_filter

CLOUD_MAX = 40
SOS_THRESHOLD, EOS_THRESHOLD = 0.30, 0.40
START, END = '2025-03-01', '2025-12-15'


def upper_envelope_sg(s, window=7, iters=3):
    v = s.values.astype(float)
    w = min(window, len(v) - (1 - len(v) % 2))
    if w < 5:
        return s
    fit = savgol_filter(v, w, 2)
    for _ in range(iters - 1):
        fit = savgol_filter(np.where(v > fit, v, fit), w, 2)
    return pd.Series(np.maximum(fit, 0), index=s.index)


def raw_series(g, col, start=START, end=END):
    """Median per date inside the season window (before any cleaning)."""
    s = g.groupby('fecha')[col].median().sort_index()
    return s[(s.index >= start) & (s.index <= end)]


def smooth_curve(g, col, start=START, end=END):
    s = raw_series(g, col, start, end)
    if len(s) < 8:
        return None
    local_median = s.rolling(5, center=True, min_periods=3).median()
    s = s[~((s < 0.8 * local_median) & (local_median > 0.25))]
    d = s.resample('5D').median().interpolate(limit_direction='both')
    return upper_envelope_sg(d)


def milestones(c):
    """Returns dict with base, peak, amplitude, peak/SOS/EOS dates and season length."""
    if c is None:
        return {}
    base, peak, t_peak = c.iloc[:10].min(), c.max(), c.idxmax()
    amp = peak - base
    out = {'base': float(base), 'peak': float(peak), 'amplitude': float(amp), 'peakDoy': int(t_peak.dayofyear),
           'peakDate': t_peak.strftime('%Y-%m-%d')}
    if amp < 0.1:
        return out
    pre, post = c[:t_peak], c[t_peak:]
    sos = pre[pre >= base + SOS_THRESHOLD * amp].index[0]
    eos_c = post[post <= base + EOS_THRESHOLD * amp]
    eos = eos_c.index[0] if len(eos_c) else c.index[-1]
    out.update({'sosDoy': int(sos.dayofyear), 'sosDate': sos.strftime('%Y-%m-%d'),
                'eosDoy': int(eos.dayofyear), 'eosDate': eos.strftime('%Y-%m-%d'),
                'seasonLengthDays': int((eos - sos).days)})
    return out
