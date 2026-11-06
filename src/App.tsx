import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { applyColorway, randomColorway } from './domain/colorways'
import { createDesign } from './domain/design'
import { isCustomId, PART_BY_ID } from './domain/parts'
import type { CustomPart, Design, PartId, PartPoint, PartStyle, SelectId, UH } from './domain/types'
import { clampShape, DEFAULT_BENDS, DEFAULT_SHAPE } from './domain/shape'
import { CurveHandles, DrawLayer, ReferenceLayer, Ruler, ShapeHandles, VertexHandles } from './editor/canvasTools'
import { ReferencePanel } from './editor/ReferencePanel'
import { ColorwayBar } from './editor/ColorwayBar'
import { beginDrag, svgPoint } from './editor/drag'
import { Gallery } from './editor/Gallery'
import { createCustomPart, createDrawnPart, type PartTemplate } from './editor/partTemplates'
import { PartLibrary } from './editor/PartLibrary'
import { PartList } from './editor/PartList'
import { ShapePanel, type HandleMode } from './editor/ShapePanel'
import { StylePanel } from './editor/StylePanel'
import { exportJson, exportPng, importJson } from './export/exporters'
import {
  deleteFromGallery,
  loadDraft,
  loadGallery,
  loadReference,
  saveDraft,
  saveReference,
  saveToGallery,
  type ReferenceImage,
} from './store/storage'
import { useDesignHistory } from './store/useDesignHistory'
import { applyCurve, applyHandle, buildGeometry, panelToPoints, type EditablePanel, type Pt } from './viewer2d/geometry'
import { SneakerSvg } from './viewer2d/SneakerSvg'
import './App.css'

type Tab = 'style' | 'shape' | 'saved'

const TABS: { id: Tab; label: string }[] = [
  { id: 'style', label: '🎨 Style' },
  { id: 'shape', label: '📐 Shape & Size' },
  { id: 'saved', label: '💾 Saved' },
]

function newCustomId() {
  return `cp_${Math.random().toString(36).slice(2, 12)}`
}

/** A moved point keeps its sharp-corner flag. */
const keepCorner = (q: PartPoint, moved: UH): PartPoint => (q.c ? { ...moved, c: true } : moved)

