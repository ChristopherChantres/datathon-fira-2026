// The only hand-typed figures on the page. Each one is stated in docs/model.md; everything
// else comes from data/*.json. Do not add a figure here that docs/model.md does not state.

export const facts = {
  /** docs/model.md · Guide questions 1: "season length is the satellite variable most correlated with yield (r ≈ +0.45)". */
  seasonLengthCorrelation: 0.45,
  /** docs/model.md · Guide questions 2: "the 197 parcels fall in only 25 climate pixels". */
  climatePixels: 25,
  /** docs/model.md · Data used: CHIRPS / CHIRTS-ERA5 climate grids are "~5 km". */
  climatePixelKm: 5,
  /** docs/model.md · Guide questions 2: "April–June rainfall (establishment)". Months, not a figure. */
  establishmentRain: 'abril a junio',
  /** docs/model.md · The 59 predictions: attention flag = "one of the 10 worst-predicted training parcels lies within 500 m". */
  attentionWorstN: 10,
  attentionRadiusM: 500,
} as const;
