export default function MinimalPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Gate 5: Minimal Build Test</h1>
      <p>This is a minimal Next.js application to test basic Netlify deployment.</p>
      <p>If you can see this page, the minimal build is working!</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5' }}>
        <h2>Build Information:</h2>
        <ul>
          <li>Next.js: 15.4.6</li>
          <li>React: 19.1.0</li>
          <li>Node: {process.version}</li>
          <li>Environment: {process.env.NODE_ENV}</li>
        </ul>
      </div>
    </div>
  )
}