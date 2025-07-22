import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const [buildings, setBuildings] = useState([]);
  const [name, setName] = useState('');
  const [floors, setFloors] = useState(10); // Default value
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5009/api/buildings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch buildings.');
      }
      const data = await response.json();
      setBuildings(data);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchBuildings();
    }
  }, [token, fetchBuildings]);

  const handleCreateBuilding = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch('http://localhost:5009/api/buildings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name, numberOfFloors: parseInt(floors) }),
      });

      if (!response.ok) {
        throw new Error('Failed to create building.');
      }
      // Reset form and refetch buildings to update the list
      setName('');
      setFloors(10);
      fetchBuildings();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>My Buildings Dashboard</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Add New Building</h2>
        <form onSubmit={handleCreateBuilding}>
          <div>
            <label>Building Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label>Number of Floors:</label>
            <input 
              type="number" 
              value={floors} 
              onChange={(e) => setFloors(e.target.value)} 
              min="1" 
              required 
            />
          </div>
          <button type="submit">Create Building</button>
        </form>
      </div>

      <hr />

      <h2>Existing Buildings</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {buildings.length > 0 ? (
        <ul>
          {buildings.map((building) => (
            <li key={building.id}>
              <Link to={`/building/${building.id}`}>
                {building.name} ({building.numberOfFloors} floors)
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No buildings found. Create one above!</p>
      )}
    </div>
  );
}

export default DashboardPage;