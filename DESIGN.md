---
name: RuptureWatch TN
description: Warm editorial public pages and legible operational dashboards for medicine shortages in Tunisia.
colors:
  ink: "#153442"
  ink-muted: "#475e67"
  limestone: "#f6f2ec"
  paper: "#f5f3ef"
  powder-blue: "#ddeef3"
  surface: "#ffffff"
  hairline: "#ccd8da"
  primary: "#235c76"
  primary-hover: "#174359"
  scenario: "#163846"
  scenario-accent: "#bce1ef"
  watch: "#8b5900"
  probable: "#a94412"
  confirmed: "#ae233a"
  cleared: "#216d54"
typography:
  display:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "clamp(2.5rem, 4.35vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.042em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.875rem"
rounded:
  panel: "12px"
  chapter: "1.35rem"
  action: "6px"
spacing:
  mobile-gutter: "16px"
  desktop-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  story-panel:
    backgroundColor: "{colors.powder-blue}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chapter}"
---

## Overview

**Creative North Star: “Au comptoir”**

Start at the pharmacy shelf. Use a real, credited photograph of pharmacy work and let the next chapter explain how an undelivered order becomes a shortage signal. Present the pharmacist, wholesaler and anonymous patient paths by what each person can do.

## Colors

Limestone carries the homepage. Powder blue groups the scenario summary and active interactions, while deep blue identifies actions. Keep the scenario and professional rail in petrol so the product signals and progress remain legible. Level colors are paired with names and shapes.

## Typography

Use IBM Plex Sans for French, IBM Plex Sans Arabic for Arabic, and IBM Plex Mono for aligned figures, timestamps and identifiers. Body contrast is 11.8:1 on limestone, muted text is 6.1:1 on limestone and 5.7:1 on powder blue, and primary buttons are 7.3:1 against white text.

## Layout

The first viewport carries the headline, two actions and the pharmacy photograph. The scroll moves through the scenario, role entry and resources. On phones the copy and actions precede the image, and the role list stacks. Keep the console layout tighter so daily counts, dates and next actions read together.

## Shapes

Use a modest radius on actions, workspace panels and story chapters. Separate rows with hairlines.

## Components

Use the custom RW monogram in the wordmark, app icons and share cards. The header wordmark opens the main homepage from every patient page.

In a daily activity chart, give the last nonzero day a stronger shade, keep small counts hatched and include the text table. The powder-blue story panel shows three steps with their labels. Its small scroll transition runs only when motion is enabled.

## Do's and Don'ts

- Give each link a destination that helps with a real task.
- Use licensed, documentary photography for pharmacy work. Record the credit and terms in `data/SOURCES.md`.
- Keep numerical evidence tied to a source, period and origin, and use meaningful empty states.
