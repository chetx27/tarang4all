import { Router, Request, Response } from 'express'
import { supabase } from '../db/supabase'
import {
  emitAnomalyDetected,
  emitFingerprintUpdated,
  emitFingerprintCreated
} from '../services/socketService'
import { storePatternIntelligence } from '../services/hindsightService'
import { AnomalyEvent, Fingerprint } from '../types'

const router = Router()

/**
 * POST /api/anomalies/ingest
 * Receives anomaly event from Python processor and persists it
 */
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const payload = req.body
    const io = req.app.get('io')

    // 1. Validate payload
    const requiredFields = [
      'event_id', 'node_name', 'city', 'timestamp',
      'peak_frequency_mhz', 'peak_power_db', 'bandwidth_hz',
      'duration_ms', 'psd_array', 'fingerprint_hash',
      'signal_class', 'is_licensed', 'is_burst',
      'is_frequency_hopping', 'classifier_confidence', 'threat_level'
    ]

    for (const field of requiredFields) {
      if (payload[field] === undefined) {
        return res.status(400).json({ error: `Missing required field: ${field}` })
      }
    }

    // 2. Look up node_id from node_name
    const { data: nodeData, error: nodeError } = await supabase
      .from('nodes')
      .select('id')
      .eq('name', payload.node_name)
      .single()

    const nodeId = nodeData?.id ?? null

    // Update node status and total counts since scan occurred
    if (nodeId) {
      const { data: currNode } = await supabase
        .from('nodes')
        .select('total_scans')
        .eq('id', nodeId)
        .single()
      
      const scansCount = (currNode?.total_scans || 0) + 1
      await supabase
        .from('nodes')
        .update({ total_scans: scansCount, last_seen: new Date().toISOString() })
        .eq('id', nodeId)
    }

    // 3. Check if fingerprint_hash exists in fingerprints table
    const { data: existingFingerprint, error: fpFindError } = await supabase
      .from('fingerprints')
      .select('*')
      .eq('fingerprint_hash', payload.fingerprint_hash)
      .maybeSingle()

    let fingerprintId: string
    let fingerprint: any

    const assessment = payload.assessment || {
      threat_level: payload.threat_level,
      pattern_analysis: 'New anomaly detected on unlicensed spectrum.',
      recommended_action: 'Monitor frequency for recurrence.',
      confidence_adjustment: 0,
      model_used: 'rule-based',
      provider: 'local',
      latency_ms: 0,
      used_fallback: true
    }

    if (existingFingerprint) {
      // Fingerprint EXISTS
      const detectionCount = (existingFingerprint.detection_count || 1) + 1
      const oldConfidence = Number(existingFingerprint.confidence_score)
      const adjustment = Number(assessment.confidence_adjustment ?? 0)

      // Recalculate confidence:
      // new_confidence = min(99.0, old_confidence + (100 - old_confidence) * 0.12 + adjustment * 0.5)
      const calculatedConfidence = oldConfidence + (100 - oldConfidence) * 0.12 + adjustment * 0.5
      const confidenceScore = Math.min(99.0, Math.max(0.0, calculatedConfidence))

      // Update cities_detected if new city
      const cities: string[] = existingFingerprint.cities_detected || []
      if (!cities.includes(payload.city)) {
        cities.push(payload.city)
      }

      // Update time_pattern_description if >= 3 detections
      let timePattern = existingFingerprint.time_pattern_description
      if (detectionCount >= 3) {
        // Calculate dynamic timing if possible or stick to description
        timePattern = existingFingerprint.time_pattern_description || `Recurrence every ~${(24 * (detectionCount % 3 === 0 ? 2 : 1))} hours`
      }

      // Update status based on conditions
      let status = existingFingerprint.status || 'monitoring'
      if (detectionCount >= 3 && confidenceScore >= 30) {
        status = 'pattern_detected'
      }
      if (confidenceScore >= 60) {
        status = 'high_confidence'
      }

      const { data: updatedFp, error: fpUpdateError } = await supabase
        .from('fingerprints')
        .update({
          detection_count: detectionCount,
          last_detected_at: payload.timestamp,
          confidence_score: confidenceScore,
          cities_detected: cities,
          time_pattern_description: timePattern,
          pattern_intelligence: assessment.pattern_analysis,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFingerprint.id)
        .select()
        .single()

      if (fpUpdateError) throw fpUpdateError
      fingerprint = updatedFp
      fingerprintId = updatedFp.id

      if (io) emitFingerprintUpdated(io, updatedFp)
    } else {
      // Fingerprint DOES NOT EXIST (Create New)
      const { data: newFp, error: fpCreateError } = await supabase
        .from('fingerprints')
        .insert({
          fingerprint_hash: payload.fingerprint_hash,
          first_detected_at: payload.timestamp,
          last_detected_at: payload.timestamp,
          detection_count: 1,
          confidence_score: 10.0,
          primary_frequency_mhz: payload.peak_frequency_mhz,
          primary_city: payload.city,
          cities_detected: [payload.city],
          time_pattern_description: 'Single detection — monitoring',
          avg_burst_duration_ms: payload.duration_ms,
          signal_class: payload.signal_class,
          pattern_intelligence: assessment.pattern_analysis,
          status: 'monitoring'
        })
        .select()
        .single()

      if (fpCreateError) throw fpCreateError
      fingerprint = newFp
      fingerprintId = newFp.id

      if (io) emitFingerprintCreated(io, newFp)
    }

    // 4. Insert into anomaly_events with fingerprint_id
    const { data: eventData, error: eventError } = await supabase
      .from('anomaly_events')
      .insert({
        id: payload.event_id,
        node_id: nodeId,
        node_name: payload.node_name,
        city: payload.city,
        detected_at: payload.timestamp,
        peak_frequency_mhz: payload.peak_frequency_mhz,
        peak_power_db: payload.peak_power_db,
        bandwidth_hz: payload.bandwidth_hz,
        duration_ms: payload.duration_ms,
        signal_class: payload.signal_class,
        is_licensed: payload.is_licensed,
        is_burst: payload.is_burst,
        is_frequency_hopping: payload.is_frequency_hopping,
        classifier_confidence: payload.classifier_confidence,
        psd_array: payload.psd_array,
        spectrogram_path: payload.spectrogram_path,
        fingerprint_id: fingerprintId,
        llm_model_used: assessment.model_used || 'none',
        llm_latency_ms: assessment.latency_ms || 0,
        threat_level: assessment.threat_level || payload.threat_level,
        pattern_analysis: assessment.pattern_analysis,
        recommended_action: assessment.recommended_action
      })
      .select()
      .single()

    if (eventError) throw eventError

    // 5. Insert into llm_calls log
    if (assessment.model_used && assessment.model_used !== 'none') {
      await supabase
        .from('llm_calls')
        .insert({
          anomaly_event_id: eventData.id,
          model_used: assessment.model_used,
          provider: assessment.provider || 'groq',
          latency_ms: assessment.latency_ms || 0,
          used_fallback: assessment.used_fallback || false,
          output_summary: assessment.pattern_analysis
        })
    }

    // Increment node anomalies count
    if (nodeId) {
      const { data: currNode } = await supabase
        .from('nodes')
        .select('total_anomalies')
        .eq('id', nodeId)
        .single()
      
      const anomaliesCount = (currNode?.total_anomalies || 0) + 1
      await supabase
        .from('nodes')
        .update({ total_anomalies: anomaliesCount })
        .eq('id', nodeId)
    }

    // 6. Store pattern intelligence in Hindsight
    const hindsightMemoryId = await storePatternIntelligence(fingerprint, {
      patternAnalysis: assessment.pattern_analysis,
      threatLevel: assessment.threat_level
    })

    if (hindsightMemoryId) {
      await supabase
        .from('fingerprints')
        .update({ hindsight_memory_id: hindsightMemoryId })
        .eq('id', fingerprintId)
    }

    // Prepare full enriched response payload
    const enrichedAnomaly = {
      ...eventData,
      fingerprintMatch: {
        fingerprintId,
        fingerprintHash: fingerprint.fingerprint_hash,
        detectionCount: fingerprint.detection_count,
        confidenceScore: fingerprint.confidence_score,
        isNewMatch: !!existingFingerprint,
        previousConfidence: existingFingerprint ? existingFingerprint.confidence_score : 0,
        patternIntelligence: fingerprint.pattern_intelligence
      }
    }

    // 7. Emit anomaly_detected via socket
    if (io) emitAnomalyDetected(io, enrichedAnomaly)

    // 8. Return 210 with processed payload
    return res.status(201).json(enrichedAnomaly)

  } catch (err: any) {
    console.error('[Ingest Error]:', err)
    return res.status(500).json({ error: err.message || 'Internal Ingest Server Error' })
  }
})

/**
 * GET /api/anomalies
 * Retrieves list of anomalies with filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, signalClass, limit = '50', offset = '0' } = req.query

    let query = supabase
      .from('anomaly_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (city) {
      query = query.eq('city', city)
    }

    if (signalClass) {
      query = query.eq('signal_class', signalClass)
    }

    const { data, error } = await query

    if (error) throw error
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

/**
 * GET /api/anomalies/:id
 * Retrieves a single anomaly details with fingerprint data joined
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data: anomaly, error: anomalyError } = await supabase
      .from('anomaly_events')
      .select('*')
      .eq('id', id)
      .single()

    if (anomalyError || !anomaly) {
      return res.status(404).json({ error: 'Anomaly event not found' })
    }

    let fingerprint = null
    if (anomaly.fingerprint_id) {
      const { data: fpData } = await supabase
        .from('fingerprints')
        .select('*')
        .eq('id', anomaly.fingerprint_id)
        .single()
      fingerprint = fpData
    }

    return res.json({
      ...anomaly,
      fingerprint
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
})

export default router
