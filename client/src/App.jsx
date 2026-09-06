import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(`Connected — ${data.status}`))
      .catch(() => setStatus("Could not reach server. Is it running?"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>PMO Pilot</h1>
      <p>Backend status: {status}</p>
    </div>
  );
}

export default App;
