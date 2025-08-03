const { createClient } = require('@supabase/supabase-js')

// Replace with real values
const supabaseUrl = 'https://xyzcompanyabc.supabase.co'
const supabaseKey = 'your-real-anon-or-access-key'
const accessToken = 'your-valid-access-token'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken)

  if (error) {
    console.error('Error fetching user:', error.message)
  } else {
    console.log('User ID:', user?.id)
  }
}

getUser()
