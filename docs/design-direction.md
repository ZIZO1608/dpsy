# Design Direction — Digital Plus v2
_What we take from the best international tech stores, and how it shows up in the prototype_

## References studied (23 Nov 2026)
| Store | What they do best | What we borrow |
|---|---|---|
| **Apple Store** | Calm white space, big product photos, one row of category icons, "The latest" cards that scroll sideways | Category rail, generous spacing, the hero slider with progress bars |
| **ROG (asus.com)** | Dark, cinematic hero, glowing product shots, bold uppercase headlines | Dark hero with a glow behind the product, a gaming tone for the ROG/TUF sections |
| **NZXT** | Rounded hero cards, minimal nav, a PC builder (BLD) that feels like a product, not a form | Step-by-step builder built from part cards, rounded 20–28px surfaces |
| **Caseking (DE)** | A selling-points strip under the header, "King of the Day" deal, dense category tiles, mega menu | Selling-points bar, **Deal of the Day with countdown + stock bar**, mega menu |
| **Scan / Newegg / Micro Center** | Serious filtering: facets, sort, active filter chips, compare | **Category page with filters**, compare tray (up to 4), grid/list toggle |
| **Best Buy / Amazon** | Sticky buy box, "frequently bought together", delivery estimate | Sticky buy box, bundle builder, a delivery estimate by city |

## Design system
- **Feel:** "Apple-clean store, ROG-dark moments." Light, calm shopping pages, with dark cinematic blocks for the hero, the deal of the day and the PC builder.
- **Colour:** ink `#0A0D12`, brand lime `#8BD13F` (taken from the Digital Plus logo, brightened for dark backgrounds), deep green `#4E8A1C` for text on light backgrounds, red `#F0444B` for discounts only.
- **Type:** Inter Tight for headings (tight, confident), Inter for body text, IBM Plex Sans Arabic for Arabic.
- **Shape:** 12px controls, 18px cards, 28px hero blocks. Soft two-layer shadows only on hover.
- **Motion:** 150–300ms ease-out. Cards lift on hover, the slider progress bars fill, the cart drawer slides in. Nothing bounces. Motion is reduced when the visitor's device asks for it.

## Rules we hold to
- No fake reviews, ratings or "X people bought this". Use real data only, once the store collects it.
- Every price shows its update date. Discounts show the old price struck through.
- WhatsApp is always one tap away, but it never covers content.
- Arabic is first-class: full right-to-left layout, not a translated afterthought.
