import { Fingerprint, AnomalyEvent } from '../types'

// Local mock service to bypass the missing private @vectorize-io/hindsight package
class MockHindsight {
  constructor(config: { apiKey: string; namespace: string }) {}
  async connect(): Promise<void> {
    console.log('Hindsight mock service connected.')
  }
  async retain(data: any): Promise<{ id: string }> {
    return { id: `mock-${Date.now()}` }
  }
  async recall(data: any): Promise<any[]> {
    return []
  }
  async reflect(data: any): Promise<{ summary: string }> {
    return { summary: 'No live Hindsight API key configured. Mock memory active.' }
  }
}

let client: InstanceType<typeof MockHindsight>

export async function initializeHindsight(): Promise<void> {
  try {
    client = new MockHindsight({
      apiKey: process.env.HINDSIGHT_API_KEY || 'dummy-key',
      namespace: 'tarangwatch-v1'
    })
    await client.connect()
    console.log('Hindsight connected')
  } catch (e) {
    console.warn('Hindsight SDK initialization failed, utilizing fallback mock service:', e)
    client = {
      connect: async () => {},
      retain: async (data: any) => ({ id: `mock-${Date.now()}` }),
      recall: async (data: any) => [],
      reflect: async (data: any) => ({ summary: 'No live Hindsight API key configured. Mock memory active.' })
    } as any
  }
}

export async function storePatternIntelligence(
  fingerprint: any,
  assessment: { patternAnalysis: string; threatLevel: string }
): Promise<string | null> {
  if (!client) return null

  // Safely extract properties supporting both database snake_case and interface camelCase
  const freq = fingerprint.primary_frequency_mhz ?? fingerprint.primaryFrequencyMhz ?? 0
  const city = fingerprint.primary_city ?? fingerprint.primaryCity ?? 'Unknown'
  const count = fingerprint.detection_count ?? fingerprint.detectionCount ?? 0
  const conf = fingerprint.confidence_score ?? fingerprint.confidenceScore ?? 0
  const timeDesc = fingerprint.time_pattern_description ?? fingerprint.timePatternDescription ?? ''
  const sigClass = fingerprint.signal_class ?? fingerprint.signalClass ?? 'UNKNOWN'
  const cities = fingerprint.cities_detected ?? fingerprint.citiesDetected ?? []
  const lastSeen = fingerprint.last_detected_at ?? fingerprint.lastDetectedAt ?? ''

  const content = [
    `Fingerprint on ${freq} MHz`,
    `from ${city}.`,
    `${count} detections.`,
    `Confidence: ${Number(conf).toFixed(1)}%.`,
    timeDesc ? `Pattern: ${timeDesc}.` : '',
    `Signal class: ${sigClass}.`,
    `Analysis: ${assessment.patternAnalysis}`,
    `Threat level: ${assessment.threatLevel}.`,
    cities.length > 1 ? `Multi-city: ${cities.join(', ')}.` : '',
    `Last seen: ${lastSeen}.`
  ].filter(Boolean).join(' ')

  try {
    const result = await client.retain({
      content,
      tags: [
        fingerprint.fingerprint_hash ?? fingerprint.fingerprintHash,
        city.toLowerCase(),
        sigClass.toLowerCase(),
        assessment.threatLevel,
        `freq_${Math.floor(freq)}_mhz`
      ]
    })
    return result?.id ?? null
  } catch (e) {
    console.error('[Hindsight] storePatternIntelligence failed:', e)
    return null
  }
}

export async function recallFingerprintIntelligence(
  fingerprintHash: string,
  frequencyMhz: number,
  city: string
): Promise<string | null> {
  if (!client) return null

  try {
    const results = await client.recall({
      query: `${frequencyMhz} MHz ${city} fingerprint ${fingerprintHash}`,
      topK: 3
    })
    if (!results || results.length === 0) return null
    return results.map((r: any) => r.content).join('\n')
  } catch (e) {
    console.error('[Hindsight] recall failed:', e)
    return null
  }
}

export async function getIntelligenceBrief(): Promise<string> {
  if (!client) return 'Hindsight not connected.'

  try {
    const results = await client.reflect({
      query: 'Summarize all anomalous HF transmission patterns detected across Indian cities. Include frequencies, cities, confidence levels, and any multi-city correlations.',
      topK: 8
    })
    if (!results || !results.summary) {
      return 'Insufficient data for summary.'
    }
    return results.summary
  } catch (e) {
    console.error('[Hindsight] reflect failed:', e)
    return 'Intelligence brief unavailable.'
  }
}

export async function seedHindsightFromHistory(
  fingerprints: any[]
): Promise<void> {
  if (!client) return

  for (const fp of fingerprints) {
    await storePatternIntelligence(fp, {
      patternAnalysis: fp.pattern_intelligence,
      threatLevel: 'medium'
    })
  }
  console.log(
    `[Hindsight] Seeded ${fingerprints.length} fingerprints`
  )
}
