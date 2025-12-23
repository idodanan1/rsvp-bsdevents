'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Fix for SSR
if (typeof window !== 'undefined') {
  // Html5Qrcode is already imported
}

interface QRScannerProps {
  onScan: (qrCode: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scanner = new Html5Qrcode(containerRef.current.id)
    scannerRef.current = scanner

    const startScanning = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            setScanning(false)
            scanner.stop().then(() => {
              onScan(decodedText)
            })
          },
          (errorMessage) => {
            // Ignore scanning errors
          }
        )
        setScanning(true)
      } catch (error) {
        console.error('Error starting scanner:', error)
      }
    }

    startScanning()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center mb-4">
        <p className="text-gray-600 mb-4">הצב את ה-QR code מול המצלמה</p>
        <div
          id="qr-reader"
          ref={containerRef}
          className="mx-auto"
          style={{ width: '100%', maxWidth: '500px' }}
        />
      </div>
      {scanning && (
        <p className="text-center text-sm text-gray-500 mt-4">סורק...</p>
      )}
    </div>
  )
}

