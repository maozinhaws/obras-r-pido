The objective is to implement a 3-tier theme system and a specialized, high-performance camera interface for capturing multiple site photos quickly.

### Themes Architecture
We will introduce three distinct visual directions that can be toggled in Settings:
1.  **Moderno (Default/Currentish):** Glassmorphism, liquid gradients, vibrant and clean for a younger demographic.
2.  **Brutalista:** Bold black borders, solid fills, sharp angles, and high-contrast orange/midnight tones for speed and clarity.
3.  **Minimalista:** Extreme high contrast (Black/White), simplified layout, and oversized typography (1.2x scale) optimized for maximum readability.

### Camera Interface
A new full-screen camera modal will replace the standard file input where needed:
- **Instant Capture:** Clicking the shutter saves the photo immediately and updates a thumbnail gallery without leaving the camera view.
- **Controls:**
    - Large tactile shutter button.
    - Vertical zoom slider (optical/digital where supported).
    - Toggle for device torch (flash).
- **Review:** Thumbnails of captured photos appear on the side; clicking one opens it for deletion/review.

### Technical Implementation

#### 1. Data Layer (Dexie)
- Add `tema` property to `ConfigEmpresa` in `src/lib/db.ts`.

#### 2. Styling System (Tailwind + CSS Variables)
- Refactor `src/styles.css` to use theme scopes:
    - `:root[data-theme="brutalista"]`
    - `:root[data-theme="minimalista"]`
- Use the `Syne` font for display in Modern/Brutal, but switch to heavy weight `Inter` for Minimalist.
- Adjust `radius`, `border-width`, and `font-size` based on the active theme variable.

#### 3. Core Components
- **`ThemeHandler`:** A headless component in `__root.tsx` that subscribes to the config DB and applies `data-theme` to the document root.
- **`CameraModal`:** 
    - Use `video` + `MediaStream` API.
    - Use `ImageCapture` for zoom and torch (with fallback constraints).
    - Responsive layout: Side thumbnails for desktop/tablets, bottom thumbnails for mobile.

#### 4. Settings Page
- Add a visual "Theme Selection" card with previews.

#### 5. Integration
- Replace the simple photo picker in `orcamentos.novo.tsx` with the new `CameraModal`.
