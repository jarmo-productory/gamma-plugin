'use client'

/* eslint-disable no-undef */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/utils/supabase/client'

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const supabase = createClient()

  // Client-side validation functions
  const validateEmail = (email: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) return 'Email is required'
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters long'
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number'
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character'
    return ''
  }

  const validateName = (name: string, fieldName: string): string => {
    if (!name.trim()) return `${fieldName} is required`
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`
    if (name.trim().length > 50) return `${fieldName} must be less than 50 characters`
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return `${fieldName} can only contain letters, spaces, hyphens and apostrophes`
    return ''
  }

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('Email not confirmed')) {
        setMessage('Please check your email and click the confirmation link before signing in.')
      } else if (error.message.includes('Invalid login credentials')) {
        setMessage('Invalid email or password. Please check your credentials and try again.')
      } else {
        setMessage(error.message)
      }
    } else {
      // Always redirect to dashboard after successful sign-in
      // DevicePairingDashboard will handle any stored pairing codes
      window.location.href = '/dashboard';
    }
    setIsLoading(false)
  }

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage('')
    setValidationErrors({})

    const formData = new FormData(event.currentTarget)
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Client-side validation
    const errors: {[key: string]: string} = {}
    
    const firstNameError = validateName(firstName, 'First name')
    if (firstNameError) errors.firstName = firstNameError
    
    const lastNameError = validateName(lastName, 'Last name')
    if (lastNameError) errors.lastName = lastNameError
    
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // If there are validation errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setMessage('Please fix the errors above')
      setIsLoading(false)
      return
    }

    // Always redirect to dashboard after email confirmation - DevicePairingDashboard will handle stored pairing codes
    const emailRedirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      console.error('Signup error:', error)
      // Handle specific signup errors
      if (error.message.includes('email_address_invalid') || error.message.includes('invalid')) {
        setMessage('Email address is invalid or not allowed. Please use a valid business email address.')
      } else if (error.message.includes('Password should be')) {
        setMessage('Password is too weak. Please use at least 8 characters with numbers and symbols.')
      } else if (error.message.includes('User already registered')) {
        setMessage('An account with this email already exists. Please try signing in instead.')
      } else {
        setMessage(`Signup failed: ${error.message}`)
      }
    } else {
      setMessage('Account created successfully! Check your email for the confirmation link to complete registration.')
    }
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    
    // Always redirect to dashboard - DevicePairingDashboard will handle stored pairing codes
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      setMessage(error.message)
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="create">Create account</TabsTrigger>
      </TabsList>
      
      {message && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-center">
          {message}
        </div>
      )}
      
      <TabsContent value="signin" className="mt-6">
        <CardDescription className="text-center mb-6">
          Enter your email and password to access your account
        </CardDescription>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input 
                id="signin-email" 
                name="email"
                type="email" 
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input 
                id="signin-password" 
                name="password"
                type="password" 
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <Label htmlFor="remember" className="text-sm">Remember me</Label>
              </div>
              <Button variant="link" className="px-0 font-normal text-sm" type="button">
                Forgot password?
              </Button>
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </TabsContent>
      
      <TabsContent value="create" className="mt-6">
        <CardDescription className="text-center mb-6">
          Enter your information to create your account
        </CardDescription>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input 
                  id="firstName" 
                  name="firstName"
                  placeholder="John"
                  required
                  className={validationErrors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {validationErrors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input 
                  id="lastName" 
                  name="lastName"
                  placeholder="Doe"
                  required
                  className={validationErrors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {validationErrors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.lastName}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input 
                id="create-email" 
                name="email"
                type="email" 
                placeholder="john@example.com"
                required
                className={validationErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input 
                id="create-password" 
                name="password"
                type="password" 
                placeholder="Create a secure password"
                required
                className={validationErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.password && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Must be 8+ characters with uppercase, lowercase, number & symbol
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input 
                id="confirmPassword" 
                name="confirmPassword"
                type="password" 
                placeholder="Confirm your password"
                required
                className={validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="terms" 
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                required
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the{" "}
                <Button variant="link" className="px-0 h-auto font-normal underline text-sm" type="button">
                  Terms of Service
                </Button>{" "}
                and{" "}
                <Button variant="link" className="px-0 h-auto font-normal underline text-sm" type="button">
                  Privacy Policy
                </Button>
              </Label>
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  )
}