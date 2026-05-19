import React, { useState, useEffect } from 'react'
import { useTarangStore } from '../../store/tarangStore'
import { formatDistanceToNow } from 'date-fns'

export default function TopBar() {
  const { isSocketConnected, nodes, uptimeStart } = useTarangStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [uptimeStr, setUptimeStr] = useState('00:00:00')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      
      const diffMs = Date.now() - uptimeStart.getTime()
      const diffSecs = Math.floor(diffMs / 1000)
      const hours = String(Math.floor(diffSecs / 3600)).padStart(2, '0')
      const minutes = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0')
      const seconds = String(diffSecs % 60).padStart(2, '0')
      setUptimeStr(`${hours}:${minutes}:${seconds}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [uptimeStart])

  // Current IST Time formatting
  const formatIST = (date: Date) => {
    // Get UTC time first, then add IST offset (+5:30)
    const utc = date.getTime() + date.getTimezoneOffset() * 60000
    const istTime = new Date(utc + (3600000 * 5.5))
    
    const h = String(istTime.getHours()).padStart(2, '0')
    const m = String(istTime.getMinutes()).padStart(2, '0')
    const s = String(istTime.getSeconds()).padStart(2, '0')
    
    return `${h}:${m}:${s} IST`
  }

  // Pre-configured nodes if dynamic data is empty
  const defaultNodes = [
    { name: 'Delhi-Alpha', city: 'Delhi', status: 'connected', current_frequency_khz: 14000 },
    { name: 'Mumbai-Alpha', city: 'Mumbai', status: 'connecting', current_frequency_khz: 7000 },
    { name: 'Bengaluru-Alpha', city: 'Bengaluru', status: 'disconnected', current_frequency_khz: 10118 }
  ]

  const displayNodes = nodes.length > 0 ? nodes : defaultNodes

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-surface border-b border-border px-4 flex items-center justify-between z-50 select-none">
      
      {/* LEFT: Branding + Socket Status */}
      <div className="w-48 flex items-center gap-2">
        <span className="font-semibold tracking-widest text-xs text-primary">TARANG</span>
        <span className="font-semibold tracking-widest text-xs text-accent">WATCH</span>
        <div className="h-2 w-2 rounded-full bg-muted/60 mx-1" />
        
        {isSocketConnected ? (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-threat-low pulse-dot" />
            <span className="font-mono text-xxs tracking-wider text-threat-low font-medium">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-threat-high" />
            <span className="font-mono text-xxs tracking-wider text-threat-high font-medium">OFFLINE</span>
          </div>
        )}
      </div>

      {/* CENTER: Node pills */}
      <div className="flex-1 flex justify-center gap-3">
        {displayNodes.map((node) => {
          let dotColor = 'bg-muted'
          let borderColor = 'border-border'
          if (node.status === 'connected') {
            dotColor = 'bg-threat-low'
            borderColor = 'border-threat-low/20'
          } else if (node.status === 'connecting') {
            dotColor = 'bg-threat-medium'
            borderColor = 'border-threat-medium/20'
          }

          const freqMhz = node.current_frequency_khz 
            ? `${(node.current_frequency_khz / 1000).toFixed(3)} MHz` 
            : '0.000 MHz'

          return (
            <div 
              key={node.name} 
              className={`border ${borderColor} rounded px-3 py-0.5 flex flex-col justify-center items-center bg-canvas/30`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xxs font-medium tracking-wide text-primary uppercase">{node.city}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              </div>
              <span className="font-mono text-xxs text-secondary tracking-tight">
                {node.status === 'connected' ? freqMhz : node.status.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>

      {/* RIGHT: Telemetry Metrics / Clock */}
      <div className="w-48 flex justify-end items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="font-mono text-xxs text-secondary uppercase tracking-tight">UP {uptimeStr}</span>
        </div>
        
        <div className="w-[1px] bg-border h-4" />
        
        <div className="font-mono text-sm text-primary font-medium min-w-[85px] text-right">
          {formatIST(currentTime)}
        </div>
      </div>

    </header>
  )
}
