import { createClient } from '@/utils/supabase/server'

export default async function TestAuthPage() {
  const supabase = await createClient()

  // Test if we can connect to Supabase auth
  const { data, error } = await supabase.auth.getUser()

  // Test creating a user
  let signupResult = null
  let signinResult = null

  try {
    // Try to sign up a test user
    const testEmail = `test.user.${Date.now()}@gmail.com`
    const testPassword = 'TestPass123!'
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    signupResult = {
      data: signupData,
      error: signupError?.message
    }

    // Try to sign in 
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    signinResult = {
      data: signinData,
      error: signinError?.message
    }

  } catch (err) {
    signupResult = { error: `Caught error: ${err}` }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
        
        <div className="space-y-6">
          <div className="bg-card p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current User</h2>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify({ data, error }, null, 2)}
            </pre>
          </div>

          <div className="bg-card p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Sign Up Test</h2>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(signupResult, null, 2)}
            </pre>
          </div>

          <div className="bg-card p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Sign In Test</h2>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(signinResult, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}