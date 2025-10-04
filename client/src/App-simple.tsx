export default function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a2e',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          ChittyPro Streamlink
        </h1>
        <p style={{ fontSize: '24px', opacity: 0.7 }}>
          Camera Surveillance System
        </p>
        <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
          <p>✅ React is working!</p>
          <p>✅ Server is running!</p>
          <p>✅ You can see this page!</p>
        </div>
      </div>
    </div>
  );
}