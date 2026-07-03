'use client'

import { useState, useRef, useCallback } from 'react'

export function useLightboxInteraction() {
  const [lightboxZoomed, setLightboxZoomed] = useState(false)
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 })
  const lightboxPanRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lightboxDragMovedRef = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const resetLightboxState = useCallback(() => {
    setLightboxZoomed(false)
    setLightboxPan({ x: 0, y: 0 })
    lightboxPanRef.current = { x: 0, y: 0 }
    lightboxDragMovedRef.current = false
  }, [])

  const handleLightboxMouseDown = useCallback((e: React.MouseEvent) => {
    if (!lightboxZoomed) return
    e.preventDefault()
    isDragging.current = true
    lightboxDragMovedRef.current = false
    dragStart.current = {
      x: e.clientX - lightboxPanRef.current.x,
      y: e.clientY - lightboxPanRef.current.y,
    }
  }, [lightboxZoomed])

  const handleLightboxMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !lightboxZoomed) return
    e.preventDefault()
    const maxPan = 150
    const newX = Math.min(maxPan, Math.max(-maxPan, e.clientX - dragStart.current.x))
    const newY = Math.min(maxPan, Math.max(-maxPan, e.clientY - dragStart.current.y))
    if (Math.abs(newX - lightboxPanRef.current.x) > 3 || Math.abs(newY - lightboxPanRef.current.y) > 3) {
      lightboxDragMovedRef.current = true
    }
    lightboxPanRef.current = { x: newX, y: newY }
    setLightboxPan({ x: newX, y: newY })
  }, [lightboxZoomed])

  const handleLightboxMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    if (lightboxZoomed) {
      isDragging.current = true
      lightboxDragMovedRef.current = false
      dragStart.current = {
        x: e.touches[0].clientX - lightboxPanRef.current.x,
        y: e.touches[0].clientY - lightboxPanRef.current.y,
      }
    }
  }, [lightboxZoomed])

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !lightboxZoomed) return
    if (e.cancelable) e.preventDefault()
    const maxPan = 100
    const newX = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientX - dragStart.current.x))
    const newY = Math.min(maxPan, Math.max(-maxPan, e.touches[0].clientY - dragStart.current.y))
    if (Math.abs(newX - lightboxPanRef.current.x) > 3 || Math.abs(newY - lightboxPanRef.current.y) > 3) {
      lightboxDragMovedRef.current = true
    }
    lightboxPanRef.current = { x: newX, y: newY }
    setLightboxPan({ x: newX, y: newY })
  }, [lightboxZoomed])

  const handleLightboxTouchEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  return {
    lightboxZoomed,
    setLightboxZoomed,
    lightboxPan,
    setLightboxPan,
    lightboxPanRef,
    isDragging,
    lightboxDragMovedRef,
    handleLightboxMouseDown,
    handleLightboxMouseMove,
    handleLightboxMouseUp,
    handleLightboxTouchStart,
    handleLightboxTouchMove,
    handleLightboxTouchEnd,
    resetLightboxState,
  }
}
