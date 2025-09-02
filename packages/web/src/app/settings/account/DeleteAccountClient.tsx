"use client"

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountClient() {
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingLogout, setPendingLogout] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const canDelete = confirm === 'DELETE'

  const onDelete = async () => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/user/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to delete account')
        return
      }
      // Show short notice, then sign out and redirect
      setPendingLogout(true)
      setNotice('Your account is about to be deleted...')
      timeoutRef.current = setTimeout(async () => {
        try {
          await fetch('/auth/signout', { method: 'POST' })
        } finally {
          router.push('/')
        }
      }, 5000)
    } catch (e) {
      setError('Failed to delete account')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-700">Delete account</CardTitle>
        <CardDescription className="text-red-600">
          This will permanently remove your account and associated data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {notice && (
          <Alert className="border-amber-200 bg-amber-50">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">{notice}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label htmlFor="confirm" className="text-sm font-medium">
            Type DELETE to confirm
          </label>
          <Input
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="border-red-300"
            disabled={submitting || pendingLogout}
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            disabled={!canDelete || submitting || pendingLogout}
            onClick={onDelete}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : pendingLogout ? (
              'Finalizing...'
            ) : (
              'Delete my account'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
