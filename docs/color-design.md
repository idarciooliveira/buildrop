# BuildDrop Color Design

This project uses semantic Tailwind color tokens so UI stays consistent with the brand palette.

## Core brand colors

- **Primary:** `#502274`
- **Secondary:** `#25F45C`
- **Complement:** `#F3F3F1`

## Tailwind token names

Defined in `src/styles/global.css`:

- `--color-brand-primary`
- `--color-brand-secondary`
- `--color-brand-complement`

Use these utilities instead of raw hex values:

- `bg-brand-primary`, `text-brand-primary`, `border-brand-primary`
- `bg-brand-secondary`, `text-brand-secondary`, `border-brand-secondary`
- `bg-brand-complement`, `text-brand-complement`, `border-brand-complement`

## Usage guidance

- Use **primary** for key navigation, primary CTAs, and active states.
- Use **secondary** for highlights, success accents, and attention cues.
- Use **complement** for soft surfaces and page backgrounds (for example: `bg-brand-complement`).
- Prefer semantic color utilities over inline hex values to keep design updates centralized.
