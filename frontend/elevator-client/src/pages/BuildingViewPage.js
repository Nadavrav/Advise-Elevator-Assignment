import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HubConnectionBuilder } from "@microsoft/signalr";

function BuildingViewPage() {
  const { id: buildingId } = useParams();
  const { token } = useAuth();

  const [building, setBuilding] = useState(null);
  const [elevators, setElevators] = useState({});
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const fetchBuilding = async () => {
      try {
        const response = await fetch(
          `http://localhost:5009/api/buildings/${buildingId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch building details.");
        const data = await response.json();
        setBuilding(data);

        const initialElevators = {};
        for (const elevator of data.elevators) {
          initialElevators[elevator.id] = elevator;
        }
        setElevators(initialElevators);
      } catch (err) {
        setError(err.message);
      }
    };
    if (token) fetchBuilding();
  }, [buildingId, token]);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl("http://localhost:5009/elevatorHub")
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log("SignalR Connected!");
          connection
            .invoke("JoinBuildingGroup", buildingId)
            .catch((err) => console.error("Error joining group: ", err));

          connection.on("ReceiveElevatorUpdate", (update) => {
            console.log("Update received for elevator " + update.id, update);
            setElevators((prevElevators) => ({
              ...prevElevators,
              [update.id]: {
                ...prevElevators[update.id],
                currentFloor: update.currentFloor,
                status: update.status,
                direction: update.direction,
                doorStatus: update.doorStatus,
              },
            }));
          });
        })
        .catch((e) => console.log("Connection failed: ", e));
    }
    return () => {
      connection?.stop();
    };
  }, [connection, buildingId]);

  const handleCallElevator = async (floor) => {
    try {
      await fetch("http://localhost:5009/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  const handleSelectDestination = async (pickupFloor, destinationFloor) => {
    try {
      await fetch("http://localhost:5009/api/calls/destination", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: parseInt(buildingId),
          pickupFloor: pickupFloor,
          destinationFloor: destinationFloor,
        }),
      });
      alert(`Destination ${destinationFloor} selected!`);
    } catch (err) {
      alert("Failed to select destination.");
    }
  };

  const elevatorStyle = {
    border: "2px solid black",
    backgroundColor: "lightgray",
    padding: "10px",
    width: "80%",
    minHeight: "44px",
    boxSizing: "border-box",
    textAlign: "center",
  };

  const floorStyle = {
    border: "1px solid #ccc",
    padding: "10px",
    margin: "5px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "66px",
    boxSizing: "border-box",
  };

  if (!building) return <div>Loading building...</div>;

  const floors = Array.from(
    { length: building.numberOfFloors },
    (_, i) => building.numberOfFloors - 1 - i
  );

  // This function renders the content inside an elevator
  const renderElevatorContent = (elevator) => {
    if (elevator.doorStatus === "Open") {
      return (
        <div>
          <strong>E-{elevator.id}</strong>
          <div style={{ marginTop: "5px", fontSize: "10px" }}>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() =>
                  handleSelectDestination(elevator.currentFloor, floor)
                }
                disabled={floor === elevator.currentFloor}
                style={{ margin: "1px" }}
              >
                {floor}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return <strong>E-{elevator.id}</strong>;
  };

  return (
    <div>
      <h1>{building.name}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "flex",
          gap: "10px",
          border: "2px solid gray",
          padding: "10px",
          marginTop: "20px",
        }}
      >
        {/* Floors Column */}
        <div style={{ flexGrow: 1 }}>
          {floors.map((floorNum) => (
            <div key={floorNum} style={floorStyle}>
              <span>Floor {floorNum}</span>
              <button onClick={() => handleCallElevator(floorNum)}>Call</button>
            </div>
          ))}
        </div>

        {/* Elevator Shafts */}
        {Object.values(elevators).map((elevator) => (
          <div
            key={elevator.id}
            style={{
              flexGrow: 1,
              borderLeft: "1px solid black",
              borderRight: "1px solid black",
            }}
          >
            {floors.map((floorNum) => (
              <div
                key={floorNum}
                style={{
                  border: "1px solid transparent",
                  padding: "10px",
                  margin: "5px 0",
                  minHeight: "66px",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {elevator.currentFloor === floorNum && (
                  <div
                    style={{
                      ...elevatorStyle,
                      backgroundColor:
                        elevator.doorStatus === "Open"
                          ? "lightblue"
                          : "lightgray",
                    }}
                  >
                    {renderElevatorContent(elevator)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BuildingViewPage;
