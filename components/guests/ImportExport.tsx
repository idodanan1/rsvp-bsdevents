'use client'

import { useState } from 'react'
import { he } from '@/lib/i18n/he'

interface ImportExportProps {
  eventId: string
  onImportComplete: () => void
}

export default function ImportExport({ eventId, onImportComplete }: ImportExportProps) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('eventId', eventId)

    try {
      const response = await fetch('/api/guests/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      onImportComplete()
      alert('ייבוא הושלם בהצלחה')
    } catch (error) {
      console.error('Import error:', error)
      alert('שגיאה בייבוא')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/guests/export?eventId=${eventId}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guests-${eventId}-${new Date().toISOString()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('שגיאה בייצוא')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 flex gap-4">
      <label className="cursor-pointer">
        <span className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 inline-block">
          {importing ? he.common.loading : he.guests.importExcel}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImport}
          disabled={importing}
          className="hidden"
        />
      </label>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {exporting ? he.common.loading : he.guests.exportExcel}
      </button>
    </div>
  )
}

