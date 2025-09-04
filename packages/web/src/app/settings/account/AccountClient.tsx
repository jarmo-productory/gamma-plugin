'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { User, ArrowLeft, Check, AlertCircle, Copy, Loader2 } from 'lucide-react'
// No back-link navigation; use sidebar and header nav only
import { createClient } from '@/utils/supabase/client'
import DeleteAccountClient from './DeleteAccountClient'

interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
  email_notifications: boolean
  marketing_notifications: boolean
}

interface AccountClientProps {
  user: {
    email?: string
    name?: string
  }
}

export default function AccountClient({ user }: AccountClientProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameValue, setNameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Notification preferences states
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [marketingNotifications, setMarketingNotifications] = useState(false)
  const [updatingNotifications, setUpdatingNotifications] = useState(false)

  // Fetch user profile data
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setNameValue(data.user.name || '')
        setEmailNotifications(data.user.email_notifications ?? true)
        setMarketingNotifications(data.user.marketing_notifications ?? false)
      } else {
        console.error('Failed to fetch profile:', response.statusText)
        setError('Failed to load profile data')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!nameValue.trim()) {
      setError('Name cannot be empty')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nameValue.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setSuccessMessage('Profile updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      setError('Failed to update name')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Password change handler
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setChangingPassword(true)
    setError('')

    try {
      const supabase = createClient()
      
      // Update password through Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccessMessage('Password changed successfully')
      setShowPasswordChange(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error changing password:', error)
      setError('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  // Notification preferences handler
  const handleNotificationChange = async (type: 'email' | 'marketing', value: boolean) => {
    setUpdatingNotifications(true)
    setError('')

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          [type === 'email' ? 'email_notifications' : 'marketing_notifications']: value 
        }),
      })

      if (response.ok) {
        if (type === 'email') {
          setEmailNotifications(value)
        } else {
          setMarketingNotifications(value)
        }
        setSuccessMessage(`${type === 'email' ? 'Email' : 'Marketing'} notifications ${value ? 'enabled' : 'disabled'}`)
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update notification preferences')
      }
    } catch (error) {
      console.error('Error updating notifications:', error)
      setError('Failed to update notification preferences')
    } finally {
      setUpdatingNotifications(false)
    }
  }

  // Password validation helper
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 'none', color: 'text-gray-400', message: '' }
    if (password.length < 8) return { strength: 'weak', color: 'text-red-500', message: 'Too short (minimum 8 characters)' }
    if (password.length < 12) return { strength: 'medium', color: 'text-yellow-500', message: 'Good length, consider adding special characters' }
    return { strength: 'strong', color: 'text-green-500', message: 'Strong password' }
  }

  if (loading) {
    return (
      <AppLayout user={user}>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <User className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Account</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="w-full">
            <div className="text-center py-8">Loading profile...</div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 flex-1">
          <User className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Account</h1>
        </div>
      </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="w-full">

          {successMessage && (
            <Alert className="border-green-200 bg-green-50 mb-4">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            <Card className="bg-card border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 max-w-xl">
                  <Label className="text-sm">Name</Label>
                  <div className="flex gap-3">
                    <Input
                      id="name"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      placeholder="Your name"
                      className="flex-1"
                      maxLength={255}
                      disabled={saving}
                    />
                    <Button onClick={handleSaveProfile} disabled={saving || !nameValue.trim()}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-w-xl">
                  <Label className="text-sm">Email</Label>
                  <div className="flex items-center gap-3">
                    <Input disabled value={profile?.email ?? ''} className="flex-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
                <CardDescription>Basic information about your account</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Account created</Label>
                  <div className="px-4 py-3 bg-muted rounded-lg font-medium">
                    {profile?.created_at ? formatDate(profile.created_at) : '—'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Account ID</Label>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-sm truncate">
                      {profile?.id ?? '—'}
                    </div>
                    {profile?.id && (
                      <Button variant="ghost" className="ml-3" onClick={() => navigator.clipboard && navigator.clipboard.writeText(profile.id)} title="Copy account ID">
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose which updates you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email notifications</div>
                    <div className="text-sm text-muted-foreground">Account and product updates</div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={(v) => handleNotificationChange('email', v)}
                    disabled={updatingNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Marketing emails</div>
                    <div className="text-sm text-muted-foreground">Occasional tips and announcements</div>
                  </div>
                  <Switch
                    checked={marketingNotifications}
                    onCheckedChange={(v) => handleNotificationChange('marketing', v)}
                    disabled={updatingNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <DeleteAccountClient />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
