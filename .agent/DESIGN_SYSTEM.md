# Design System - COMPETIR

This document defines the visual standards for the COMPETIR project. Adherence to these rules is mandatory for all UI development.

## 🔡 Typography System

The project uses a semantic typography scale defined in `globals.css`. Do NOT use arbitrary font sizes or weights.

### Semantic Tokens

| Token | CSS Class | Usage | Recommended Weight |
| :--- | :--- | :--- | :--- |
| **H1** | `text-h1` | Page titles, major section headers | 700 (Bold) |
| **H2** | `text-h2` | Card titles, subsection headers | 600 (SemiBold) / 700 |
| **H3** | `text-h3` | Group titles, small card headers | 600 / 500 (Medium) |
| **Body** | `text-body` | Primary content, long text | 400 (Regular) |
| **UI** | `text-ui` | Buttons, inputs, table data, navigation | 500 / 600 |
| **Label** | `text-label` | Form labels, badges, metadata headers | 600 / 700 (Uppercase recommended) |
| **Caption** | `text-caption` | Helper text, descriptions, table captions | 400 / 500 |

### Rules of Engagement

1. **No Inline Sizes**: Never use `text-sm`, `text-lg`, etc., directly for content. Always map to a semantic token.
2. **Restricted Weights**: Use ONLY 400, 500, 600, or 700.
3. **Encapsulation**: Prefer using base components (`Button`, `Input`, `Card`, `Table`) as they already implement these standards.
4. **Contrast**: Ensure visibility for all color variants (e.g., White Belt specific styling).

---

## 🎨 Color System
*(To be expanded)*

## 📐 Layout & Spacing
*(To be expanded)*
