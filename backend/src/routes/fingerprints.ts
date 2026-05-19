import { Router, Request, Response } from 'express'
import { supabase } from '../db/supabase'
import { storePatternIntelligence } from '../services/hindsightService'
import { getIntelligenceBrief } from '../services/llmService'
import crypto from 'crypto'

const router = Router()

/**
 * GET /api/fingerprints
 * Query: city?, status?, minConfidence?, sortBy=confidence|detections|lastSeen, limit=50
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, status, minConfidence, sortBy = 'confidence', limit = '50' } = req.query

    let query = supabase
      .from('fingerprints')
      .select('*')

    if (city) {
      query = query.eq('primary_city', city)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (minConfidence) {
      query = query.gte('confidence_score', Number(minConfidence))
    }

    // Sorting
    if (sortBy === 'detections') {
      query = query.order('detection_count', { ascending: false })
    } else if (sortBy === 'lastSeen') {
      query = query.order('last_detected_at', { ascending: false })
    } else {
      query = query.order('confidence_score', { ascending: false })
    }

    query = query.limit(Number(limit))

    const { data, error } = await query
    if (error) throw error

    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * GET /api/fingerprints/intelligence/brief
 * Builds intelligence summary of top patterns detected using Hindsight / LLM fallback
 */
router.get('/intelligence/brief', async (req: Request, res: Response) => {
  try {
    // Fetch top 8 fingerprints to build context
    const { data: fingerprints, error } = await supabase
      .from('fingerprints')
      .select('*')
      .order('confidence_score', { ascending: false })
      .limit(8)

    if (error) throw error

    if (!fingerprints || fingerprints.length === 0) {
      return res.json({
        summary: 'No anomaly patterns detected yet. Monitoring active.',
        model: 'none',
        generatedAt: new Date().toISOString()
      })
    }

    const contextStr = fingerprints.map(fp => (
      `- Freq: ${fp.primary_frequency_mhz} MHz in ${fp.primary_city}. ` +
      `Class: ${fp.signal_class}. Confidence: ${Number(fp.confidence_score).toFixed(1)}%. ` +
      `Detections: ${fp.detection_count}. Pattern: ${fp.time_pattern_description || 'unknown'}. ` +
      `Intelligence: ${fp.pattern_intelligence || 'none'}`
    )).join('\n')

    const brief = await getIntelligenceBrief(contextStr)

    return res.json({
      summary: brief.summary,
      model: brief.model,
      generatedAt: new Date().toISOString()
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * GET /api/fingerprints/hash/:hash
 * Retrieve fingerprint by hash (used by Python processor)
 */
router.get('/hash/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params
    const { data, error } = await supabase
      .from('fingerprints')
      .select('*')
      .eq('fingerprint_hash', hash)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Fingerprint not found' })
    }

    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * GET /api/fingerprints/:id
 * Retrieves details of a fingerprint along with last 20 anomalies
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data: fingerprint, error: fpError } = await supabase
      .from('fingerprints')
      .select('*')
      .eq('id', id)
      .single()

    if (fpError || !fingerprint) {
      return res.status(404).json({ error: 'Fingerprint not found' })
    }

    const { data: anomalies, error: anomaliesError } = await supabase
      .from('anomaly_events')
      .select('*')
      .eq('fingerprint_id', id)
      .order('detected_at', { ascending: false })
      .limit(20)

    return res.json({
      ...fingerprint,
      anomalies: anomalies ?? []
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * POST /api/fingerprints/seed
 * Body: fingerprint object from seed_transmissions.json
 * Upserts a fingerprint and its historic detections.
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const fp = req.body

    const { data: existing, error: checkError } = await supabase
      .from('fingerprints')
      .select('id')
      .eq('fingerprint_hash', fp.fingerprint_hash)
      .maybeSingle()

    let record

    if (existing) {
      const { data, error } = await supabase
        .from('fingerprints')
        .update({
          first_detected_at: fp.detections[0]?.detected_at || new Date().toISOString(),
          last_detected_at: fp.detections[fp.detections.length - 1]?.detected_at || new Date().toISOString(),
          detection_count: fp.detection_count,
          confidence_score: fp.confidence_score,
          primary_frequency_mhz: fp.primary_frequency_mhz,
          primary_city: fp.primary_city,
          cities_detected: fp.cities_detected,
          time_pattern_description: fp.time_pattern_description,
          avg_burst_duration_ms: fp.avg_burst_duration_ms,
          avg_cycle_hours: fp.avg_cycle_hours,
          signal_class: fp.signal_class,
          pattern_intelligence: fp.pattern_intelligence,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      record = data
    } else {
      const { data, error } = await supabase
        .from('fingerprints')
        .insert({
          fingerprint_hash: fp.fingerprint_hash,
          first_detected_at: fp.detections[0]?.detected_at || new Date().toISOString(),
          last_detected_at: fp.detections[fp.detections.length - 1]?.detected_at || new Date().toISOString(),
          detection_count: fp.detection_count,
          confidence_score: fp.confidence_score,
          primary_frequency_mhz: fp.primary_frequency_mhz,
          primary_city: fp.primary_city,
          cities_detected: fp.cities_detected,
          time_pattern_description: fp.time_pattern_description,
          avg_burst_duration_ms: fp.avg_burst_duration_ms,
          avg_cycle_hours: fp.avg_cycle_hours,
          signal_class: fp.signal_class,
          pattern_intelligence: fp.pattern_intelligence,
          status: fp.confidence_score >= 60 ? 'high_confidence' : 'pattern_detected'
        })
        .select()
        .single()
      if (error) throw error
      record = data
    }

    // Store pattern intelligence in Hindsight
    await storePatternIntelligence(record, {
      patternAnalysis: fp.pattern_intelligence,
      threatLevel: fp.confidence_score >= 60 ? 'medium' : 'low'
    })

    // Also populate some historical events if they don't exist
    if (fp.detections && fp.detections.length > 0) {
      for (const det of fp.detections) {
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('anomaly_events')
          .select('id')
          .eq('detected_at', det.detected_at)
          .eq('peak_frequency_mhz', fp.primary_frequency_mhz)
          .maybeSingle()

        if (!existingEvent) {
          await supabase
            .from('anomaly_events')
            .insert({
              detected_at: det.detected_at,
              peak_frequency_mhz: fp.primary_frequency_mhz,
              peak_power_db: det.peak_power_db,
              bandwidth_hz: 3000,
              duration_ms: fp.avg_burst_duration_ms || 200,
              signal_class: fp.signal_class,
              city: fp.primary_city,
              node_name: `${fp.primary_city}-Alpha`,
              fingerprint_id: record.id,
              threat_level: fp.confidence_score >= 60 ? 'medium' : 'low',
              pattern_analysis: fp.pattern_intelligence,
              recommended_action: 'Monitor frequency band.'
            })
        }
      }
    }

    return res.status(201).json(record)
  } catch (err: any) {
    console.error('Seed error:', err)
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * POST /api/fingerprints/:id/export
 * Generates an immutable, cryptographic integrity report for audit
 */
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data: fingerprint, error: fpError } = await supabase
      .from('fingerprints')
      .select('*')
      .eq('id', id)
      .single()

    if (fpError || !fingerprint) {
      return res.status(404).json({ error: 'Fingerprint not found' })
    }

    // Fetch related detections for historical records
    const { data: anomalies } = await supabase
      .from('anomaly_events')
      .select('detected_at, peak_power_db')
      .eq('fingerprint_id', id)
      .order('detected_at', { ascending: true })

    const detections = (anomalies ?? []).map(a => ({
      detected_at: a.detected_at,
      peak_power_db: Number(a.peak_power_db)
    }))

    const generatedAt = new Date().toISOString()

    // Build deterministic report object
    const reportData = {
      generated_at: generatedAt,
      fingerprint_hash: fingerprint.fingerprint_hash,
      frequency_mhz: Number(fingerprint.primary_frequency_mhz),
      primary_city: fingerprint.primary_city,
      detection_count: Number(fingerprint.detection_count),
      confidence_score: Number(fingerprint.confidence_score),
      pattern_intelligence: fingerprint.pattern_intelligence || 'No intelligence analysis recorded.',
      all_detections: detections
    }

    // Generate cryptographic SHA256 integrity hash
    const serialized = JSON.stringify(reportData)
    const integrityHash = crypto.createHash('sha256').update(serialized).digest('hex')

    return res.json({
      ...reportData,
      integrity_hash: integrityHash
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

export default router
