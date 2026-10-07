# Design system

## Identity

Minimal, premium, calm, energetic in one colour. Rings, whitespace, typography, light. No emoji, no gradients-as-decoration, no SaaS card walls.

- **Mark**: a ring that is almost closed, with an ember arc. The dial is the same shape at full size.
- **Wordmark**: SPRINT in Manrope ExtraBold, tracked wide.
- **Tagline** (used sparingly): Turn goals into momentum.

## Colour

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| bg | `#0B0C10` | `#F7F6F2` | Screen |
| surface | `#15181F` | `#FFFFFF` | Cards |
| text | `#F4F3EF` | `#15161A` | Primary text |
| textMuted | `#A3A6B1` | `#62656F` | Secondary |
| accent (ember) | `#FF6B3D` | `#F05A28` | The one energetic colour: start, progress, momentum |
| success (mint) | `#3DDC97` | `#1FA971` | Completion |
| ringTrack | 7% white | 7% ink | Empty ring |

Mission categories carry a hue (work ember, health mint, personal sky, learning gold, creative rose, finance teal, home sand). Status is never colour-only: rings carry a percentage or a check, sprints carry a label.

## Type

- **Manrope** for the interface. 200 for the dial numerals (tabular figures), 500 body, 600–800 for emphasis and labels.
- **Instrument Serif** (regular + italic) for display moments: the onboarding question, the greeting, section titles. It gives Sprint a voice without a logo everywhere.
- Scale: display 40/44 · title 26/32 · heading 20/26 · subheading 17/23 · body 16/23 · small 14/20 · caption 12.5/17 · label 11.5 uppercase tracked.
- Dynamic Type: text scales up to 1.6× (1.2× for the dial).

## The dial

`components/Dial.tsx`. One ring. The arc **fills** as the sprint progresses so completion closes the circle. A soft wide stroke behind the arc is the light. Sixty faint ticks give it a tactile, instrument feel. The head of the arc is a luminous dot. While running it breathes (1.2% scale, 5.2 s). Paused: the arc goes neutral. Complete: the arc turns mint and fills in 700 ms.

Centre: a label (Remaining / Paused / Almost there), the time in Manrope ExtraLight with tabular numerals, and "Sprint n/N".

## Motion

Fades of 220–400 ms, springs on press (0.97 scale), a 3-2-1-Go countdown with scale-in, ring transitions of 1 s linear while ticking. Reduced motion (OS or in-app) shortens the countdown and removes breathing, pulse and press scale.

## Spacing and radius

4 · 8 · 12 · 16 · 24 · 32 · 48. Radii 10 · 16 · 22 · 28 and pill. Max content width 680 (1120 on the desktop home).

## Accessibility

Roles on everything (button, tab, timer, header), labels on icon-only controls, `accessibilityState` for selected/disabled/expanded, 44 pt minimum targets, keyboard reachability on web (the start button is reachable by Tab), contrast ≥ 4.5:1 for text on both themes, no information carried by colour alone.
