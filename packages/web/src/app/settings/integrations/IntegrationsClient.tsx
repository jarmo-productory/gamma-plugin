'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link2, ArrowLeft, Smartphone, Calendar, Clock, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface ConnectedDevice {
  deviceId: string
  deviceName: string
  connectedAt: string
  lastUsed: string
  expiresAt: string
  token: string
  isActive: boolean
}

interface IntegrationsClientProps {
  user: {
    email?: string
    name?: string
  }
}

export default function IntegrationsClient({ user }: IntegrationsClientProps) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/user/devices')
      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      } else {
        console.error('Failed to fetch devices:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const revokeDevice = async (token: string, deviceName: string) => {
    if (!confirm(`Are you sure you want to revoke access for "${deviceName}"? This will immediately disconnect the device.`)) {
      return
    }

    setRevoking(token)
    try {
      const response = await fetch('/api/user/devices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        // Remove device from list
        setDevices(devices.filter(d => d.token !== token))
      } else {
        console.error('Failed to revoke device:', response.statusText)
        alert('Failed to revoke device access. Please try again.')
      }
    } catch (error) {
      console.error('Error revoking device:', error)
      alert('Failed to revoke device access. Please try again.')
    } finally {
      setRevoking(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  return (
    <AppLayout user={user}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2 flex-1">
          <Link2 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Device Integrations</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={fetchDevices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Connected Devices</h2>
            <p className="text-muted-foreground">
              Manage devices that have access to your Gamma presentations and timetables.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : devices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Devices Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Install the Chrome extension and pair it with your account to see connected devices here.
                </p>
                <div className="bg-muted rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">To connect a device:</p>
                  <ol className="text-left space-y-1">
                    <li>1. Install the Productory Powerups Chrome extension</li>
                    <li>2. Click the extension icon and follow the pairing process</li>
                    <li>3. Your device will appear here once connected</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {devices.map((device) => (
                <Card key={device.deviceId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                          <CardDescription>Device ID: {device.deviceId.slice(0, 12)}...</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={device.isActive ? "default" : "secondary"}>
                          {device.isActive ? 'Active' : 'Expired'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeDevice(device.token, device.deviceName)}
                          disabled={revoking === device.token}
                        >
                          <Trash2 className="h-4 w-4" />
                          {revoking === device.token ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Connected</p>
                          <p className="text-muted-foreground">{formatDate(device.connectedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Last Used</p>
                          <p className="text-muted-foreground">{formatDate(device.lastUsed)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Expires</p>
                          <p className="text-muted-foreground">{formatDate(device.expiresAt)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Other Integrations
              </CardTitle>
              <CardDescription>
                Connect with your favorite productivity tools and platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Additional integration features are coming soon. You'll be able to connect with Google Calendar, Notion, and other productivity tools.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}