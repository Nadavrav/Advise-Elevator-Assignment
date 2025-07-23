import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HubConnectionBuilder } from '@microsoft/signalr';

function BuildingViewPage() {
  const { id: buildingId } = useParams();
  const { token } = useAuth();
  
  const [building, setBuilding] = useState(null);
  const [elevatorState, setElevatorState] = useState({ currentFloor: 0, status: 'Idle', doorStatus: 'Closed' });
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState(null);

  // Effect for fetching building details (no change)
  useEffect(() => {
    const fetchBuilding = async () => {
      try {
        const response = await fetch(`http://localhost:5009/api/buildings/${buildingId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch building details.');
        const data = await response.json();
        setBuilding(data);
      } catch (err) {
        setError(err.message);
      }
    };
    if (token) fetchBuilding();
  }, [buildingId, token]);

  // Effect for setting up SignalR (no change)
  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl("http://localhost:5009/elevatorHub")
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);
  }, []);

  // Effect for managing the SignalR connection (no change)
  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log('SignalR Connected!');
          connection.invoke("JoinBuildingGroup", buildingId).catch(err => console.error('Error joining group: ', err));
          connection.on('ReceiveElevatorUpdate', (update) => {
            console.log('Update received:', update);
            setElevatorState({
              currentFloor: update.currentFloor,
              status: update.status,
              doorStatus: update.doorStatus,
            });
          });
        })
        .catch(e => console.log('Connection failed: ', e));
    }
    return () => { connection?.stop(); };
  }, [connection, buildingId]);

  const handleCallElevator = async (floor) => {
    try {
      await fetch("http://localhost:5009/api/calls", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: parseInt(buildingId),
          requestedFloor: floor,
        }),
      });
    } catch (err) {
      alert("Failed to call elevator.");
    }
  };

  const handleSelectDestination = async (destinationFloor) => {
    try {
      await fetch("http://localhost:5009/api/calls/destination", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: parseInt(buildingId),
          pickupFloor: elevatorState.currentFloor,
          destinationFloor: destinationFloor,
        }),
      });
      alert(`Destination ${destinationFloor} selected!`);
    } catch (err) {
      alert("Failed to select destination.");
    }
  };

  const elevatorStyle = {
    border: '2px solid black',
    padding: '10px',
    margin: '5px 0',
    backgroundColor: elevatorState.doorStatus === 'Open' ? 'lightblue' : 'lightgray',
    transition: 'all 0.5s ease',
    minWidth: '100px',
    textAlign: 'center',
  };

  const floorStyle = {
    border: '1px solid #ccc',
    padding: '10px',
    margin: '5px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  if (!building) return <div>Loading building...</div>;

  const floors = Array.from({ length: building.numberOfFloors }, (_, i) => building.numberOfFloors - 1 - i);

  const renderElevatorContent = () => {
    if (elevatorState.doorStatus === 'Open') {
      return (
        <div>
          <strong>ELEVATOR</strong>
          <div style={{ marginTop: '10px' }}>
            {floors.map(floor => (
              <button 
                key={floor} 
                onClick={() => handleSelectDestination(floor)}
                disabled={floor === elevatorState.currentFloor}
                style={{ margin: '2px' }}
              >
                {floor}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return <strong>ELEVATOR</strong>;
  };

  return (
    <div>
      <h1>{building.name}</h1>
      <p>Elevator is on floor: <strong>{elevatorState.currentFloor}</strong> | Status: <strong>{elevatorState.status}</strong></p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div style={{ border: '2px solid gray', padding: '10px', marginTop: '20px' }}>
        {floors.map(floorNum => (
          <div key={floorNum} style={floorStyle}>
            <span>Floor {floorNum}</span>
            {elevatorState.currentFloor === floorNum ? (
              <div style={elevatorStyle}>
                {renderElevatorContent()}
              </div>
            ) : (
              <button onClick={() => handleCallElevator(floorNum)}>Call</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BuildingViewPage;