/** Distance from p to segment ab. */
function segDist(p: Pt, a: Pt, b: Pt) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export default function App() {
  const history = useDesignHistory(() => loadDraft() ?? createDesign())
  const { design, edit } = history
  const geo = useMemo(() => buildGeometry(design.shape), [design.shape])

  const [tab, setTab] = useState<Tab>('style')
  const [rawSelected, setSelected] = useState<SelectId | null>('quarter')
  const [hovered, setHovered] = useState<SelectId | null>(null)
  const [drawing, setDrawing] = useState<Pt[] | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [showRuler, setShowRuler] = useState(true)
  const [handleMode, setHandleMode] = useState<HandleMode>('both')
  const [gallery, setGallery] = useState<Design[]>(loadGallery)
  const [reference, setReferenceState] = useState<ReferenceImage | null>(loadReference)
  const [toast, setToast] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // A custom part can disappear through undo; treat a dangling selection as none.
  const selected = isCustomId(rawSelected) && !design.customParts.some((c) => c.id === rawSelected) ? null : rawSelected
  const selectedCustom = isCustomId(selected) ? design.customParts.find((c) => c.id === selected) : undefined

  // Autosave the working draft so a refresh never loses work.
  useEffect(() => saveDraft(design), [design])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  /* ---------- Edits ---------- */

  const select = (id: SelectId) => {
    setSelected(id)
    setTab('style')
  }

  const updateCustom = (id: string, recipe: (c: CustomPart) => CustomPart, key: string | null = null) =>
    edit((d) => ({ ...d, customParts: d.customParts.map((c) => (c.id === id ? recipe(c) : c)) }), key)

  const patchStyle = (id: SelectId, patch: Partial<PartStyle>) => {
    const key = `${id}:${Object.keys(patch).join(',')}`
    if (isCustomId(id)) updateCustom(id, (c) => ({ ...c, style: { ...c.style, ...patch } }), key)
    else edit((d) => ({ ...d, parts: { ...d.parts, [id]: { ...d.parts[id as PartId], ...patch } } }), key)
  }

  const toggleHidden = (id: PartId) => patchStyle(id, { hidden: !design.parts[id].hidden })

  const setReference = (next: ReferenceImage | null) => {
    setReferenceState(next)
    if (!saveReference(next)) setToast('⚠️ Sketch is too big to keep after a reload, but you can use it now')
  }

  /** Replaces a built-in panel with an editable custom part that has exactly the same outline. */
  const editPanelOutline = (panel: EditablePanel) => {
    const part: CustomPart = {
      id: newCustomId(),
      name: `${PART_BY_ID[panel].label} (editable)`,
      points: panelToPoints(geo, panel),
      smooth: true,
      clip: true,
      onTop: false,
      style: { ...design.parts[panel], hidden: false, text: undefined },
    }
    // Put it first so it stacks under any parts you already added, like the panel it replaces.
    edit((d) => ({
      ...d,
      parts: { ...d.parts, [panel]: { ...d.parts[panel], hidden: true } },
      customParts: [part, ...d.customParts],
    }))
    select(part.id)
    setToast(`✂️ ${PART_BY_ID[panel].label} is now editable. Drag its points to redraw the seam.`)
  }

  const addCustom = (part: CustomPart) => {
    edit((d) => ({ ...d, customParts: [...d.customParts, part] }))
    select(part.id)
  }

  const addFromTemplate = (t: PartTemplate) => {
    setLibraryOpen(false)
    addCustom(createCustomPart(geo, t, design.customParts))
    setToast(`➕ Added ${t.name}. Drag it or its points to fit.`)
  }

  const startDrawing = () => {
    setLibraryOpen(false)
    setSelected(null)
    setDrawing([])
  }

  const finishDrawing = () => {
    if (drawing && drawing.length >= 3) {
      addCustom(createDrawnPart(geo, drawing, design.customParts))
      setToast('✏️ Shape added. Style it on the right.')
    }
    setDrawing(null)
  }

  const deleteCustom = (id: string) => {
    edit((d) => ({ ...d, customParts: d.customParts.filter((c) => c.id !== id) }))
    setSelected(null)
  }

  const duplicateCustom = (cp: CustomPart) => {
    const copy: CustomPart = {
      ...structuredClone(cp),
      id: newCustomId(),
      name: `${cp.name} copy`,
      points: cp.points.map((p) => {
        const [x, y] = geo.toAbs(p)
        return keepCorner(p, geo.fromAbs([x + 16, y - 10]))
      }),
    }
    addCustom(copy)
  }

  const moveLayer = (id: string, dir: 1 | -1) =>
    edit((d) => {
      const list = [...d.customParts]
      const i = list.findIndex((c) => c.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return d
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...d, customParts: list }
    })

  /* ---------- Canvas interactions ---------- */

  const onCustomPointerDown = (id: string, e: PointerEvent<SVGGElement>) => {
    if (drawing) return
    const cp = design.customParts.find((c) => c.id === id)
    if (!cp) return
    select(id)
    const startGeo = geo
    const orig = cp.points.map(startGeo.toAbs)
    beginDrag(e, (p, start) => {
      const [dx, dy] = [p[0] - start[0], p[1] - start[1]]
      if (Math.hypot(dx, dy) < 2) return
      updateCustom(
        id,
        (c) => ({ ...c, points: orig.map((a, i) => keepCorner(cp.points[i], startGeo.fromAbs([a[0] + dx, a[1] + dy]))) }),
        `move:${id}`,
      )
    })
  }

  const onCustomDoubleClick = (id: string, e: MouseEvent<SVGGElement>) => {
    e.stopPropagation()
    const cp = design.customParts.find((c) => c.id === id)
    if (!cp || selected !== id) return
    const p = svgPoint(e.currentTarget, e.clientX, e.clientY)
    const abs = cp.points.map(geo.toAbs)
    let best = 0
    let bestD = Infinity
    abs.forEach((a, i) => {
      const dist = segDist(p, a, abs[(i + 1) % abs.length])
      if (dist < bestD) [best, bestD] = [i, dist]
    })
    const points = [...cp.points]
    points.splice(best + 1, 0, geo.fromAbs(p))
    updateCustom(id, (c) => ({ ...c, points }))
  }

  const overlay = () => {
    if (drawing) return <DrawLayer points={drawing} onAdd={(p) => setDrawing([...drawing, p])} onFinish={finishDrawing} />
    return (
      <>
        {reference?.visible && reference.onTop && <ReferenceLayer reference={reference} />}
        {showRuler && <Ruler geo={geo} sizeEU={design.sizeEU} />}
        {tab === 'shape' && handleMode !== 'points' && (
          <CurveHandles
            geo={geo}
            onDrag={(id, p) => {
              const startGeo = geo
              edit((d) => ({ ...d, shape: applyCurve(startGeo, id, p) }), `curve:${id}`)
            }}
            onReset={(id) =>
              edit((d) => ({
                ...d,
                shape: clampShape(
                  id === 'toeSpring'
                    ? { ...d.shape, toeSpring: DEFAULT_SHAPE.toeSpring }
                    : { ...d.shape, bends: { ...d.shape.bends, [id]: DEFAULT_BENDS[id] } },
                ),
              }))
            }
          />
        )}
        {tab === 'shape' && handleMode !== 'curves' && (
          <ShapeHandles
            geo={geo}
            onDrag={(id, p) => {
              const startGeo = geo
              edit((d) => ({ ...d, shape: applyHandle(startGeo, id, p) }), `handle:${id}`)
            }}
          />
        )}
        {tab === 'style' && selectedCustom && (
          <VertexHandles
            geo={geo}
            part={selectedCustom}
            onMove={(i, p) =>
              updateCustom(
                selectedCustom.id,
                (c) => ({ ...c, points: c.points.map((q, j) => (j === i ? keepCorner(q, geo.fromAbs(p)) : q)) }),
                `vertex:${selectedCustom.id}:${i}`,
              )
            }
            onDelete={(i) =>
              selectedCustom.points.length > 3 &&
              updateCustom(selectedCustom.id, (c) => ({ ...c, points: c.points.filter((_, j) => j !== i) }))
            }
            onToggleCorner={(i) =>
              updateCustom(selectedCustom.id, (c) => ({
                ...c,
                points: c.points.map((q, j) => (j === i ? (q.c ? { u: q.u, h: q.h } : { ...q, c: true }) : q)),
              }))
            }
          />
        )}
      </>
    )
  }

  /* ---------- Keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.tagName === 'INPUT' && ['text', 'search'].includes((target as HTMLInputElement).type)
      // Any focused form control (checkbox, slider, select…) owns Backspace/Delete/Enter.
      const inControl = typing || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)
      if (drawing) {
        if (typing) return
        if (e.key === 'Enter') finishDrawing()
        if (e.key === 'Escape') setDrawing(null)
        if (e.key === 'Backspace') setDrawing(drawing.slice(0, -1))
        return
      }
      if (typing || libraryOpen) return
      if (e.key === 'Escape') setSelected(null)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCustom && !inControl) {
        e.preventDefault()
        deleteCustom(selectedCustom.id)
      }
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        history.undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        history.redo()
      } else if (k === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- File actions ---------- */

  function save() {
    const next = saveToGallery(design)
    if (next) {
      setGallery(next)
      setToast(`💾 Saved "${design.name}"`)
    } else {
      setToast('⚠️ Could not save: browser storage is unavailable')
    }
  }

  function newDesign() {
    history.load(createDesign())
    setSelected('quarter')
    setToast('✨ Started a new design')
  }

  function duplicateDesign() {
    history.load(createDesign({ ...design, name: `${design.name} (copy)` }))
    setToast('📄 Duplicated. Save to keep the copy')
  }

  async function handleExportPng() {
    if (!svgRef.current) return
    try {
      await exportPng(svgRef.current, design)
      setToast('🖼️ PNG exported')
    } catch (err) {
      setToast(`⚠️ ${(err as Error).message}`)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      const d = await importJson(file)
      history.load(d)
      setToast(`📥 Imported "${d.name}"`)
    } catch (err) {
      setToast(`⚠️ ${(err as Error).message}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function openFromGallery(d: Design) {
    history.load(structuredClone(d))
    setToast(`📂 Opened "${d.name}"`)
  }

  function removeFromGallery(d: Design) {
    if (confirm(`Delete "${d.name}" from your saved designs?`)) setGallery(deleteFromGallery(d.id))
  }

  const nameOf = (id: SelectId) =>
    isCustomId(id) ? (design.customParts.find((c) => c.id === id)?.name ?? '') : PART_BY_ID[id as PartId].label

  const caption = drawing
    ? drawing.length < 3
      ? `✏️ Click on the shoe to place points (${drawing.length} so far)`
      : '✏️ Click the first point or press Enter to finish · Backspace removes the last point'
    : tab === 'shape'
      ? handleMode === 'curves'
        ? '📐 Drag the blue squares to bend the curves'
        : handleMode === 'points'
          ? '📐 Drag the orange points to reshape the shoe'
          : '📐 Orange points move · blue squares bend curves'
      : hovered
        ? nameOf(hovered)
        : selected
          ? `Editing: ${nameOf(selected)}`
          : 'Click any part to edit it'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>👟</span>
          <span className="brand-name">Sneaker Designer</span>
        </div>

        <input
          className="name-input"
          value={design.name}
          maxLength={60}
          onChange={(e) => history.rename(e.target.value)}
          aria-label="Design name"
        />

        <div className="actions">
          <div className="btn-group">
            <button className="btn icon" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">↶</button>
            <button className="btn icon" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Y)">↷</button>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={newDesign}>New</button>
            <button className="btn" onClick={duplicateDesign}>Duplicate</button>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
            <button className="btn" onClick={() => exportJson(design)}>JSON</button>
            <button className="btn" onClick={handleExportPng}>PNG</button>
          </div>
          <button className="btn primary" onClick={save} title="Save (Ctrl+S)">Save</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => handleImport(e.target.files?.[0])} />
        </div>
      </header>

      <main className="workspace">
        <PartList
          parts={design.parts}
          customParts={design.customParts}
          selected={selected}
          onSelect={select}
          onHover={setHovered}
          onToggleHidden={toggleHidden}
          onAdd={() => setLibraryOpen(true)}
        />

        <section className="stage-wrap">
          <div className={`stage${drawing ? ' is-drawing' : ''}`} onClick={() => !drawing && setSelected(null)}>
            {drawing && (
              <div className="stage-toolbar" onClick={(e) => e.stopPropagation()}>
                <button className="btn primary" onClick={finishDrawing} disabled={drawing.length < 3}>Finish shape</button>
                <button className="btn" onClick={() => setDrawing(null)}>Cancel</button>
              </div>
            )}
            <SneakerSvg
              svgRef={svgRef}
              design={design}
              selected={drawing ? null : selected}
              hovered={drawing ? null : hovered}
              onSelect={select}
              onHover={setHovered}
              onCustomPointerDown={onCustomPointerDown}
              onCustomDoubleClick={onCustomDoubleClick}
              overlay={overlay}
              underlay={reference?.visible && !reference.onTop ? <ReferenceLayer reference={reference} /> : undefined}
              className={`sneaker${tab === 'shape' || selectedCustom || drawing ? ' is-editing' : ''}`}
              title={design.name}
            />
            <div className="stage-caption">{caption}</div>
          </div>
          <ColorwayBar
            onApply={(c) => edit((d) => ({ ...d, parts: applyColorway(d.parts, c) }))}
            onRandom={() => {
              const c = randomColorway()
              edit((d) => ({ ...d, parts: applyColorway(d.parts, c) }))
            }}
          />
        </section>

        <aside className="sidebar">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'style' && (
            <StylePanel
              selected={selected}
              design={design}
              onStyle={(patch) => selected && patchStyle(selected, patch)}
              onCustom={(patch) => selectedCustom && updateCustom(selectedCustom.id, (c) => ({ ...c, ...patch }), `${selectedCustom.id}:${Object.keys(patch).join(',')}`)}
              onDeleteCustom={() => selectedCustom && deleteCustom(selectedCustom.id)}
              onDuplicateCustom={() => selectedCustom && duplicateCustom(selectedCustom)}
              onLayer={(dir) => selectedCustom && moveLayer(selectedCustom.id, dir)}
              onEditOutline={() => selected && editPanelOutline(selected as EditablePanel)}
            />
          )}
          {tab === 'shape' && <ReferencePanel reference={reference} onChange={setReference} onError={(m) => setToast(`⚠️ ${m}`)} />}
          {tab === 'shape' && (
            <ShapePanel
              shape={design.shape}
              sizeEU={design.sizeEU}
              showRuler={showRuler}
              handleMode={handleMode}
              onHandleMode={setHandleMode}
              onShape={(shape, key) => edit((d) => ({ ...d, shape }), key)}
              onSize={(sizeEU) => edit((d) => ({ ...d, sizeEU }))}
              onToggleRuler={setShowRuler}
            />
          )}
          {tab === 'saved' && <Gallery designs={gallery} currentId={design.id} onOpen={openFromGallery} onDelete={removeFromGallery} />}
        </aside>
      </main>

      {libraryOpen && <PartLibrary onPick={addFromTemplate} onDraw={startDrawing} onClose={() => setLibraryOpen(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
