const http = require('http');
const https = require('https');

const crypto = require('crypto');

// Change this to your production backend URL if testing production
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const data = JSON.stringify({
    "event_id": crypto.randomUUID(),
    "node_name": "Bengaluru_Alpha",
    "city": "Bengaluru",
    "timestamp": new Date().toISOString(),
    "peak_frequency_mhz": 14.235,
    "peak_power_db": -55.4,
    "bandwidth_hz": 3500,
    "duration_ms": 120,
    "threat_level": "high",
    "signal_class": "Unidentified Burst",
    "is_burst": true,
    "is_licensed": false,
    "is_frequency_hopping": false,
    "classifier_confidence": 92.5,
    "fingerprint_hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "psd_array": [
        25.4, 28.1, 35.6, 50.2, 85.9, 95.4, 88.2, 55.1, 30.5, 26.2, 24.1
    ]
});

console.log("Preparing to send highly anomalous threat vector to the ingestion engine...");

const url = new URL(`${BACKEND_URL}/api/anomalies/ingest`);
const client = url.protocol === 'https:' ? https : http;

const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = client.request(options, (res) => {
    let responseBody = '';
    
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log("✅ CRITICAL THREAT SUCCESSFULLY INJECTED!");
            console.log("Look at the dashboard NOW to see the detection.");
        } else {
            console.log(`❌ Failed to inject threat: ${res.statusCode}`);
            console.log(responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error(`Error connecting to backend: ${error.message}`);
});

req.write(data);
req.end();
