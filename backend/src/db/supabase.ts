import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, key)

export async function testConnection(): Promise<void> {
  const { error } = await supabase.from('nodes').select('id').limit(1)
  if (error) throw new Error(`Supabase connection failed: ${error.message}`)
  console.log('Supabase connected')
  
  // Auto-seed nodes if missing
  try {
    const { data: existingNodes } = await supabase.from('nodes').select('id')
    if (!existingNodes || existingNodes.length === 0) {
      console.log('Database empty, auto-seeding default nodes...')
      await supabase.from('nodes').insert([
        { name: 'Delhi-Alpha', city: 'Delhi', kiwisdr_host: '115.112.98.54', kiwisdr_port: 8073, frequency_range_low_mhz: 14.0 },
        { name: 'Mumbai-Alpha', city: 'Mumbai', kiwisdr_host: '114.143.167.62', kiwisdr_port: 8073, frequency_range_low_mhz: 7.0 },
        { name: 'Bengaluru-Alpha', city: 'Bengaluru', kiwisdr_host: '122.167.228.91', kiwisdr_port: 8073, frequency_range_low_mhz: 21.0 }
      ])
      console.log('Default nodes successfully seeded!')
    }
  } catch (e) {
    console.warn('Auto-seeding warning:', e)
  }
}
