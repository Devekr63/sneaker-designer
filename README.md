# 👟 Sneaker Designer

A 2D sneaker designer where you control the **shape, size, parts and colors**. It covers Phase 1 of [`../sneaker-design-app-guide.md`](../sneaker-design-app-guide.md), plus shape editing and custom parts.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Features

### 📐 Shape & Size tab
- **Style presets:** Runner, Court Low, Mid-Top, High-Top, Chunky, Racer.
- **Drag the orange points** on the shoe to move the toe, throat, collar front, collar dip, heel height, heel bulge, toe cap seam, heel counter seam, and midsole thickness at the toe and heel.
- **Toe end:** pick a style (Round, Pointed, Square, Almond, Bumper, Chisel), or shape it yourself:
  - drag the ● nose (how far forward and how high the front of the upper sits) and the ◆ sole tip
  - use the sliders for nose reach and height, sole tip reach and height, and sole tip shape (pointed → square)
  - push the sole tip high to wrap the outsole up the front like a rubber bumper
  - bend the toe's roundness and underside curves with their blue squares
- **Drag the blue squares** to bend the curve between the points. Each section can bulge out or pull in:
  - toe roundness
  - vamp, lacing line, collar front and collar back
  - heel
  - midsole arch, toe spring and heel rocker on the sole

  Double-click a square to reset that curve. The same controls are available as sliders under **Curves**, with a *Reset curves* button. The *Points / Curves / Both* switch picks which handles are shown.
- **Sliders** for proportions, collar height (low → high top), toe height, toe spring, sole thickness, toe cap, heel counter, tongue height and number of eyelets (3–10). Values are shown in mm.
- **Shoe size** EU 35–49 with approximate US/UK conversions, plus an on-canvas ruler that shows last length and heel height.

### 🖼️ Work from your own sketch
- **Shape & Size → Reference sketch:** upload a side-view drawing or photo.
  - Flip it so the toe points left, then use the sliders to size and move it until it lines up with the shoe.
  - Show it **over** the shoe (multiplied, so white paper disappears) or **behind** it, at any opacity.
  - It's for the editor only: it never appears in exports and isn't saved inside designs.
- **✂️ Edit outline point by point:** on the toe box, vamp, side stripe or heel counter, this turns the panel into your own part with the exact same shape, so you can drag its seam anywhere.
- **Sharp + smooth in one shape:** Shift-click any point of your own part to make it a sharp corner (■) or smooth again.
- **Stitching:** a toggle on every part draws a dashed stitch line just inside its edge.
- **Collar width** slider for thin trims or thick padding.

### ➕ Your own parts
- **＋ Add a part** opens a library of 10 templates: mudguard, heel wing, toe bumper, mesh window, star / circle / lightning badges, velcro strap, ankle strap and an "air" window in the sole.
- **✏️ Draw your own shape:** click points on the shoe, then click the first point (or press Enter) to close it. Backspace removes the last point; Esc cancels.
- Edit any added part:
  - drag it to move it
  - drag its white points to reshape it
  - double-click its edge to add a point, and double-click a point to remove it
  - rename it, give it a color and material, or make it see-through
  - switch between smooth and sharp corners, trim it to the upper's outline, or place it above the laces and sole
  - reorder, duplicate or delete it (Delete key)
- **Hide built-in parts** (toe box, vamp, side stripe, laces, collar, heel counter, heel tab) with the dot button in the parts list.

### 🎨 Style
- Color picker, hex input and swatches. Materials: leather, suede, mesh, knit, canvas, patent, foam and rubber.
- Printed text on the tongue and heel, a speckled midsole, and a translucent outsole.
- 7 colorways plus 🎲 *Surprise me*.

### 💾 Everything else
- Undo/redo (`Ctrl+Z` / `Ctrl+Y`). A whole drag counts as one step.
- Save to the gallery (`Ctrl+S`), with automatic draft saving. Export PNG/JSON and import JSON.
- Designs from v1 still open, using the default shape.

## How it works

```
src/
├── domain/        # types, parts, materials, colorways, shape params + presets + sizes
├── viewer2d/
│   ├── geometry.ts    # ShapeParams → every outline (splines, clipped panels, laces, sole)
│   └── SneakerSvg.tsx # renders a Design from that geometry
├── editor/        # panels, part library, canvas tools (handles, pen tool, ruler)
├── store/         # undo/redo + localStorage
└── export/        # PNG / JSON
```

- **The shape is data.** `ShapeParams` holds a few anchor points (toe, throat, collar, heel) and sole measurements. `geometry.ts` runs smooth Catmull-Rom curves through the anchors to build the upper's outline.
- **Panels are clipped.** The toe box, vamp, heel counter, collar and similar panels are drawn as large regions and trimmed to the upper outline with an SVG `clipPath`, so they fit any shape.
- **Points move with the shoe.** Custom parts store points as `(u, h)`:
  - `u` is the position from toe (0) to heel (1)
  - `h` is the height above the sole, or a percentage of the sole's thickness for points on the sole

  Because of this, added parts follow the shoe when its length or sole changes.

## Next steps

- Logo/image upload onto parts
- Backend + accounts (designs → Postgres JSONB)
- 3D viewer with React Three Fiber, driven by the same design JSON
- AI colorways: send the part list and a "vibe" to an LLM and apply the `{ partId: hex }` it returns
