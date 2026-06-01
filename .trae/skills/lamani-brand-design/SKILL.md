---
name: "lamani-brand-design"
description: "LamaniAds brand and UI design guideline inspired by Vercel and Linear. Invoke when designing/building UI components, pages, marketing surfaces, or making any visual/UX decision in apps/web or packages/ui."
---

# LamaniAds Brand Design Guideline

Inspired by Vercel and Linear: minimal, monochrome-first, dense yet generous, performance-feeling.
Apply this skill to every UI surface (apps/web, packages/ui, marketing, MCP UI).

## 1. Brand Principles

1. Quiet confidence. Show data, not decoration.
2. Fast feel. Skeletons under 100ms, no spinner-only states.
3. Keyboard first. Every primary action reachable via cmdk palette.
4. Honest density. Information-rich without clutter; whitespace earns its place.
5. Dark by default. Light theme is a peer, not an afterthought.
6. Monochrome with a single accent. Color signals state, not style.

## 2. Color System

**IMPORTANT**: Use explicit Tailwind `zinc-*` scale with `dark:` variants. Do NOT use CSS variable-based colors like `border-border/40` or `text-muted-foreground/70` — they don't support opacity modifiers and produce no CSS output.

### Neutral scale (zinc)
Use Tailwind's built-in zinc scale with explicit dark mode variants:

**Backgrounds:**
- Primary surface: `bg-white dark:bg-zinc-950`
- Muted surface: `bg-zinc-50 dark:bg-zinc-900`
- Hover states: `hover:bg-zinc-100 dark:hover:bg-zinc-800`

**Text:**
- Primary: `text-zinc-900 dark:text-zinc-50`
- Secondary: `text-zinc-700 dark:text-zinc-300`
- Tertiary/muted: `text-zinc-500 dark:text-zinc-400`
- Disabled/placeholder: `text-zinc-400 dark:text-zinc-600`

**Borders:**
- Default: `border-zinc-200 dark:border-zinc-800`
- Subtle: `border-zinc-100 dark:border-zinc-900`
- Hover: `hover:border-zinc-400 dark:hover:border-zinc-600`

### Accent (single)
- Primary CTA: `bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900`
- Hover: add `hover:opacity-90`

### Semantic state
- success `bg-emerald-500` or `text-emerald-500`
- warning `bg-amber-500` or `text-amber-500`
- danger `bg-red-500` or `text-red-500`
- info `bg-blue-500` or `text-blue-500`
Use only on status pills, badges, toasts. Never on primary surfaces.

### Platform tags
- meta `bg-blue-500/10 text-blue-400`
- google `bg-emerald-500/10 text-emerald-400`

## 3. Typography

- Sans: `Geist` (fallback `Inter`, then `system-ui`).
- Mono: `Geist Mono` (fallback `JetBrains Mono`, `ui-monospace`). Use for IDs, budgets, dates, code.
- Numerals: `font-variant-numeric: tabular-nums` on every numeric column.

### Scale
- `text-xs` 12 / 16 — labels, table headers (uppercase, tracking-wider)
- `text-sm` 14 / 20 — body, table cells, buttons
- `text-base` 15 / 24 — long-form
- `text-lg` 17 / 26 — section titles
- `text-2xl` 24 / 32 — page titles
- `text-3xl` 30 / 38 — hero only

### Weight
- 400 body, 500 UI labels, 600 titles, 700 hero. Avoid 800/900.

## 4. Spacing and Layout

- 4px base grid. Use Tailwind `0/1/2/3/4/6/8/12/16` only.
- Page gutter: `px-6` mobile, `px-8` desktop.
- Section rhythm: `space-y-6` inside content; `space-y-12` between sections.
- Max content width: `max-w-7xl` for tables, `max-w-3xl` for prose, `max-w-md` for forms.
- Sidebar: `w-64`. Topbar: `h-14`. Stick to it.

## 5. Radius, Border, Shadow

- Radius: `rounded-md` (6px) default, `rounded-lg` (8px) cards, `rounded-full` pills/avatars.
- Border: 1px hairline using `border-zinc-200 dark:border-zinc-800`. Never 2px.
- Shadow: avoid. Use border + slight bg shift. One allowed: `shadow-sm` on floating menus.
- Focus: `ring-1 ring-zinc-400 dark:ring-zinc-600 ring-offset-0`. No glow.

