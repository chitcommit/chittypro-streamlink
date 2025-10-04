export default function TestPage() {
  return (
    <div style={{ padding: "20px", background: "white", color: "black" }}>
      <h1>ChittyPro Streamlink Test Page</h1>
      <p>If you can see this, React is working!</p>
      <div
        style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0" }}
      >
        <p>Server is: RUNNING ✅</p>
        <p>React is: RENDERING ✅</p>
        <p>Current time: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
