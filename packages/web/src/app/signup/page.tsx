import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
          <CardDescription className="text-center">
            Enter your information to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input 
                id="firstName" 
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input 
                id="lastName" 
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Create a secure password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              placeholder="Confirm your password"
              required
            />
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
              <Button variant="link" className="px-0 h-auto font-normal underline">
                Terms of Service
              </Button>{" "}
              and{" "}
              <Button variant="link" className="px-0 h-auto font-normal underline">
                Privacy Policy
              </Button>
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full">
            Create account
          </Button>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Button variant="link" className="px-0 font-normal">
              Sign in
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}