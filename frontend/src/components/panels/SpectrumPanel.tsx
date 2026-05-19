import React, { useState, useEffect, useRef } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts'
import { io } from 'socket.io-client'
import { useTarangStore } from '../../store/tarangStore'
import Badge from '../shared/Badge'
import IndiaMapView from './IndiaMapView'

interface Marker {
  id: string
  frequency: number
  signalClass: string
  threatLevel: string
  timestamp: number
}

export default function SpectrumPanel() {
  const { anomalies, nodes, setActivePanel } = useTarangStore()
  const [selectedCity, setSelectedCity] = useState('Delhi')
  const [sweepProgress, setSweepProgress] = useState(0)
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([])
  const [tick, setTick] = useState(0)
  const [demoActive, setDemoActive] = useState(false)

  const SCAN_INTERVAL = 30 // seconds
  const sweepTimerRef = useRef<any | null>(null)
  const waterfallCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Default selected city based on the most recent anomaly
  useEffect(() => {
    if (anomalies.length > 0) {
      setSelectedCity(anomalies[0].city)
    }
  }, [])

  // Continuous animation ticker for real-time waterfall scrolling and spectrum noise dancing
  useEffect(() => {
    if (!demoActive) return
    const timer = setInterval(() => {
      setTick(t => t + 1)
    }, 150)
    return () => clearInterval(timer)
  }, [demoActive])

  // Manage sweep progress animation simulation
  useEffect(() => {
    setSweepProgress(0)
    if (sweepTimerRef.current) clearInterval(sweepTimerRef.current)

    const intervalMs = 100 // update every 100ms
    const totalSteps = (SCAN_INTERVAL * 1000) / intervalMs
    let currentStep = 0

    sweepTimerRef.current = setInterval(() => {
      currentStep = (currentStep + 1) % totalSteps
      setSweepProgress((currentStep / totalSteps) * 100)
    }, intervalMs)

    return () => {
      if (sweepTimerRef.current) clearInterval(sweepTimerRef.current)
    }
  }, [selectedCity])

  // Watch for new anomalies and push reference line markers
  useEffect(() => {
    if (anomalies.length === 0) return
    const latest = anomalies[0]
    
    // Check if anomaly belongs to active city and isn't extremely old
    if (latest.city === selectedCity) {
      const isNew = (Date.now() - new Date(latest.detected_at).getTime()) < 10000
      if (isNew) {
        const newMarker: Marker = {
          id: latest.id,
          frequency: Number(latest.peak_frequency_mhz),
          signalClass: latest.signal_class,
          threatLevel: latest.threat_level,
          timestamp: Date.now()
        }

        setActiveMarkers(prev => {
          // Keep max 3, filter out matching duplicates
          const filtered = prev.filter(m => m.frequency !== newMarker.frequency)
          return [newMarker, ...filtered].slice(0, 3)
        })

        // Remove marker after 5 seconds
        setTimeout(() => {
          setActiveMarkers(prev => prev.filter(m => m.id !== newMarker.id))
        }, 5000)
      }
    }
  }, [anomalies, selectedCity])

  // Node details for current selected city
  const activeNode = nodes.find(n => n.city === selectedCity) || {
    status: 'connected',
    frequency_range_low_mhz: 0.5,
    frequency_range_high_mhz: 30.0,
    current_frequency_khz: 14000,
    total_scans: 2831,
    total_anomalies: 12
  }

  // Get active anomaly for PSD rendering
  const activeAnomaly = anomalies.find(a => a.city === selectedCity)

  // Generate synthetic beautiful high-density PSD curve with micro-fluctuations (tick-driven)
  const generatePSDData = () => {
    const low = Number(activeNode.frequency_range_low_mhz || 0.5)
    const high = Number(activeNode.frequency_range_high_mhz || 30.0)
    const size = 256
    const dataPoints: { frequency: number; power: number }[] = []

    const peakFreq = activeAnomaly ? Number(activeAnomaly.peak_frequency_mhz) : 14.235

    for (let i = 0; i < size; i++) {
      const freq = low + ((high - low) * i) / size
      
      // Base noise: nice random fluctuations with a baseline floor around 15 dBm
      // Uses sine/cos mixed with tick to create real flowing waves
      const noiseWave = Math.sin(i / 8 + tick * 0.1) * 3 + Math.cos(i / 3 - tick * 0.05) * 1.5
      let power = 15 + noiseWave + Math.random() * 2.5

      // Overlay signal spikes if there is an active anomaly/trigger
      if (activeAnomaly) {
        const distance = Math.abs(freq - peakFreq)
        if (distance < 0.8) {
          const peakHeight = Math.abs(Number(activeAnomaly.peak_power_db || -60))
          // Add pulse modulation to the spike
          const spikeMod = 1 + Math.sin(tick * 0.4) * 0.05
          power += (peakHeight > 0 ? peakHeight : 75) * spikeMod * Math.exp(-Math.pow(distance, 2) / 0.04)
        }
      }

      // Add default historic spikes for Delhi, Mumbai, Bengaluru to make them visually premium
      if (selectedCity === 'Delhi') {
        if (Math.abs(freq - 14.235) < 0.4) {
          power += (65 + Math.sin(tick * 0.25) * 4) * Math.exp(-Math.pow(freq - 14.235, 2) / 0.015)
        }
        if (Math.abs(freq - 18.095) < 0.25) {
          power += (45 + Math.cos(tick * 0.35) * 3) * Math.exp(-Math.pow(freq - 18.095, 2) / 0.008)
        }
      } else if (selectedCity === 'Mumbai') {
        if (Math.abs(freq - 7.073) < 0.5) {
          // Wideband continuous signal
          power += (75 + Math.sin(tick * 0.15) * 5) * Math.exp(-Math.pow(freq - 7.073, 2) / 0.12)
        }
        if (Math.abs(freq - 10.118) < 0.3) {
          // Hopping signal spike
          power += (55 + Math.cos(tick * 0.3) * 8) * Math.exp(-Math.pow(freq - 10.118, 2) / 0.02)
        }
      } else if (selectedCity === 'Bengaluru') {
        if (Math.abs(freq - 21.340) < 0.5) {
          power += (55 + Math.sin(tick * 0.2) * 3) * Math.exp(-Math.pow(freq - 21.340, 2) / 0.02)
        }
        if (Math.abs(freq - 14.150) < 0.35) {
          power += (60 + Math.cos(tick * 0.3) * 6) * Math.exp(-Math.pow(freq - 14.150, 2) / 0.015)
        }
      }

      dataPoints.push({
        frequency: Number(freq.toFixed(3)),
        power: Math.min(100, Math.max(0, Number(power.toFixed(1))))
      })
    }
    return dataPoints
  }

  const psdData = generatePSDData()

  // Manage High-performance scrolling waterfall canvas using REAL Socket data
  const buffer = useRef<number[][]>([])
  
  useEffect(() => {
    const canvas = waterfallCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width || 600
      canvas.height = rect.height || 120
      
      ctx.fillStyle = '#080C14'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
    
    socket.on('spectrum_update', (data) => {
      if (!demoActive) return // Strictly freeze waterfall until button is clicked
      const fft = data.fft_data || [] // array of 512 values
      buffer.current.push(fft)
      if (buffer.current.length > 120) buffer.current.shift()
      
      drawWaterfall()
    })

    const drawWaterfall = () => {
      if (!canvas) return
      const w = canvas.width
      const h = canvas.height
      
      // Shift canvas content DOWN by 1.5 pixels
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = w
      tempCanvas.height = h
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0)
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(tempCanvas, 0, 1.5, w, h - 1.5)
      }

      // Draw the new top row
      const latestRow = buffer.current[buffer.current.length - 1]
      if (!latestRow) return

      const rowImgData = ctx.createImageData(w, 1)
      for (let x = 0; x < w; x++) {
        const binIdx = Math.floor((x / w) * latestRow.length)
        const pwr = latestRow[binIdx] || 0
        
        const intensity = Math.min(255, Math.floor(pwr * 2.5))
        
        const r = intensity
        const g = Math.floor(intensity * 0.4)
        const b = 80
        
        const idx = x * 4
        rowImgData.data[idx] = r
        rowImgData.data[idx+1] = g
        rowImgData.data[idx+2] = b
        rowImgData.data[idx+3] = 255
      }
      ctx.putImageData(rowImgData, 0, 0)
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      socket.disconnect()
    }
  }, [demoActive])

  // Format Recharts custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-elevated border border-border px-3 py-1.5 rounded text-xxs font-mono text-secondary">
          <span className="text-primary font-medium">{data.frequency.toFixed(3)} MHz</span>
          <span className="mx-1.5">·</span>
          <span>PWR: {data.power} dB</span>
        </div>
      )
    }
    return null
  }

  const cities = ['Delhi', 'Mumbai', 'Bengaluru']

  return (
    <div className="absolute inset-0 flex flex-col bg-canvas select-none overflow-y-auto">
      
      {/* 1. CITY TABS AND DEMO BUTTON */}
      <div className="flex justify-between border-b border-border bg-surface px-2 shrink-0">
        <div className="flex">
          {cities.map(city => {
            const node = nodes.find(n => n.city === city)
            const isConnected = node?.status === 'connected'
            const isActive = selectedCity === city

            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-6 py-2.5 text-xs font-semibold tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                  isActive 
                    ? 'text-primary border-accent' 
                    : 'text-secondary border-transparent hover:text-primary'
                }`}
              >
                <span>{city.toUpperCase()}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-threat-low' : 'bg-muted'}`} />
              </button>
            )
          })}
        </div>
        
        <div className="flex items-center px-4">
          <button 
            onClick={() => {
              setDemoActive(true)
              const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
              socket.emit('start_demo')
              setTimeout(() => socket.disconnect(), 1000)
            }}
            className="px-4 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-green-600 uppercase tracking-widest rounded transition-colors shadow-lg"
          >
            Activate Live Demo Mode
          </button>
        </div>
      </div>

      {/* 2. SPECTRUM VISUALIZER WORKSPACE */}
      <div className="flex-1 p-4 bg-canvas flex flex-col gap-4 shrink-0 min-h-[500px]">
        {/* Top: 2D PSD Density Curve */}
        <div className="flex-1 h-[260px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={psdData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid vertical={false} stroke="#23272F" strokeOpacity={0.4} />
              
              <XAxis 
                dataKey="frequency" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#8B909A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                dy={8}
                domain={['dataMin', 'dataMax']}
                type="number"
              />
              
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#8B909A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: 'PWR', angle: -90, position: 'insideLeft', fill: '#4A4F5C', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Dynamic Anomaly reference lines */}
              {activeMarkers.map(marker => (
                <ReferenceLine
                  key={marker.id}
                  x={marker.frequency}
                  stroke={marker.threatLevel === 'high' ? '#EF4444' : marker.threatLevel === 'medium' ? '#F59E0B' : '#22C55E'}
                  strokeDasharray="4 2"
                  label={{
                    value: `ALERT: ${marker.frequency.toFixed(3)} MHz [${marker.signalClass.slice(0, 5)}]`,
                    position: 'top',
                    fill: '#E8EAF0',
                    fontSize: 8,
                    fontFamily: 'JetBrains Mono'
                  }}
                />
              ))}

              <Area 
                type="monotone" 
                dataKey="power" 
                stroke="#3B82F6" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#spectrumGradient)" 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom: 3D Rolling Spectrogram Waterfall */}
        <div className="shrink-0 h-[160px] flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-muted tracking-wider">
            <span className="uppercase font-semibold text-secondary">REAL-TIME SPECTROGRAM WATERFALL (HISTORICAL SCAN)</span>
            <span>-120 dBm ────── -40 dBm</span>
          </div>
          <canvas 
            ref={waterfallCanvasRef} 
            className="border border-border/80 rounded-sm w-full flex-1 h-[160px] shadow-inner select-none pointer-events-none"
          />
        </div>
      </div>

      {/* 3. SCANNER INFO STATUS */}
      <div className="h-[76px] shrink-0 border-t border-border bg-surface px-6 py-3 flex justify-between items-center">
        
        {/* Left: Tuning Sweep */}
        <div className="flex flex-col gap-0.5 min-w-[200px]">
          <span className="font-mono text-[9px] text-muted tracking-widest uppercase">SCANNING BAND</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold text-primary tracking-tight">
              {((activeNode.current_frequency_khz || 14000) / 1000).toFixed(3)} MHz
            </span>
            <span className="text-xxs text-secondary">
              BAND {((activeNode.current_frequency_khz || 14000) === 14000 ? '3' : '1')} OF 5
            </span>
          </div>
          {/* Animated Sweep Line indicator */}
          <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1.5">
            <div 
              className="h-full bg-accent/40 rounded-full transition-all duration-100"
              style={{ width: `${sweepProgress}%` }}
            />
          </div>
        </div>

        {/* Right: Aggregated Node Info */}
        <div className="flex gap-6 items-center">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] text-secondary">
              FRAMES INGESTED: <span className="text-primary font-bold">{(activeNode.total_scans || 14210)}</span>
            </span>
            <span className="font-mono text-[10px] text-secondary mt-0.5">
              ANOMALIES RECORDED: <span className="text-primary font-bold">{(activeNode.total_anomalies || 12)}</span>
            </span>
          </div>
          <div className="h-6 w-[1px] bg-border" />
          <Badge variant={activeNode?.status === 'connected' ? 'live' : 'city'} label={activeNode?.status === 'connected' ? 'ONLINE' : 'CONNECTING'} />
        </div>

      </div>

      {/* 4. RECENT STRIP */}
      <div className="h-[120px] shrink-0 border-t border-border bg-elevated/40 p-3 flex flex-col gap-2">
        <span className="font-mono text-[9px] text-muted tracking-widest uppercase">RECENT DETECTIONS</span>
        
        <div className="flex gap-3 overflow-x-auto pb-1 select-none">
          {anomalies.slice(0, 5).map(anomaly => {
            let leftBorder = 'border-l-threat-low'
            if (anomaly.threat_level === 'high') leftBorder = 'border-l-threat-high'
            else if (anomaly.threat_level === 'medium') leftBorder = 'border-l-threat-medium'

            return (
              <div
                key={anomaly.id}
                onClick={() => {
                  setActivePanel('anomalies')
                }}
                className={`min-w-[150px] border border-border border-l-2 ${leftBorder} rounded-sm px-2.5 py-1.5 bg-surface/50 hover:bg-elevated cursor-pointer transition-all flex flex-col justify-between`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {Number(anomaly.peak_frequency_mhz).toFixed(3)} MHz
                  </span>
                  <span className="text-[9px] font-mono text-muted uppercase">{anomaly.city}</span>
                </div>
                
                <div className="mt-1 flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-secondary truncate">{anomaly.signal_class.replace('_', ' ')}</span>
                  <span className="text-[9px] font-mono text-muted">
                    {new Date(anomaly.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          
          {anomalies.length === 0 && (
            <div className="w-full flex items-center justify-center h-14 border border-dashed border-border rounded text-xxs font-mono text-muted uppercase">
              No anomaly occurrences logged in database.
            </div>
          )}
        </div>
      </div>

      {/* 5. INDIA MAP - NATIONAL THREAT TOPOLOGY */}
      <IndiaMapView />

    </div>
  )
}
