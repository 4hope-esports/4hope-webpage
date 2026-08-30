'use client'

import { useState } from 'react'
import { Button, Dialog, ImageCropper } from '@/components/ui'

/** Shared "pick a file -> crop it -> confirm/cancel" flow used by the team-logo, account-photo, and registration croppers. */
export function useImageCropFlow(initialValue: string | null) {
  const [image, setImage] = useState(initialValue)
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [pendingCrop, setPendingCrop] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawImage(reader.result as string)
      setPendingCrop(null)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropDone = () => {
    if (pendingCrop) setImage(pendingCrop)
    setCropOpen(false)
    setRawImage(null)
  }

  const handleCropCancel = () => {
    setCropOpen(false)
    setRawImage(null)
  }

  const reset = (value: string | null) => {
    setImage(value)
    setRawImage(null)
    setPendingCrop(null)
    setCropOpen(false)
  }

  return {
    image,
    setImage,
    rawImage,
    pendingCrop,
    setPendingCrop,
    cropOpen,
    setCropOpen,
    handleFile,
    handleCropDone,
    handleCropCancel,
    reset,
  }
}

/** The "Customize picture" crop dialog shared by the team-logo, account-photo, and registration flows. */
export function CropDialog({
  open,
  src,
  pendingCrop,
  onChange,
  onCancel,
  onDone,
}: {
  open: boolean
  src: string | null
  pendingCrop: string | null
  onChange: (dataUrl: string) => void
  onCancel: () => void
  onDone: () => void
}) {
  return (
    <Dialog
      open={open}
      title="Customize picture"
      onClose={onCancel}
      closeOnBackdropClick={false}
      className="max-w-[600px]"
      actions={
        <>
          <Button variant="subtle" className="text-white" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!pendingCrop} onClick={onDone}>
            Done
          </Button>
        </>
      }
    >
      {src ? (
        <div className="flex justify-center">
          <ImageCropper src={src} onChange={onChange} />
        </div>
      ) : null}
    </Dialog>
  )
}
