import React, { useState, useEffect } from 'react'
import { useTarangStore } from '../../store/tarangStore'

interface CityNode {
  name: string
  lat: number
  lng: number
  svgX: number
  svgY: number
  alerts: number
  highThreats: number
  mediumThreats: number
  lowThreats: number
  status: 'active' | 'warning' | 'critical'
  lastSignal: string
}

const BASELINE_CITIES: CityNode[] = [
  {
    name: 'Delhi',
    lat: 28.6139,
    lng: 77.2090,
    svgX: 248,
    svgY: 125,
    alerts: 247,
    highThreats: 18,
    mediumThreats: 89,
    lowThreats: 140,
    status: 'critical',
    lastSignal: 'Burst TX @ 14.235 MHz \u00b7 -58.4 dBm \u00b7 312ms'
  },
  {
    name: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    svgX: 195,
    svgY: 275,
    alerts: 183,
    highThreats: 7,
    mediumThreats: 64,
    lowThreats: 112,
    status: 'warning',
    lastSignal: 'Freq Hop @ 10.118 MHz \u00b7 -62.1 dBm \u00b7 180ms'
  },
  {
    name: 'Bengaluru',
    lat: 12.9716,
    lng: 77.5946,
    svgX: 230,
    svgY: 355,
    alerts: 312,
    highThreats: 23,
    mediumThreats: 104,
    lowThreats: 185,
    status: 'active',
    lastSignal: 'Narrowband @ 21.340 MHz \u00b7 -55.7 dBm \u00b7 94ms'
  }
]

// Simplified India outline path (SVG coordinates)
const INDIA_OUTLINE = `
  M 230,30 L 260,28 L 280,40 L 295,35 L 310,45 L 325,50 L 335,65
  L 340,80 L 335,95 L 340,110 L 330,120 L 325,135 L 315,140
  L 310,155 L 300,165 L 295,180 L 300,195 L 310,205 L 315,220
  L 310,235 L 305,250 L 295,260 L 285,275 L 280,290 L 270,305
  L 260,320 L 255,335 L 248,350 L 240,365 L 230,380 L 220,390
  L 215,400 L 220,410 L 230,415 L 225,425 L 215,420
  L 200,410 L 190,395 L 180,380 L 175,365 L 170,350
  L 165,335 L 160,320 L 155,305 L 150,290 L 152,275
  L 155,260 L 160,245 L 165,230 L 170,215 L 175,200
  L 178,185 L 175,170 L 170,155 L 165,140 L 162,125
  L 165,110 L 170,95 L 180,80 L 190,70 L 200,60
  L 210,50 L 220,40 Z
`

