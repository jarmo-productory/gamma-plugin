import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-4">🎯 Phase 1.3: Shadcn/UI Button Added!</h1>
      <p className="text-lg text-muted-foreground mb-6">Testing Shadcn/UI Button component with our Tailwind foundation.</p>
      
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
          <li>No complex dependencies</li>
          <li>No Clerk/Supabase complications</li>
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