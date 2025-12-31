export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404 - Page not found</h1>
        <p style={{ color: '#666', marginBottom: '1.25rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Go back home</a>
      </div>
    </div>
  );
}
