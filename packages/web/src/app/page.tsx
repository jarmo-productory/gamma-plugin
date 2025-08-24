import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gamma Timetable</h1>
          <p className="text-muted-foreground mt-2">Transform your presentations into synchronized timetables</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="create">Create account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <CardDescription className="text-center mb-6">
                  Enter your email and password to access your account
                </CardDescription>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email" 
                      type="email" 
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password" 
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
                    <Button variant="link" className="px-0 font-normal text-sm">
                      Forgot password?
                    </Button>
                  </div>
                  <Button className="w-full">
                    Sign in
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="create" className="mt-6">
                <CardDescription className="text-center mb-6">
                  Enter your information to create your account
                </CardDescription>
                <div className="space-y-4">
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
                    <Label htmlFor="create-email">Email</Label>
                    <Input 
                      id="create-email" 
                      type="email" 
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password</Label>
                    <Input 
                      id="create-password" 
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
                      <Button variant="link" className="px-0 h-auto font-normal underline text-sm">
                        Terms of Service
                      </Button>{" "}
                      and{" "}
                      <Button variant="link" className="px-0 h-auto font-normal underline text-sm">
                        Privacy Policy
                      </Button>
                    </Label>
                  </div>
                  <Button className="w-full">
                    Create account
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Transform your Gamma presentations into organized, time-based schedules with our Chrome extension and cloud sync.</p>
        </div>
      </div>
    </div>
  );
}