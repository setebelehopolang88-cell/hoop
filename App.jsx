import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api/attendance';

function App() {
  const [name, setName] = useState('');
  const [records, setRecords] = useState([]);

  // Fetch records from backend on load
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setRecords(data))
      .catch((err) => console.error('Error fetching data:', err));
  }, []);

  // Handle submit based on which action button was clicked
  const handleAction = async (statusValue) => {
    if (!name.trim()) {
      alert('Please enter your name first!');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), status: statusValue }),
      });

      if (response.ok) {
        const savedRecord = await response.json();
        setRecords([savedRecord, ...records]); // Prepend new record to the list
        setName(''); // Clear input box
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <div className="container">
      <h2>Self Check-In</h2>
      
      <div className="form-group">
        <label htmlFor="name-input">Enter Your Name</label>
        <input
          id="name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Doe"
          className="name-field"
        />
      </div>

      <div className="action-buttons">
        <button 
          type="button" 
          className="btn btn-present" 
          onClick={() => handleAction('Present')}
        >
          ✓ I am Present
        </button>
        <button 
          type="button" 
          className="btn btn-absent" 
          onClick={() => handleAction('Absent')}
        >
          ✕ I am Absent
        </button>
      </div>

      <h3>Today's Attendance</h3>
      {records.length === 0 ? (
        <p className="empty-state">No one has checked in yet.</p>
      ) : (
        <ul className="record-list">
          {records.map((rec) => (
            <li key={rec._id} className={`record-item ${rec.status.toLowerCase()}`}>
              <div>
                <strong>{rec.name}</strong>
                <span className="timestamp">
                  {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className={`status-badge ${rec.status.toLowerCase()}`}>
                {rec.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
