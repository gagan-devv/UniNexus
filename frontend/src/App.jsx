import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Connect to the Backend
    fetch(`/api/health`)
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => console.error("Error connecting to server:", error));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-10 bg-white shadow-xl rounded-xl text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">UniNexus</h1>
        <p className="text-xl text-gray-700">
          Backend Status:
          <span className="font-semibold text-green-600 ml-2">
            {message ? message : "Connecting..."}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;