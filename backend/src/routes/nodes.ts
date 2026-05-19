import { Router, Request, Response } from 'express'
import { supabase } from '../db/supabase'
import { emitNodeStatusChanged } from '../services/socketService'

const router = Router()

/**
 * GET /api/nodes
 * Returns all monitored KiwiSDR nodes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    
    const mappedData = (data ?? []).map(n => ({
      ...n,
      current_frequency_khz: n.frequency_range_low_mhz ? Math.round(Number(n.frequency_range_low_mhz) * 1000) : null
    }))
    
    return res.json(mappedData)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * POST /api/nodes/:name/status
 * Updates node online status, current scanning frequency, and last seen timestamp
 */
router.post('/:name/status', async (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const { status, lastSeen, currentFrequencyKhz } = req.body
    const io = req.app.get('io')

    // Find node ID
    const { data: node, error: findError } = await supabase
      .from('nodes')
      .select('id')
      .eq('name', name)
      .maybeSingle()

    if (findError) throw findError
    if (!node) {
      return res.status(404).json({ error: `Monitored node ${name} not found` })
    }

    const { data: updatedNode, error: updateError } = await supabase
      .from('nodes')
      .update({
        status: status || 'connected',
        last_seen: lastSeen || new Date().toISOString(),
        // Save current frequency information if scanning
        ...(currentFrequencyKhz !== undefined ? { frequency_range_low_mhz: Number(currentFrequencyKhz) / 1000 } : {})
      })
      .eq('id', node.id)
      .select()
      .single()

    if (updateError) throw updateError

    const mappedNode = {
      ...updatedNode,
      current_frequency_khz: updatedNode.frequency_range_low_mhz ? Math.round(Number(updatedNode.frequency_range_low_mhz) * 1000) : null
    }

    // Emit live update
    if (io) emitNodeStatusChanged(io, mappedNode)

    return res.json(mappedNode)
  } catch (err: any) {
    console.error('Node status update error:', err)
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * GET /api/nodes/stats
 * Aggregates and returns overall system telemetry metrics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 1. Fetch node stats
    const { data: nodes } = await supabase
      .from('nodes')
      .select('total_scans, total_anomalies')

    let totalScans = 0
    let totalAnomalies = 0

    if (nodes) {
      nodes.forEach(n => {
        totalScans += n.total_scans || 0
        totalAnomalies += n.total_anomalies || 0
      })
    }

    // 2. Fetch fingerprint counts
    const { count: totalFingerprints } = await supabase
      .from('fingerprints')
      .select('*', { count: 'exact', head: true })

    const { count: highConfidenceFingerprints } = await supabase
      .from('fingerprints')
      .select('*', { count: 'exact', head: true })
      .gte('confidence_score', 60.0)

    // 3. Count LLM calls today
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const { count: llmCallsToday } = await supabase
      .from('llm_calls')
      .select('*', { count: 'exact', head: true })
      .gte('called_at', startOfToday.toISOString())

    return res.json({
      totalScans,
      totalAnomalies,
      totalFingerprints: totalFingerprints || 0,
      highConfidenceFingerprints: highConfidenceFingerprints || 0,
      llmCallsToday: llmCallsToday || 0,
      uptimeSeconds: Math.floor(process.uptime())
    })
  } catch (err: any) {
    console.error('Stats query failed:', err)
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

export default router
