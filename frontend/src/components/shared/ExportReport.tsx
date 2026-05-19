import React, { useState } from 'react'
import { Download, Clipboard, Check } from 'lucide-react'

interface ExportReportProps {
  fingerprintId: string
  fingerprintHash: string
}

export default function ExportReport({ fingerprintId, fingerprintHash }: ExportReportProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchReport = async () => {
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/fingerprints/${fingerprintId}/export`
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to generate report')
    return res.json()
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const data = await fetchReport()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${fingerprintHash.slice(0, 8)}_audit_report.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const data = await fetchReport()
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 items-center select-none" onClick={(e) => e.stopPropagation()}>
      
      {/* DOWNLOAD BUTTON */}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-1.5 border border-border hover:border-secondary hover:text-primary rounded px-2.5 py-1 text-xxs font-mono text-secondary tracking-tight transition-colors bg-elevated/40"
      >
        <Download size={12} className={loading ? 'animate-spin' : ''} />
        <span>{loading ? 'GENERATING...' : 'EXPORT REPORT'}</span>
      </button>

      {/* CLIPBOARD COPY BUTTON */}
      <button
        onClick={handleClipboard}
        disabled={loading}
        className="flex items-center justify-center border border-border hover:border-secondary hover:text-primary rounded p-1 text-secondary tracking-tight transition-colors bg-elevated/40"
        title="Copy raw JSON report to clipboard"
      >
        {copied ? (
          <Check size={12} className="text-threat-low" />
        ) : (
          <Clipboard size={12} />
        )}
      </button>

    </div>
  )
}