export default function IndiaMapView() {
  const { anomalies } = useTarangStore()
  const [activePulse, setActivePulse] = useState<string | null>(null)
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [liveAlerts, setLiveAlerts] = useState(BASELINE_CITIES)

  // Derive live counts from real store anomalies + baseline
  useEffect(() => {
    const counts: Record<string, { h: number; m: number; l: number }> = {
      Delhi: { h: 0, m: 0, l: 0 },
      Mumbai: { h: 0, m: 0, l: 0 },
      Bengaluru: { h: 0, m: 0, l: 0 },
    }
    anomalies.forEach((a: any) => {
      const city = a.city || 'Bengaluru'
      if (counts[city]) {
        if (a.threat_level === 'high') counts[city].h++
        else if (a.threat_level === 'medium') counts[city].m++
        else counts[city].l++
      }
    })
    setLiveAlerts(BASELINE_CITIES.map(c => {
      const live = counts[c.name] || { h: 0, m: 0, l: 0 }
      return {
        ...c,
        highThreats: c.highThreats + live.h,
        mediumThreats: c.mediumThreats + live.m,
        lowThreats: c.lowThreats + live.l,
        alerts: c.alerts + live.h + live.m + live.l,
      }
    }))
  }, [anomalies])

  // Cycle through cities for the pulse animation
  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      setActivePulse(BASELINE_CITIES[idx % BASELINE_CITIES.length].name)
      idx++
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#EF4444'
      case 'warning': return '#F59E0B'
      case 'active': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  const getStatusGlow = (status: string) => {
    switch (status) {
      case 'critical': return 'rgba(239, 68, 68, 0.4)'
      case 'warning': return 'rgba(245, 158, 11, 0.4)'
      case 'active': return 'rgba(59, 130, 246, 0.4)'
      default: return 'rgba(107, 114, 128, 0.3)'
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-canvas/80 backdrop-blur-sm">

      {/* Section Header */}
      <div className="px-6 pt-5 pb-3 flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] font-bold text-secondary tracking-[0.25em] uppercase">
            NATIONAL THREAT TOPOLOGY
          </span>
          <span className="font-mono text-[9px] text-muted tracking-wider">
            CUMULATIVE ALERT DISTRIBUTION ACROSS MONITORED NODES
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[9px] text-muted">CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="font-mono text-[9px] text-muted">WARNING</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="font-mono text-[9px] text-muted">MONITORING</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 px-6 pb-6">

        {/* LEFT: SVG India Map */}
        <div className="flex-1 relative">
          <svg
            viewBox="100 0 300 450"
            className="w-full h-[420px]"
            style={{ filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.08))' }}
          >
            {/* Background grid lines */}
            {Array.from({ length: 20 }).map((_, i) => (
              <React.Fragment key={`grid-${i}`}>
                <line
                  x1={100} y1={i * 22.5} x2={400} y2={i * 22.5}
                  stroke="#1a1f2e" strokeWidth="0.3"
                />
                <line
                  x1={100 + i * 15} y1={0} x2={100 + i * 15} y2={450}
                  stroke="#1a1f2e" strokeWidth="0.3"
                />
              </React.Fragment>
            ))}

            {/* India outline */}
            <path
              d={INDIA_OUTLINE}
              fill="rgba(59, 130, 246, 0.03)"
              stroke="rgba(59, 130, 246, 0.25)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Connection lines between cities */}
            {liveAlerts.map((city, i) => {
              const nextCity = liveAlerts[(i + 1) % liveAlerts.length]
              return (
                <line
                  key={`conn-${city.name}`}
                  x1={city.svgX} y1={city.svgY}
                  x2={nextCity.svgX} y2={nextCity.svgY}
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0" to="8"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </line>
              )
            })}

            {/* City markers */}
            {liveAlerts.map((city) => {
              const color = getStatusColor(city.status)
              const glow = getStatusGlow(city.status)
              const isPulsing = activePulse === city.name
              const isHovered = hoveredCity === city.name

              return (
                <g
                  key={city.name}
                  onMouseEnter={() => setHoveredCity(city.name)}
                  onMouseLeave={() => setHoveredCity(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer pulse ring */}
                  {isPulsing && (
                    <>
                      <circle cx={city.svgX} cy={city.svgY} r="18" fill="none" stroke={color} strokeWidth="0.8" opacity="0">
                        <animate attributeName="r" from="8" to="28" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={city.svgX} cy={city.svgY} r="18" fill="none" stroke={color} strokeWidth="0.5" opacity="0">
                        <animate attributeName="r" from="8" to="35" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}

                  {/* Glow circle */}
                  <circle
                    cx={city.svgX} cy={city.svgY} r={isHovered ? 14 : 10}
                    fill={glow}
                    style={{ transition: 'r 0.3s ease' }}
                  />

                  {/* Core dot */}
                  <circle
                    cx={city.svgX} cy={city.svgY} r={isHovered ? 6 : 4.5}
                    fill={color}
                    stroke="#0B0F19"
                    strokeWidth="1.5"
                    style={{ transition: 'r 0.3s ease' }}
                  />

                  {/* City label */}
                  <text
                    x={city.svgX + 14} y={city.svgY - 8}
                    fill={isHovered ? '#F1F5F9' : '#8B909A'}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={isHovered ? '700' : '500'}
                    style={{ transition: 'fill 0.2s ease' }}
                  >
                    {city.name.toUpperCase()}
                  </text>

                  {/* Alert count badge */}
                  <rect
                    x={city.svgX + 14} y={city.svgY - 2}
                    width="46" height="14" rx="2"
                    fill={isHovered ? 'rgba(30, 35, 50, 0.95)' : 'rgba(20, 25, 40, 0.8)'}
                    stroke={color}
                    strokeWidth="0.5"
                  />
                  <text
                    x={city.svgX + 18} y={city.svgY + 9}
                    fill={color}
                    fontSize="7.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                  >
                    {city.alerts} ALERTS
                  </text>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <g>
                      <rect
                        x={city.svgX - 55} y={city.svgY + 18}
                        width="155" height="48" rx="3"
                        fill="rgba(15, 20, 35, 0.95)"
                        stroke={color}
                        strokeWidth="0.6"
                      />
                      <text x={city.svgX - 48} y={city.svgY + 32} fill="#8B909A" fontSize="6.5" fontFamily="JetBrains Mono, monospace">
                        LAST INTERCEPT:
                      </text>
                      <text x={city.svgX - 48} y={city.svgY + 42} fill="#CBD5E1" fontSize="6" fontFamily="JetBrains Mono, monospace">
                        {city.lastSignal}
                      </text>
                      <text x={city.svgX - 48} y={city.svgY + 56} fill={color} fontSize="6.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                        H:{city.highThreats} · M:{city.mediumThreats} · L:{city.lowThreats}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Coordinate labels */}
            <text x="105" y="445" fill="#2A2F3A" fontSize="7" fontFamily="JetBrains Mono">68°E</text>
            <text x="370" y="445" fill="#2A2F3A" fontSize="7" fontFamily="JetBrains Mono">97°E</text>
            <text x="105" y="15" fill="#2A2F3A" fontSize="7" fontFamily="JetBrains Mono">37°N</text>
            <text x="105" y="430" fill="#2A2F3A" fontSize="7" fontFamily="JetBrains Mono">8°N</text>
          </svg>
        </div>

        {/* RIGHT: City Alert Breakdown Cards */}
        <div className="w-[280px] shrink-0 flex flex-col gap-3">

          <span className="font-mono text-[9px] text-muted tracking-[0.2em] uppercase">
            NODE ALERT BREAKDOWN
          </span>

          {liveAlerts.map((city) => {
            const color = getStatusColor(city.status)
            const total = city.highThreats + city.mediumThreats + city.lowThreats
            const highPct = total > 0 ? (city.highThreats / total) * 100 : 0
            const medPct = total > 0 ? (city.mediumThreats / total) * 100 : 0
            const lowPct = total > 0 ? (city.lowThreats / total) * 100 : 0

            return (
              <div
                key={city.name}
                className="bg-elevated/60 border border-border rounded-sm p-3 flex flex-col gap-2 hover:border-secondary/40 transition-colors"
                style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
              >
                {/* City header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-mono text-xs font-bold text-primary tracking-wider uppercase">
                      {city.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-semibold" style={{ color }}>
                    {city.alerts} TOTAL
                  </span>
                </div>

                {/* Stacked threat bar */}
                <div className="h-2 w-full rounded-full bg-canvas/60 overflow-hidden flex">
                  <div className="h-full bg-red-500 transition-all" style={{ width: `${highPct}%` }} />
                  <div className="h-full bg-yellow-500 transition-all" style={{ width: `${medPct}%` }} />
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${lowPct}%` }} />
                </div>

                {/* Threat breakdown numbers */}
                <div className="flex justify-between text-[9px] font-mono text-muted">
                  <span><span className="text-red-400 font-bold">{city.highThreats}</span> HIGH</span>
                  <span><span className="text-yellow-400 font-bold">{city.mediumThreats}</span> MED</span>
                  <span><span className="text-blue-400 font-bold">{city.lowThreats}</span> LOW</span>
                </div>

                {/* Last signal info */}
                <div className="text-[8px] font-mono text-muted/70 truncate border-t border-border/30 pt-1.5">
                  LAST: {city.lastSignal}
                </div>
              </div>
            )
          })}

          {/* Total summary */}
          <div className="bg-surface/40 border border-border/50 rounded-sm p-2.5 flex justify-between items-center">
            <span className="font-mono text-[9px] text-muted tracking-wider uppercase">NATIONAL TOTAL</span>
            <span className="font-mono text-sm font-bold text-primary">
              {liveAlerts.reduce((sum, c) => sum + c.alerts, 0)} ALERTS
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
