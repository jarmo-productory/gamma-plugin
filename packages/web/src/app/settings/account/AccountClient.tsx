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
import { User, ArrowLeft, Check, X, AlertCircle, Shield, Bell, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
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
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <div className="text-center py-8">Loading profile...</div>
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
      <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 max-w-2xl">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your personal account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={255}
                  disabled={saving}
                />
              </div>

              {/* Email Field (Read Only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>
                Basic information about your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Account created
                  </Label>
                  <p className="text-sm">
                    {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Account ID
                  </Label>
                  <p className="text-sm font-mono truncate">
                    {profile?.id || 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={saving || !nameValue.trim()}
              className="min-w-24"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 pt-0 max-w-2xl">
        <DeleteAccountClient />
      </div>
    </AppLayout>
  )
}
