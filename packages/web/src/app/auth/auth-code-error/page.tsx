import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>
              Sorry, we couldn't sign you in. The authentication link may have expired or been used already.
            </CardDescription>
            <div className="mt-6">
              <Link href="/">
                <Button>Return to Sign In</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}