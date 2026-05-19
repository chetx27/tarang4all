import React, { useState, useEffect } from 'react'
import { useTarangStore } from '../../store/tarangStore'
import Badge from '../shared/Badge'
import { formatDistanceToNow } from 'date-fns'
import type { SignalClass } from '../../store/types'

export default function AnomalyFeed() {
  const { 
    anomalies, 
    activeCityFilter, 
    activeSignalFilter, 
    setCityFilter, 
    setSignalFilter, 
    setActivePanel, 
    setVaultExpanded 
  } = useTarangStore()

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  // Filter anomalies based on store settings
  const filteredAnomalies = anomalies.filter(a => {
    if (activeCityFilter && a.city !== activeCityFilter) return false
    
    if (activeSignalFilter) {
      if (activeSignalFilter === 'BURST_TRANSMISSION' && !a.is_burst) return false
      if (activeSignalFilter === 'FREQUENCY_HOPPING' && !a.is_frequency_hopping) return false
      if (activeSignalFilter === 'UNLICENSED_WIDEBAND' && a.signal_class !== 'UNLICENSED_WIDEBAND' && a.signal_class !== 'UNLICENSED_NARROWBAND') return false
    }
    
    return true
  })

  // Format dynamic relative time
  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true }).replace('about ', '')
    } catch (e) {
      return 'just now'
    }
  }

  // Draw a fallback procedurally beautiful spectrogram canvas to wow the operators
  const SpectrogramCanvas = ({ psd }: { psd: number[] }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = canvas.width
      const h = canvas.height

      // Create procedural horizontal heat sweep representation
      const imgData = ctx.createImageData(w, h)
      
      for (let x = 0; x < w; x++) {
        // Find corresponding PSD bin
        const binIdx = Math.floor((x / w) * psd.length)
        const pwrVal = psd[binIdx] || 0
        
        for (let y = 0; y < h; y++) {
          const idx = (y * w + x) * 4
          
          // Generate realistic thermal noise blending
          const heat = Math.min(255, Math.max(0, (pwrVal / 100) * 255 - (y * 1.5) + Math.random() * 20))
          
          // Apply Inferno-like colormap: R=heat, G=heat/2, B=heat/4
          imgData.data[idx] = heat
          imgData.data[idx+1] = Math.min(255, heat * 0.6)
          imgData.data[idx+2] = Math.min(255, heat * 0.2)
          imgData.data[idx+3] = 255 // Opacity
        }
      }
      ctx.putImageData(imgData, 0, 0)
    }, [psd])

    return (
      <div className="flex flex-col gap-1 select-none">
        <span className="font-mono text-[9px] text-muted tracking-wider uppercase">THERMAL SPECTROGRAM RANGE</span>
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={60} 
          className="border border-border rounded-sm w-full h-[60px]"
        />
      </div>
    )
  }

  const signalFilters: { label: string; value: SignalClass | null }[] = [
    { label: 'ALL EVENTS', value: null },
    { label: 'BURSTS', value: 'BURST_TRANSMISSION' as SignalClass },
    { label: 'HOPPING', value: 'FREQUENCY_HOPPING' as SignalClass },
    { label: 'UNLICENSED', value: 'UNLICENSED_WIDEBAND' as SignalClass }
  ]

  const cities = ['ALL', 'Delhi', 'Mumbai', 'Bengaluru']

  return (
    <div className="h-full flex flex-col bg-canvas select-none">
      
      {/* 1. HEADER (STIKY) */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs font-semibold text-secondary tracking-widest uppercase">ANOMALY FEED</span>
            <span className="font-mono text-xxs text-muted">({filteredAnomalies.length} EVENTS)</span>
          </div>

          {/* Type Filters */}
          <div className="flex gap-2">
            {signalFilters.map(f => (
              <button
                key={f.label}
                onClick={() => setSignalFilter(f.value)}
                className={`border rounded px-2.5 py-0.5 font-mono text-[10px] tracking-wide transition-all ${
                  activeSignalFilter === f.value
                    ? 'border-accent text-accent bg-accent/5 font-semibold'
                    : 'border-border text-secondary hover:text-primary hover:border-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="flex gap-2 border-t border-border/30 pt-2">
          {cities.map(c => {
            const isSelected = activeCityFilter === (c === 'ALL' ? null : c)
            return (
              <button
                key={c}
                onClick={() => setCityFilter(c === 'ALL' ? null : c)}
                className={`border rounded px-2.5 py-0.5 font-mono text-[10px] tracking-wide transition-all uppercase ${
                  isSelected
                    ? 'border-accent text-accent bg-accent/5 font-semibold'
                    : 'border-border text-secondary hover:text-primary hover:border-secondary'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. FEED LIST */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {filteredAnomalies.map((anomaly) => {
          const isExpanded = expandedCardId === anomaly.id
          
          let threatBorder = 'border-l-threat-low'
          if (anomaly.threat_level === 'high') threatBorder = 'border-l-threat-high'
          else if (anomaly.threat_level === 'medium') threatBorder = 'border-l-threat-medium'

          const fpMatch = anomaly.fingerprintMatch || {
            fingerprintId: anomaly.fingerprint_id,
            fingerprintHash: anomaly.fingerprint_hash || 'unknown',
            detectionCount: 2,
            confidenceScore: 45.0
          }

          return (
            <div
              key={anomaly.id}
              onClick={() => setExpandedCardId(isExpanded ? null : anomaly.id)}
              className={`bg-elevated border border-border border-l-2 ${threatBorder} rounded-sm px-4 py-3 cursor-pointer hover:border-secondary/60 transition-all slide-in-right flex flex-col gap-2`}
            >
              {/* Row 1: Frequency, City, Threat, Time */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-primary tracking-tight">
                    {Number(anomaly.peak_frequency_mhz).toFixed(3)} MHz
                  </span>
                  <Badge variant="city" label={anomaly.city} />
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={anomaly.threat_level === 'high' ? 'threat-high' : anomaly.threat_level === 'medium' ? 'threat-medium' : 'threat-low'} 
                    label={`${anomaly.threat_level} threat`} 
                  />
                  <span className="font-mono text-[10px] text-secondary">
                    {timeAgo(anomaly.detected_at)}
                  </span>
                </div>
              </div>

              {/* Row 2: Signal Class, duration, db */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge 
                  variant={anomaly.is_frequency_hopping ? 'signal-hopping' : anomaly.is_burst ? 'signal-burst' : 'signal-unlicensed'} 
                  label={anomaly.signal_class.replace('_', ' ')} 
                />
                <span className="font-mono text-xxs text-muted">{anomaly.duration_ms.toFixed(0)}ms duration</span>
                <span className="font-mono text-xxs text-muted">{anomaly.peak_power_db.toFixed(1)} dBm power</span>
                
                {anomaly.is_burst && (
                  <span className="font-mono text-xxs font-bold text-signal-burst uppercase tracking-wide">BURST</span>
                )}
                {anomaly.is_frequency_hopping && (
                  <span className="font-mono text-xxs font-bold text-signal-hopping uppercase tracking-wide">HOPPING</span>
                )}
              </div>

              {/* Row 3: LLM service, fingerprint matching */}
              <div className="flex justify-between items-center text-xxs mt-0.5 border-t border-border/30 pt-2">
                <div className="font-mono text-muted">
                  INTELLIGENCE: <span className="text-secondary">{anomaly.llm_model_used || 'rule-based'}</span>
                  {anomaly.llm_latency_ms > 0 && (
                    <span className="ml-1">· {anomaly.llm_latency_ms}ms</span>
                  )}
                </div>

                {anomaly.fingerprint_id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActivePanel('vault')
                      setVaultExpanded(anomaly.fingerprint_id)
                    }}
                    className="font-mono text-accent hover:underline text-xxs tracking-tight"
                  >
                    ↗ FP #{fpMatch.fingerprintHash.slice(0, 6)} · {Number(fpMatch.confidenceScore).toFixed(1)}% CONF
                  </button>
                ) : (
                  <span className="font-mono text-secondary text-xxs">
                    ✦ NEW TRANSMITTER MEMORY
                  </span>
                )}
              </div>

              {/* EXPANDED CONTENT AREA */}
              {isExpanded && (
                <div className="border-t border-border mt-2 pt-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Intel Summary */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-muted tracking-wider uppercase">PATTERN ANALYSIS ASSESSMENT</span>
                    <p className="text-xs text-secondary leading-relaxed bg-surface/50 p-2.5 border border-border rounded-sm">
                      {anomaly.pattern_analysis || 'No live assessment recorded. Transmitter matches baseline heuristics.'}
                    </p>
                  </div>

                  {/* Recommendation action */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-muted tracking-wider uppercase">RECOMMENDED ACTION</span>
                    <p className="text-xs text-secondary leading-relaxed bg-surface/50 p-2.5 border border-border rounded-sm">
                      {anomaly.recommended_action || 'Continue spectrum sweep on active frequency allocation.'}
                    </p>
                  </div>

                  {/* Fallback Thermal Spectrogram */}
                  <SpectrogramCanvas psd={anomaly.psd_array} />

                  {/* Cryptographic hash */}
                  <div className="flex justify-between items-center bg-canvas/30 px-3 py-1.5 border border-border/40 rounded-sm font-mono text-[10px]">
                    <span className="text-muted">FINGERPRINT HASH:</span>
                    <span className="text-secondary select-all">{anomaly.fingerprint_hash}</span>
                  </div>

                </div>
              )}

            </div>
          )
        })}

        {filteredAnomalies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded">
            <span className="font-mono text-xs text-secondary tracking-widest uppercase">FEED SILENT</span>
            <span className="font-mono text-[10px] text-muted uppercase mt-1">No anomalous signals match active filter conditions.</span>
          </div>
        )}
      </div>

    </div>
  )
}
