export default function TestSimple() {
  return (
    <div
      style={{
        background: "#f8f7f4",
        color: "#2d3436",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Derail Camera System - Test Page
      </h1>
      <p style={{ marginBottom: "0.5rem" }}>
        If you see this, React is rendering!
      </p>
      <p style={{ marginBottom: "0.5rem" }}>Background: Cream (#f8f7f4)</p>
      <p style={{ marginBottom: "0.5rem" }}>Text: Charcoal (#2d3436)</p>
      <div
        style={{
          background: "#00d9ff",
          color: "#2d3436",
          padding: "1rem",
          marginTop: "1rem",
          borderRadius: "8px",
        }}
      >
        Electric Teal Accent (#00d9ff)
      </div>
    </div>
  );
}
