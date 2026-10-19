# Visual style · shared with the team's video

> **PROVISIONAL.** The hex values below are the Manim defaults used as a starting point. Replace them with the exact colors the video team uses (from their Manim config) so the page and the video look like one piece. Keep the token names.

## Direction

3Blue1Brown: black ground, few colors, each with one fixed meaning across the whole page; objects transform into each other instead of cutting; formulas are *written* (stroke reveal); one idea per screen; calm, smooth motion (~1 s ease-in-out, Manim's `smooth`).

## Color tokens

| Token | Meaning on the page | Provisional hex |
| --- | --- | --- |
| `--bg` | Background | `#000000` |
| `--ink` | Main text, outlines of states | `#FFFFFF` |
| `--ink-muted` | Secondary text, grid lines | `#888888` |
| `--location` | Anything about location: municipality, neighbors, model B | `#58C4DD` (Manim BLUE_C) |
| `--phenology` | Satellite / NDVI / phenology, model A correction | `#83C167` (Manim GREEN_C) |
| `--prediction` | The predicted yield, the ensemble | `#FFFF00` (Manim YELLOW_C) |
| `--error` | Errors, attention flags | `#FC6255` (Manim RED_C) |
| `--train` | Parcels with known yield | `#BBBBBB` (Manim GREY_B) |

Rule: a concept never changes color between sections.

## Typography

- Formulas: KaTeX (Computer Modern), the same look as the video's LaTeX.
- Text: one clean sans-serif for UI and body (team to confirm; a neutral default is fine until then).

## Motion

- Default easing `power2.inOut`, durations 0.8–1.2 s; stagger lists by 0.05–0.1 s.
- Drawing lines/curves: DrawSVG from 0 % to 100 %.
- Transformations between shapes: MorphSVG.
- `prefers-reduced-motion: reduce` → no motion, final states shown immediately.