## 6. Components (shadcn-aligned)

- Button: ghost is default in tables, outline for secondary, solid (inverted) only for primary CTA. One primary per view.
- Input: 36px height, no inner shadow, label above with `text-xs text-zinc-500 dark:text-zinc-400`.
- Table: zebra off, hairline rows, hover `hover:bg-zinc-100 dark:hover:bg-zinc-800`, sticky header `bg-white dark:bg-zinc-950 backdrop-blur`.
- Badge: `text-[10px] uppercase tracking-widest`, semantic bg at 10% opacity.
- Dialog/Sheet: animate `translate-x-full` for sheet (right edge), `fade + scale-95` for dialog. Duration 150ms.
- Command palette: cmdk, opens on `⌘K`. Required on every authenticated page.
- Toast: top-right, auto-dismiss 4s, max 3 stacked.
- Empty state: icon (Lucide outline) + 1 line title + 1 line action. No illustrations.

## 7. Iconography

- Library: `lucide-react` only. Stroke 1.5, size 16 inline / 20 in buttons / 24 in headers.
- Never mix icon libraries. No emoji in product UI.

## 8. Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (Linear's standard).
- Duration: 120ms micro, 200ms surfaces, 320ms page transitions. Never longer.
- Honor `prefers-reduced-motion`. No parallax, no auto-play.

## 9. Voice and Tone

- Sentence case for everything: titles, buttons, menus.
- Verbs over nouns: "Connect Meta", not "Meta Connection".
- Errors are specific and actionable: "Token expired. Reconnect Google to resume sync." Avoid "Something went wrong".
- No marketing fluff in product. Save adjectives for `/`.
- Numbers: 1,234.56 with locale-aware formatting; currency uses ISO code suffix (e.g., `1,234.56 USD`).

## 10. Accessibility

- WCAG AA contrast on every text/bg pair.
- Focus visible always; never `outline: none` without replacement.
- Keyboard: all interactive elements reachable; trap focus inside modals.
- Live regions for async results (sync complete, draft executed).
- Test with `axe-core` in Storybook per component.

## 11. Dark Mode

- Class strategy `dark` on `<html>`. Default to system, persist user choice.
- Never invert images; provide dark variants. Logos use the monochrome lockup.

## 12. Marketing Surfaces

- Hero: black background, white type, single accent line, no gradients.
- Use grain or noise at 2% opacity max. No glassmorphism.
- Screenshots framed in `rounded-lg border border-zinc-200 dark:border-zinc-800` only.

## 13. Anti-patterns (do not ship)

- Drop shadows on cards.
- Multi-color brand gradients.
- Rounded-2xl on inputs.
- Centered body text in product UI.
- Emojis in buttons.
- Loading spinners as the only state.
- Two primary buttons in one view.

## 14. Implementation Checklist

When building a new page or component:

- [ ] Use explicit `zinc-*` Tailwind classes with `dark:` variants, NOT CSS variable-based colors.
- [ ] Empty, loading (skeleton), error, permission-denied, success states present.
- [ ] Light + dark verified.
- [ ] Keyboard path verified (Tab + ⌘K).
- [ ] axe-core green.
- [ ] Tabular numerals on numeric columns.
- [ ] One primary action max.
- [ ] Copy reviewed against voice rules in section 9.

## 15. Color Implementation Notes

**Why explicit zinc classes?**
- CSS variables defined as hex values (`#262626`) cannot use Tailwind opacity modifiers like `/40`
- Classes like `border-border/40` or `text-muted-foreground/70` produce zero CSS output
- Explicit `zinc-*` classes with `dark:` variants work reliably across all Tailwind features
- Pattern: `border-zinc-200 dark:border-zinc-800` for subtle hairlines matching Vercel aesthetic

## 16. References

- Vercel design — geometric type, monochrome, mono numerals, tight density.
- Linear design — motion easing, command palette, hairline borders, status semantics.
- shadcn/ui — component primitives we extend, not replace.
