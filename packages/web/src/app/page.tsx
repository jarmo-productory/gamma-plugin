import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-4">🎯 Phase 1.5: Shadcn/UI Card Added!</h1>
      <p className="text-lg text-muted-foreground mb-6">Testing Button + Card components with our Tailwind foundation.</p>
      
      <div className="flex gap-4 flex-wrap mb-8">
        <Button>Default Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      
      <div className="flex gap-4 flex-wrap mb-8">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the card content. It can contain any React elements.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">Action</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Another Card</CardTitle>
            <CardDescription>With different content</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Cards are flexible containers for grouping related content and actions.</p>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm">Save</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Status Card</CardTitle>
            <CardDescription>Showing component status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">All systems operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#f0f8f0', 
        borderRadius: '8px',
        border: '1px solid #4ade80'
      }}>
        <h2>✅ What Works:</h2>
        <ul>
          <li>Clean Next.js 15.4.6 + React 19.1.0</li>
          <li>Tailwind CSS v3.4.17 + Shadcn/UI design system</li>
          <li>Button component with all variants + sizes</li>
          <li>Card component with Header/Content/Footer</li>
          <li>Deploys to Netlify successfully</li>
          <li>Chrome Extension sidebar still works</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        backgroundColor: '#f8f0f0', 
        borderRadius: '8px',
        border: '1px solid #f87171'
      }}>
        <h2>🗂️ Moved to /backup:</h2>
        <ul>
          <li>Complex web-next app with build failures</li>
          <li>Shared package with Clerk imports</li>
          <li>Netlify functions causing issues</li>
          <li>Supabase complexity</li>
          <li>All broken code preserved for reference</li>
        </ul>
      </div>

      <p><strong>Build time:</strong> {new Date().toISOString()}</p>
    </div>
  );
}