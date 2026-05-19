/**
 * Simple LLM service.
 * Primary: Groq llama3-70b-8192
 * Fallback: Ollama llama3.2:3b
 * No routing complexity.
 */

import Groq from 'groq-sdk'
import axios from 'axios'

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

const OLLAMA_URL = process.env.OLLAMA_URL
  || 'http://localhost:11434'

export async function getIntelligenceBrief(
  fingerprintsContext: string
): Promise<{ summary: string; model: string }> {
  const prompt = `You are an HF spectrum analyst.
Based on the following fingerprint data, write a 2-3 sentence
intelligence brief about what patterns have been observed
across Indian HF frequencies. Be specific and factual.

Data:
${fingerprintsContext}

Return only the brief text, no headers or formatting.`

  if (groq) {
    try {
      const resp = await groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150
      })
      return {
        summary: resp.choices[0].message.content?.trim() ?? '',
        model: 'llama3-70b-8192'
      }
    } catch (e) {
      console.error('[LLM] Groq failed:', e)
    }
  }

  try {
    const resp = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: 'llama3.2:3b', prompt, stream: false },
      { timeout: 30000 }
    )
    return {
      summary: resp.data.response?.trim() ?? '',
      model: 'llama3.2:3b (local)'
    }
  } catch (e) {
    return {
      summary: 'Intelligence brief unavailable.',
      model: 'none'
    }
  }
}
