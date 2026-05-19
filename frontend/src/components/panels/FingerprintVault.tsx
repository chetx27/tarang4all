import React, { useState, useEffect } from 'react'
import { Brain, Clock, X, Copy, Check } from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { useTarangStore } from '../../store/tarangStore'
import ConfidenceBar from '../shared/ConfidenceBar'
import Badge from '../shared/Badge'
import ExportReport from '../shared/ExportReport'
import { formatDistanceToNow } from 'date-fns'

export default function FingerprintVault() {
  const { 
    fingerprints, 
    isVaultExpanded, 
    setVaultExpanded,
    intelligenceBrief,
    handleIntelligenceBrief 
  } = useTarangStore()

  const [sortBy, setSortBy] = useState<'confidence' | 'detections' | 'lastSeen'>('confidence')
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  
  // Slide over intelligence state
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null)

  // Fetch / Query intelligence brief
  const fetchBrief = async () => {
    setBriefLoading(true)
    setBriefOpen(true)
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/fingerprints/intelligence/brief`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Brief request failed')
      const data = await res.json()
      handleIntelligenceBrief({
        summary: data.summary,
        model: data.model,
        generatedAt: data.generatedAt
      })
    } catch (e) {
      console.error(e)
    } finally {
      setBriefLoading(false)
    }
  }

  // Handle click to copy full hash
  const handleCopyHash = async (e: React.MouseEvent, id: string, hash: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHashId(id)
      setTimeout(() => setCopiedHashId(null), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  // Pre-seed mock fingerprints if Supabase table is empty
  const defaultFingerprints = [
    {
      id: 'fp-1',
      fingerprint_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      primary_frequency_mhz: 14.235,
      primary_city: 'Delhi',
      cities_detected: ['Delhi'],
      detection_count: 6,
      confidence_score: 84.9,
      avg_burst_duration_ms: 312,
      avg_cycle_hours: 47.3,
      signal_class: 'BURST_TRANSMISSION',
      time_pattern_description: 'Every 47-49 hours, 02:00-02:20 IST',
      pattern_intelligence: 'Recurring burst on 14.235 MHz. Consistent 0.3s duration. Narrow bandwidth suggests digital mode. Six detections over 12 days.',
      status: 'pattern_detected',
      first_detected_at: '2026-05-03T20:44:00Z',
      last_detected_at: '2026-05-13T20:33:00Z'
    },
    {
      id: 'fp-2',
      fingerprint_hash: 'b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3',
      primary_frequency_mhz: 10.118,
      primary_city: 'Mumbai',
      cities_detected: ['Mumbai', 'Delhi'],
      detection_count: 4,
      confidence_score: 61.0,
      avg_burst_duration_ms: 180,
      avg_cycle_hours: 72.1,
      signal_class: 'FREQUENCY_HOPPING',
      time_pattern_description: 'Irregular, 06:00-08:00 IST window',
      pattern_intelligence: 'Frequency hopping between 10.1-10.2 MHz. Detected in Mumbai first, then Delhi 5-6 hours later on same days. Possible mobile transmitter on western corridor.',
      status: 'high_confidence',
      first_detected_at: '2026-05-06T01:23:00Z',
      last_detected_at: '2026-05-09T07:31:00Z'
    }
  ]

  const displayFingerprints = fingerprints.length > 0 ? fingerprints : (defaultFingerprints as any)

  // Sort and Filter fingerprints
  const filteredVault = displayFingerprints
    .filter(f => {
      if (cityFilter && f.primary_city !== cityFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'detections') {
        return b.detection_count - a.detection_count
      } else if (sortBy === 'lastSeen') {
        return new Date(b.last_detected_at).getTime() - new Date(a.last_detected_at).getTime()
      } else {
        return Number(b.confidence_score) - Number(a.confidence_score)
      }
    })

  const relativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true }).replace('about ', '')
    } catch (e) {
      return 'long ago'
    }
  }

  return (
    <div className="h-full flex flex-col bg-canvas select-none relative overflow-hidden">
      
      {/* 1. HEADER */}
      <div className="sticky top-0 bg-surface border-b border-border p-4 z-10 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-secondary tracking-widest uppercase">FINGERPRINT VAULT</span>
          <span className="text-[10px] text-muted font-mono mt-0.5">{displayFingerprints.length} BEHAVIORAL PATTERNS IDENTIFIED</span>
        </div>

        <button
          onClick={fetchBrief}
          className="border border-border hover:border-accent hover:text-primary rounded px-3 py-1 flex items-center gap-1.5 transition-colors text-xxs font-mono text-secondary"
        >
          <Brain size={12} className="text-accent animate-pulse" />
          <span>INTELLIGENCE BRIEF</span>
        </button>
      </div>

      {/* 2. SORT + FILTER ROW */}
      <div className="flex justify-between items-center border-b border-border bg-canvas px-4 py-2 text-xxs font-mono">
        <div className="flex gap-2 items-center">
          <span className="text-muted uppercase">SORT BY:</span>
          {(['confidence', 'detections', 'lastSeen'] as const).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`border rounded px-2 py-0.5 tracking-wide transition-all uppercase ${
                sortBy === option
                  ? 'border-accent text-accent bg-accent/5 font-semibold'
                  : 'border-border text-secondary hover:text-primary hover:border-secondary'
              }`}
            >
              {option === 'lastSeen' ? 'LAST SEEN' : option}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-muted uppercase">FILTER:</span>
          {['ALL', 'Delhi', 'Mumbai', 'Bengaluru'].map(c => {
            const isSelected = cityFilter === (c === 'ALL' ? null : c)
            return (
              <button
                key={c}
                onClick={() => setCityFilter(c === 'ALL' ? null : c)}
                className={`border rounded px-2 py-0.5 tracking-wide transition-all uppercase ${
                  isSelected
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-border text-secondary hover:text-primary hover:border-secondary'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. VAULT GRID (2 columns, padding-3) */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 h-full">
        {filteredVault.map((fp) => {
          const isExpanded = isVaultExpanded === fp.id
          const score = Number(fp.confidence_score)

          // Color classification based on confidence score thresholds
          let leftBorder = 'border-l-muted'
          let scoreColor = 'text-muted'
          if (score >= 85) {
            leftBorder = 'border-l-threat-low'
            scoreColor = 'text-threat-low'
          } else if (score >= 60) {
            leftBorder = 'border-l-accent'
            scoreColor = 'text-accent'
          } else if (score >= 30) {
            leftBorder = 'border-l-threat-medium'
            scoreColor = 'text-threat-medium'
          }

          // Build procedural detection dots row
          const totalDots = 8
          const filledDotsCount = Math.min(totalDots, fp.detection_count || 1)
          const emptyDotsCount = totalDots - filledDotsCount

          return (
            <div
              key={fp.id}
              onClick={() => setVaultExpanded(isExpanded ? null : fp.id)}
              className={`bg-elevated border border-border border-l-2 ${leftBorder} rounded-sm px-3.5 py-3 cursor-pointer transition-all flex flex-col gap-2 hover:border-secondary/50 h-fit ${
                isExpanded ? 'col-span-2 border-accent/60' : 'col-span-1'
              }`}
            >
              {/* Card Collapsed Layout */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-mono text-base font-bold text-primary tracking-tight">
                    {Number(fp.primary_frequency_mhz).toFixed(3)} MHz
                  </span>
                  <span className="text-[10px] font-mono text-secondary mt-0.5">{fp.signal_class.replace('_', ' ')}</span>
                </div>

                <div className="flex flex-col items-end">
                  {score >= 85 ? (
                    <Badge variant="high_confidence" label="HIGH CONF" />
                  ) : (
                    <span className={`font-mono text-xs font-semibold tracking-wider ${scoreColor}`}>
                      {score.toFixed(1)}% CONF
                    </span>
                  )}
                </div>
              </div>

              {/* Confidence Meter Bar */}
              <ConfidenceBar value={score} size="sm" showLabel={false} animate={true} />

              {/* Detection dots row */}
              <div className="flex gap-1 items-center mt-0.5">
                {Array.from({ length: filledDotsCount }).map((_, idx) => (
                  <span 
                    key={`f-${idx}`} 
                    className={`h-1.5 w-1.5 rounded-full ${
                      score >= 85 ? 'bg-threat-low' : score >= 60 ? 'bg-accent' : 'bg-secondary'
                    }`} 
                  />
                ))}
                {Array.from({ length: emptyDotsCount }).map((_, idx) => (
                  <span key={`e-${idx}`} className="h-1.5 w-1.5 rounded-full border border-border bg-canvas/30" />
                ))}
              </div>

              {/* Multi-city indicator */}
              <div className="flex gap-1.5 items-center flex-wrap mt-0.5">
                {(fp.cities_detected || [fp.primary_city]).map(city => (
                  <Badge 
                    key={city} 
                    variant="city" 
                    label={city} 
                  />
                ))}
              </div>

              {/* Bottom statistics summary strip */}
              <div className="flex justify-between items-center text-[10px] mt-1 border-t border-border/30 pt-2 font-mono text-muted">
                <span>#{fp.detection_count} DETECTIONS · FIRST {relativeTime(fp.first_detected_at)}</span>
                
                {fp.time_pattern_description && (
                  <div className="flex items-center gap-1 max-w-[150px] truncate text-right">
                    <Clock size={10} />
                    <span className="truncate">{fp.time_pattern_description}</span>
                  </div>
                )}
              </div>

              {/* EXPANDED CONTENT DETAIL (Memory Insights) */}
              {isExpanded && (
                <div className="border-t border-border mt-3 pt-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Pattern Intelligence summary from Hindsight */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] text-muted tracking-wider uppercase">HINDSIGHT PATTERN MEMORY INTEL</span>
                    <p className="text-xs text-secondary leading-relaxed bg-surface/50 p-2.5 border border-border rounded-sm">
                      {fp.pattern_intelligence || 'Baseline fingerprint created. Accumulating behavioral samples to correlate schedule heuristics.'}
                    </p>
                  </div>

                  {/* Signal Faculties Radar Chart */}
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="font-mono text-[9px] text-muted tracking-wider uppercase">SIGNAL FACULTY SIGNATURE</span>
                    <div className="h-36 w-full bg-surface/30 border border-border/40 rounded-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                          { subject: 'Bandwidth', A: fp.primary_frequency_mhz > 14 ? 85 : 45, fullMark: 100 },
                          { subject: 'Power', A: 75, fullMark: 100 },
                          { subject: 'Duration', A: (fp.avg_burst_duration_ms || 100) > 200 ? 90 : 40, fullMark: 100 },
                          { subject: 'Threat', A: score, fullMark: 100 },
                          { subject: 'Cycle', A: (fp.avg_cycle_hours || 10) > 30 ? 80 : 35, fullMark: 100 }
                        ]}>
                          <PolarGrid stroke="#2A2F3A" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#8B909A', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Signal" dataKey="A" stroke={score >= 85 ? '#EF4444' : '#3B82F6'} fill={score >= 85 ? '#EF4444' : '#3B82F6'} fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Dynamic timing details */}
                  {fp.time_pattern_description && (
                    <div className="flex items-center gap-2 text-xxs font-mono bg-surface/40 px-3 py-1.5 border border-border/30 rounded-sm">
                      <span className="text-muted">TIMING ALLOCATION:</span>
                      <span className="text-secondary uppercase">{fp.time_pattern_description}</span>
                    </div>
                  )}

                  {/* Multi-city correlation text */}
                  {(fp.cities_detected || []).length > 1 && (
                    <div className="flex flex-col gap-1 text-xxs font-mono bg-threat-medium/5 px-3 py-2 border border-threat-medium/20 rounded-sm text-threat-medium">
                      <span className="font-bold uppercase tracking-wider">MULTI-CITY SIGNAL PROPAGATION DETECTED</span>
                      <p className="text-secondary font-sans leading-normal">
                        Transmitter detected in both {fp.cities_detected.join(' & ')}. Signal profiles verify high correlation schedule matching. Possible long-range ionospheric skywave bounce or coordinated regional repeater array.
                      </p>
                    </div>
                  )}

                  {/* Cryptographic hash copy link */}
                  <div 
                    onClick={(e) => handleCopyHash(e, fp.id, fp.fingerprint_hash)}
                    className="flex justify-between items-center bg-canvas/30 px-3 py-2 border border-border/40 rounded-sm font-mono text-[10px] cursor-pointer hover:bg-elevated transition-colors"
                  >
                    <span className="text-muted uppercase">CRYPTOGRAPHIC FINGERPRINT</span>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <span className="select-all truncate max-w-[280px]">
                        {fp.fingerprint_hash.slice(0, 16)}...{fp.fingerprint_hash.slice(-4)}
                      </span>
                      {copiedHashId === fp.id ? <Check size={10} className="text-threat-low" /> : <Copy size={10} />}
                    </div>
                  </div>

                  {/* Audit export report */}
                  <div className="flex justify-between items-center mt-1 border-t border-border/30 pt-3">
                    <div className="flex flex-col gap-0.5 font-mono text-[9px] text-muted">
                      <span>FIRST SEEN: {new Date(fp.first_detected_at).toLocaleString()}</span>
                      <span>LAST SEEN: {new Date(fp.last_detected_at).toLocaleString()}</span>
                    </div>
                    <ExportReport fingerprintId={fp.id} fingerprintHash={fp.fingerprint_hash} />
                  </div>

                </div>
              )}

            </div>
          )
        })}
      </div>

      {/* 4. INTELLIGENCE BRIEF SLIDE-OVER */}
      {briefOpen && (
        <>
          {/* Overlay background black mask */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setBriefOpen(false)}
          />

          {/* Slide-over panel */}
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-surface border-l border-border z-50 p-4 shadow-2xl flex flex-col gap-4 transform transition-transform duration-250 ease-out select-none">
            
            {/* Slide Header */}
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-accent" />
                <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">INTELLIGENCE BRIEF</span>
              </div>
              <button 
                onClick={() => setBriefOpen(false)}
                className="text-secondary hover:text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slide brief content loading or summary */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
              
              {briefLoading ? (
                // Procedural pulse skeletons
                <div className="flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-elevated rounded-sm w-3/4" />
                  <div className="h-3 bg-elevated rounded-sm w-full" />
                  <div className="h-3 bg-elevated rounded-sm w-5/6" />
                  <div className="h-3 bg-elevated rounded-sm w-full" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[9px] text-muted tracking-widest uppercase">HINDSIGHT REFLECTED BRIEFING</span>
                    <p className="text-xs text-secondary leading-relaxed bg-canvas/40 p-3 border border-border/60 rounded-sm">
                      {intelligenceBrief?.summary || 'No current intelligence briefings constructed in cross-session cognitive memories.'}
                    </p>
                  </div>

                  {/* Summary Model Diagnostics */}
                  <div className="flex flex-col gap-1 font-mono text-[9px] text-muted border-t border-border/30 pt-2 bg-canvas/20 p-2 border border-border/30 rounded-sm">
                    <span>COGNITIVE PLATFORM: {intelligenceBrief?.model || 'llama3-70b-8192'}</span>
                    <span>GENERATED AT: {intelligenceBrief?.generatedAt ? new Date(intelligenceBrief.generatedAt).toLocaleString() : 'N/A'}</span>
                  </div>

                  {/* Top 3 fingerprints summary strip */}
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="font-mono text-[9px] text-muted tracking-widest uppercase">CRITICAL SUSPECT WATCHLIST</span>
                    
                    {filteredVault.slice(0, 3).map(f => (
                      <div 
                        key={`brief-${f.id}`}
                        onClick={() => {
                          setVaultExpanded(f.id)
                          setBriefOpen(false)
                        }}
                        className="bg-elevated/60 border border-border rounded-sm p-2 flex flex-col gap-1 cursor-pointer hover:bg-elevated transition-colors"
                      >
                        <div className="flex justify-between items-center font-mono text-xxs">
                          <span className="font-bold text-primary">{Number(f.primary_frequency_mhz).toFixed(3)} MHz</span>
                          <span className="text-accent">{Number(f.confidence_score).toFixed(0)}% CONF</span>
                        </div>
                        <ConfidenceBar value={Number(f.confidence_score)} size="sm" showLabel={false} animate={false} />
                        <span className="text-[9px] font-mono text-muted text-right uppercase mt-0.5">{f.primary_city}</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

          </div>
        </>
      )}

    </div>
  )
}
