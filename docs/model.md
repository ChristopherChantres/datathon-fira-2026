# The model, in figures

Source of truth for any figure the page cites. If a number is not here or in `data/*.json`, the page does not show it.

## The challenge

- Reto AgroCebada FIRA 2026: predict rainfed barley grain yield (t/ha) for 59 parcels in Hidalgo, Tlaxcala and Puebla, production cycle April–October 2025.
- 197 geo-referenced parcels in 9 municipalities; 138 with known yield (training), 59 to predict.
- Committee metrics: RMSE, MAE and R².
- Training yields: 2.00–5.59 t/ha, mean 3.96. By state: Puebla 4.48, Hidalgo 3.76, Tlaxcala 2.98.

## Data used

- Planet (almost daily, 2025) and Sentinel-2 / Landsat (2022–2025) vegetation indices per parcel and date.
- CHIRPS rainfall and CHIRTS-ERA5 temperature (monthly, ~5 km); INEGI elevation and slope (120 m).
- All summarized in a master table of 197 parcels × 271 features.
- Phenology: each parcel's NDVI curve is cleaned of cloud dips, smoothed (Savitzky–Golay toward the upper envelope) and described by its milestones. Median start of season: June 15 (day 166); median peak: September 2 (day 245); median end: November 7 (day 311).

## The final model (ensemble v1)

`prediction = 0.46 × A + 0.54 × B`, clipped to 2.00–5.59 t/ha.

- **Model A · spatial prior + residual.**
  1. Prior by location = 20 % municipal mean (shrunk toward the global mean with smoothing 0.5) + 80 % inverse-distance mean of the 40 nearest training parcels.
  2. Correction: a ridge regression on the 3 phenology variables most correlated with what location does not explain. In the final fit they are the parcel's **initial greenness** before the crop starts: LAI (Planet), NDVI (Sentinel-2) and NDVI (Planet). The correction is small: 0.02–0.03 t/ha per standard deviation.
- **Model B · location ridge.** Longitude, latitude, area, log of area, state and municipality (16 variables).
- Ensemble weights come from non-negative least squares on out-of-fold predictions.

Key message: location explains most of the yield; satellite phenology refines it.

## How well it works

- Validation: 5-fold cross-validation × 10 repeats, stratified by municipality; every parcel is predicted by models that never saw it.
- **RMSE 0.479 ± 0.005 t/ha · MAE 0.330 · R² 0.681.**
- References: always predicting the mean gives RMSE 0.848; predicting each municipality's mean gives 0.516.
- 15 alternatives were tested (gradient boosting, random forests, SVR, PCA, PLS, Gaussian processes, mixed models, terrain variables, robust losses…); none beat the final model in a statistically distinguishable way.
- 80 % prediction intervals (conformal, one width per label regime): ±0.57 t/ha (measured labels) and ±0.55 t/ha (rounded labels); CV coverage 79.9 % and 81.6 %.

## The 59 predictions

- Mean 3.94 t/ha, range 2.77–4.73. Puebla 4.47, Hidalgo 3.89, Tlaxcala 2.97.
- 4 parcels carry an **attention flag**: one of the 10 worst-predicted training parcels lies within 500 m.

## Why it matters (financial inclusion)

The interval gives each parcel a measurable risk: a credit or crop-insurance analyst can see not only the expected yield but how sure the model is, using public satellite and climate data instead of field visits.

## Guide questions of the challenge

1. Most important index: the parcel's initial greenness (LAI and NDVI before the season starts). Across zones, season length is the satellite variable most correlated with yield (r ≈ +0.45).
2. Climate variable with most weight: April–June rainfall (establishment). Climate acts mostly as a zone indicator: the 197 parcels fall in only 25 climate pixels.
3. Best combination: location + 3 phenology variables. Adding more satellite blocks makes the error worse with only 138 parcels.
