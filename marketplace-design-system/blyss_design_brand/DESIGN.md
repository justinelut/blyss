# Design System Specification: High-End Editorial Marketplace

## 1. Overview & Creative North Star: "The Modern Curator"
This design system is built to move beyond the generic "grid-of-squares" marketplace. Our Creative North Star is **The Modern Curator**—a philosophy that treats every digital asset, subscription, and Kenyan-made creation as a piece of art. 

We break the "template" look through **Intentional Asymmetry**. By utilizing overlapping elements (e.g., a product image slightly breaking the container of a text block) and a high-contrast typography scale, we create a rhythm that feels editorial rather than transactional. This system prioritizes breathing room and tonal depth over rigid borders, ensuring the interface feels as premium as the creators it hosts.

---

## 2. Colors & Surface Philosophy
The palette balances the raw energy of Kenya’s creative scene (`Terracotta`, `Amber`) with the grounded authority of professional commerce (`Deep Teal`, `Charcoal`).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through:
1.  **Background Color Shifts:** Placing a `surface_container_low` section against a `surface` background.
2.  **Tonal Transitions:** Using the Spacing Scale to create "voids" that act as natural separators.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine paper. 
*   **Base:** `surface` (#fcf9f7) for the primary page background.
*   **Secondary Sections:** Use `surface_container_low` (#f6f3f1) to group content.
*   **Interactive Cards:** Use `surface_container_lowest` (#ffffff) to create a subtle "lift" against the off-white background.

### The "Glass & Gradient" Rule
To inject "soul" into the digital experience:
*   **Hero Areas:** Use subtle linear gradients transitioning from `primary` (#a73400) to `primary_container` (#cc4911) at a 135-degree angle.
*   **Floating Navigation:** Apply `surface_container_lowest` with a 20px `backdrop-blur` and 80% opacity to create a "frosted glass" effect, making the UI feel integrated into the vibrant creator imagery.

---

## 3. Typography: Editorial Authority
We utilize a high-contrast pairing to distinguish between the "Voice" (Headers) and the "Utility" (Interface).

*   **The Voice (Display & Headline):** `Epilogue`. Bold, expressive, and slightly wider. This font carries the "Warm & Energetic" personality. 
    *   *Usage:* `display-lg` (3.5rem) should be used for Hero statements with tight letter-spacing (-0.02em).
*   **The Utility (Title, Body, Labels):** `Inter`. Clean, highly legible, and modern.
    *   *Usage:* All functional UI elements (buttons, inputs, prices) use Inter to maintain "Trust."
*   **Hierarchy Note:** Always maintain at least a 2-step jump in the type scale between a header and body text to ensure a signature editorial look.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often too "heavy." We use light and color to create height.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. The contrast in "brightness" creates a natural lift without a single pixel of shadow.
*   **Ambient Shadows:** For high-priority floating elements (e.g., a "Buy Now" sticky bar), use an extra-diffused shadow: `Y: 12px, Blur: 32px, Color: rgba(27, 28, 27, 0.06)`. Note the use of `on_surface` (#1b1c1b) as the shadow tint rather than pure black.
*   **The "Ghost Border" Fallback:** If a divider is functionally required for accessibility, use `outline_variant` (#e1bfb4) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons (High-Conversion CTAs)
*   **Primary:** Background: `primary` (#a73400); Text: `on_primary` (#ffffff). Shape: `md` (0.75rem).
    *   *Signature Touch:* On hover, transition to `primary_container` with a subtle `xl` ambient shadow.
*   **Secondary:** Background: `secondary_container` (#9ff0fb); Text: `on_secondary_container` (#066f79). Used for "Message Creator" or "View Gallery."
*   **Tertiary:** No background. Text: `primary`. Use for low-emphasis actions like "Cancel."

### Product & Content Cards
*   **Constraint:** No borders. No internal dividers.
*   **Structure:** Use `surface_container_lowest` with a `DEFAULT` (0.5rem) corner radius. 
*   **Imagery:** Aspect ratio 4:5 (Editorial Tall). Images must have a `sm` (0.25rem) inner radius.
*   **Pricing:** Use `title-lg` in `on_surface` to make the value proposition clear and authoritative.

### Input Fields
*   **Base State:** `surface_container_high` background with no border. 
*   **Focus State:** 2px solid `secondary` (#006972). This "pop" of teal signals professional reliability and active state.
*   **Labeling:** Always use `label-md` in `on_surface_variant` (#594139) positioned above the field.

### Selection Chips
*   **Style:** Pill-shaped (`full` roundedness).
*   **Unselected:** `surface_container_highest` with `on_surface_variant` text.
*   **Selected:** `tertiary_fixed` (#ffdfa0) background with `on_tertiary_fixed` (#261a00) text.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. If a container is 24px from the left, try making the inner content 32px or 40px from the left to create a custom, "designed" feel.
*   **Do** lean into the Spacing Scale. Use `16` (4rem) or `20` (5rem) for vertical padding between major sections to let the high-quality imagery breathe.
*   **Do** use `secondary` (Deep Teal) for success states or trust-related badges, as it provides a professional counter-weight to the energetic `primary` Terracotta.

### Don’t
*   **Don't** use card-inside-card patterns with shadows. Use background color shifts (`surface_container` tiers) instead.
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#1b1c1b) to keep the "Warm" professional tone.
*   **Don't** use standard 1px horizontal rules (HR) to separate list items. Use 16px of vertical white space or a subtle `surface_container_low` background strip.