import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, key)

export async function testConnection(): Promise<void> {
  const { error } = await supabase.from('nodes').select('id').limit(1)
  if (error) throw new Error(`Supabase connection failed: ${error.message}`)
  console.log('Supabase connected')
}
