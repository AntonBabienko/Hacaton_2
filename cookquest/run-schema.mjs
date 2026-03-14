import { readFileSync } from 'fs'

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yZGp4cXZwYmVwd3Z0c3FjY2NmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyMzI1MywiZXhwIjoyMDg4OTk5MjUzfQ.RDIzc_eHkzk-I36TpadNeSP6nxlqvSOxmhlKIdhkc2k'

const sql = readFileSync('./supabase/schema.sql', 'utf8')

const res = await fetch('https://api.supabase.com/v1/projects/nrdjxqvpbepwvtsqcccf/database/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
})

console.log('Status:', res.status)
const text = await res.text()
console.log(text.slice(0, 1000))
