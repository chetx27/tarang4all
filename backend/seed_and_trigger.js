const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKEND_URL = 'http://localhost:3001';

async function main() {
  console.log('📡 Starting TarangWatch JavaScript Seed & Simulation Trigger...');

  // 1. Read seed transmissions from signal-processor data folder
  const filePath = path.join(__dirname, '..', 'signal-processor', 'data', 'seed_transmissions.json');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Seed file not found at: ${filePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  console.log(`\n1️⃣ Seeding ${data.fingerprints.length} historic fingerprints to Supabase...`);

  for (let i = 0; i < data.fingerprints.length; i++) {
    const fp = data.fingerprints[i];
    try {
      const response = await fetch(`${BACKEND_URL}/api/fingerprints/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fp)
      });

      if (response.ok) {
        console.log(` ✅ [${i+1}/${data.fingerprints.length}] Seeded: ${fp.primary_frequency_mhz} MHz in ${fp.primary_city} (${fp.confidence_score}%)`);
      } else {
        const text = await response.text();
        console.log(` ❌ [${i+1}/${data.fingerprints.length}] Failed: ${response.status} - ${text.substring(0, 80)}`);
      }
    } catch (err) {
      console.log(` ❌ [${i+1}/${data.fingerprints.length}] Error: ${err.message}`);
    }
  }

  console.log('\n2️⃣ Triggering a live dynamic anomaly event to see it on the dashboard...');

  const uuid = crypto.randomUUID ? crypto.randomUUID() : 'a3b8c2d9-1100-47bf-a128-44fb9a6e1189';
  const liveEvent = {
    event_id: uuid,
    node_name: 'Delhi-Alpha',
    city: 'Delhi',
    timestamp: new Date().toISOString(),
    peak_frequency_mhz: 14.235,
    peak_power_db: -67.6,
    bandwidth_hz: 2400.0,
    duration_ms: 298.0,
    psd_array: Array(256).fill(50.0),
    fingerprint_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    signal_class: 'BURST_TRANSMISSION',
    is_licensed: false,
    is_burst: true,
    is_frequency_hopping: false,
    classifier_confidence: 0.68,
    threat_level: 'medium',
    assessment: {
      threat_level: 'medium',
      pattern_analysis: 'Seventh confirmed occurrence of burst on 14.235 MHz. 47-hour cycle now highly consistent across all detections.',
      recommended_action: 'Flag frequency for continued monitoring. Pattern suggests scheduled transmission.',
      confidence_adjustment: 3.1,
      model_used: 'llama3-70b-8192',
      provider: 'groq',
      latency_ms: 847,
      used_fallback: false
    }
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/anomalies/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveEvent)
    });

    if (response.ok) {
      console.log(' 🔥 Success! Live anomaly simulation event sent.');
      console.log(' 📡 Go check your browser at your VITE web app (http://localhost:5174 or http://localhost:5173)!');
      console.log(' 📈 You will see the Delhi 14.235 MHz signal confidence score jump on your dashboard chart!');
    } else {
      const text = await response.text();
      console.log(` ❌ Failed to ingest live event: ${response.status} - ${text}`);
    }
  } catch (err) {
    console.log(` ❌ Error ingesting live event: ${err.message}`);
  }
}

main();
