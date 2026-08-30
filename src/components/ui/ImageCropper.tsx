'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ImageCropperProps {
  src: string
  outputSize?: number
  className?: string
  onChange: (dataUrl: string) => void
}

interface Rect {
  x: number
  y: number
  size: number
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const MIN_SIZE = 60

/** Square crop picker with a draggable/resizable box and circular preview mask, like a standard "customize picture" dialog. */
export function ImageCropper({ src, outputSize = 256, className, onChange }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [rect, setRect] = useState<Rect | null>(null)
  const dragRef = useRef<null | {
    mode: 'move' | 'resize'
    corner?: Corner
    startX: number
    startY: number
    origin: Rect
  }>(null)

  const emit = useCallback(
    (r: Rect) => {
      const img = imgRef.current
      // Read the image's live rendered width rather than the `displaySize` state, which may
      // not have re-rendered yet on the very first emit (called synchronously from onLoad).
      const w = img?.clientWidth || displaySize.w
      if (!img || !w) return
      const scale = img.naturalWidth / w
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(
        img,
        r.x * scale,
        r.y * scale,
        r.size * scale,
        r.size * scale,
        0,
        0,
        outputSize,
        outputSize,
      )
      onChange(canvas.toDataURL('image/png'))
    },
    [displaySize, outputSize, onChange],
  )

  const handleImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    const w = img.clientWidth
    const h = img.clientHeight
    setDisplaySize({ w, h })
    const size = Math.min(w, h)
    const initial = { x: (w - size) / 2, y: (h - size) / 2, size }
    setRect(initial)
    requestAnimationFrame(() => emit(initial))
  }

  const clampRect = useCallback(
    (r: Rect): Rect => {
      const size = Math.min(Math.max(r.size, MIN_SIZE), Math.min(displaySize.w, displaySize.h))
      const x = Math.min(Math.max(r.x, 0), displaySize.w - size)
      const y = Math.min(Math.max(r.y, 0), displaySize.h - size)
      return { x, y, size }
    },
    [displaySize],
  )

  const handlePointerDown = (mode: 'move' | 'resize', corner?: Corner) => (e: React.PointerEvent) => {
    if (!rect) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { mode, corner, startX: e.clientX, startY: e.clientY, origin: rect }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    let next: Rect

    if (drag.mode === 'move') {
      next = clampRect({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy })
    } else {
      const { x, y, size } = drag.origin
      const maxSize = Math.min(displaySize.w, displaySize.h)
      let newSize = size
      let newX = x
      let newY = y

      switch (drag.corner) {
        case 'br':
          newSize = size + Math.max(dx, dy)
          break
        case 'tl':
          newSize = size - Math.max(dx, dy)
          break
        case 'tr':
          newSize = size + Math.max(dx, -dy)
          break
        case 'bl':
          newSize = size + Math.max(-dx, dy)
          break
      }

      newSize = Math.min(Math.max(newSize, MIN_SIZE), maxSize)
      const delta = newSize - size

      if (drag.corner === 'tl') {
        newX = x - delta
        newY = y - delta
      } else if (drag.corner === 'tr') {
        newY = y - delta
      } else if (drag.corner === 'bl') {
        newX = x - delta
      }

      newX = Math.min(Math.max(newX, 0), displaySize.w - newSize)
      newY = Math.min(Math.max(newY, 0), displaySize.h - newSize)
      next = { x: newX, y: newY, size: newSize }
    }

    setRect(next)
    emit(next)
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        ref={containerRef}
        className="relative inline-block select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={handleImgLoad}
          className="block max-h-[360px] max-w-full rounded-[10px]"
        />
        {rect ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-black/60"
              style={{
                clipPath: `polygon(0 0, 0 100%, ${rect.x}px 100%, ${rect.x}px ${rect.y}px, ${rect.x + rect.size}px ${rect.y}px, ${rect.x + rect.size}px ${rect.y + rect.size}px, ${rect.x}px ${rect.y + rect.size}px, ${rect.x}px 100%, 100% 100%, 100% 0)`,
              }}
            />
            <div
              onPointerDown={handlePointerDown('move')}
              className="absolute cursor-move border-2 border-gold-500"
              style={{ left: rect.x, top: rect.y, width: rect.size, height: rect.size }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-full border border-gold-500/40" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gold-500/40" />
              <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gold-500/40" />
              {(
                [
                  ['tl', 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', 'nwse-resize'],
                  ['tr', 'top-0 right-0 translate-x-1/2 -translate-y-1/2', 'nesw-resize'],
                  ['bl', 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', 'nesw-resize'],
                  ['br', 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', 'nwse-resize'],
                ] as [Corner, string, string][]
              ).map(([corner, pos, cursor]) => (
                <div
                  key={corner}
                  onPointerDown={handlePointerDown('resize', corner)}
                  className={cn('absolute h-3.5 w-3.5 rounded-[2px] border border-ink-1000 bg-white', pos)}
                  style={{ cursor, touchAction: 'none' }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <p className="mt-2.5 text-xs text-white/50">Crop area must be at least {MIN_SIZE}×{MIN_SIZE}px.</p>
    </div>
  )
}
