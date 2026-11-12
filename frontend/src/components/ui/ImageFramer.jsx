import { useEffect, useId, useRef, useState } from "react"
import { framingStyle } from "@/lib/imageCrop"
import "./ImageFramer.css"

const ZOOM_MIN = 1
const ZOOM_MAX = 2.5
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const round = (v, digits = 2) => Number(v.toFixed(digits))

/**
 * Enquadramento de foto "arrastando", como na troca de foto de perfil do
 * WhatsApp/Instagram. O quadro tem a proporção do cartão da vitrine (4:3).
 *
 *  - Mouse/toque: arraste a foto dentro do quadro; rodinha do mouse = zoom.
 *  - Teclado (quadro com foco): setas movem (Shift = passo maior), + e − aproximam.
 *  - Sem arrastar (WCAG 2.5.7): controle de zoom e "Ajuste fino" com
 *    Horizontal/Vertical, que funcionam com um clique na trilha.
 *
 * framing = { x: 0–100, y: 0–100, zoom: 1–2.5 } — o mesmo formato que
 * lib/imageCrop.js usa para recortar a foto ao salvar.
 */
function ImageFramer({ src, framing, onChange, alt = "", onReset, canReset }) {
  const uid = useId()
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  // Valores mais recentes para os eventos nativos (rodinha) sem recriar o efeito.
  const latest = useRef({ framing, onChange })
  useEffect(() => {
    latest.current = { framing, onChange }
  })
  const [natural, setNatural] = useState(null)
  const [dragging, setDragging] = useState(false)

  /** Quantos pixels a foto "sobra" para fora do quadro em cada direção. */
  const overflow = (zoom) => {
    const el = frameRef.current
    if (!el || !natural) return { ox: 0, oy: 0 }
    const w = el.clientWidth
    const h = el.clientHeight
    const cover = Math.max(w / natural.w, h / natural.h) * zoom
    return { ox: natural.w * cover - w, oy: natural.h * cover - h }
  }

  /** Move a foto `dx`/`dy` pixels (positivo = para a direita/para baixo). */
  const moveBy = (base, dx, dy) => {
    const { ox, oy } = overflow(base.zoom)
    return {
      ...base,
      x: ox > 0 ? round(clamp(base.x - (dx * 100) / ox, 0, 100), 1) : base.x,
      y: oy > 0 ? round(clamp(base.y - (dy * 100) / oy, 0, 100), 1) : base.y,
    }
  }

  const zoomTo = (base, zoom) => ({
    ...base,
    zoom: round(clamp(zoom, ZOOM_MIN, ZOOM_MAX)),
  })

  // Rodinha do mouse = zoom. Listener nativo com passive:false para a página
  // não rolar junto (no onWheel do React não dá para impedir a rolagem).
  useEffect(() => {
    const el = frameRef.current
    if (!el) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      const { framing: f, onChange: change } = latest.current
      change(zoomTo(f, f.zoom - event.deltaY * 0.0015))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, start: framing }
    setDragging(true)
  }
  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) return
    onChange(moveBy(drag.start, event.clientX - drag.x, event.clientY - drag.y))
  }
  const endDrag = () => {
    dragRef.current = null
    setDragging(false)
  }

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 40 : 10 // pixels
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    if (moves[event.key]) {
      event.preventDefault()
      onChange(moveBy(framing, ...moves[event.key]))
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault()
      onChange(zoomTo(framing, framing.zoom + 0.1))
    } else if (event.key === "-") {
      event.preventDefault()
      onChange(zoomTo(framing, framing.zoom - 0.1))
    }
  }

  const hintId = `${uid}-hint`
  return (
    <div className="image-framer">
      <div
        ref={frameRef}
        className={`image-framer-frame ${dragging ? "is-dragging" : ""}`}
        role="group"
        aria-roledescription="área de enquadramento"
        aria-label="Enquadramento da foto"
        aria-describedby={hintId}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={framingStyle(framing)}
          onLoad={(e) =>
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
        />
        {/* Grade de terços enquanto arrasta (ajuda a alinhar) */}
        <span className="image-framer-grid" aria-hidden="true" />
        <span className="image-framer-chip" aria-hidden="true">
          Arraste para ajustar
        </span>
      </div>
      <p id={hintId} className="image-framer-hint">
        Arraste a foto para posicionar e use a rodinha do mouse ou o zoom abaixo
        para aproximar. No teclado: setas movem, + e − aproximam.
      </p>

      <div className="image-framer-zoom">
        <label htmlFor={`${uid}-zoom`}>Zoom</label>
        <span aria-hidden="true">−</span>
        <input
          id={`${uid}-zoom`}
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step="0.05"
          value={framing.zoom}
          onChange={(e) => onChange(zoomTo(framing, Number(e.target.value)))}
          aria-valuetext={`${Math.round(framing.zoom * 100)}%`}
        />
        <span aria-hidden="true">+</span>
      </div>

      {/* Alternativa sem arrastar (WCAG 2.5.7): um clique na trilha já move */}
      <details className="image-framer-fine">
        <summary>Ajuste fino sem arrastar</summary>
        <label htmlFor={`${uid}-x`}>
          Horizontal
          <input
            id={`${uid}-x`}
            type="range"
            min="0"
            max="100"
            value={framing.x}
            onChange={(e) => onChange({ ...framing, x: Number(e.target.value) })}
            aria-valuetext={`${Math.round(framing.x)}% (0 = esquerda, 100 = direita)`}
          />
        </label>
        <label htmlFor={`${uid}-y`}>
          Vertical
          <input
            id={`${uid}-y`}
            type="range"
            min="0"
            max="100"
            value={framing.y}
            onChange={(e) => onChange({ ...framing, y: Number(e.target.value) })}
            aria-valuetext={`${Math.round(framing.y)}% (0 = topo, 100 = base)`}
          />
        </label>
      </details>

      {canReset && (
        <button type="button" className="image-framer-reset" onClick={onReset}>
          Centralizar de novo
        </button>
      )}
    </div>
  )
}

export default ImageFramer
