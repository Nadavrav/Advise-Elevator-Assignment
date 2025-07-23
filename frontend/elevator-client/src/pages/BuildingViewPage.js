import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext"; // Import useLoading
import { HubConnectionBuilder } from "@microsoft/signalr";
import styles from "./BuildingViewPage.module.css";

function BuildingViewPage() {
  const { id: buildingId } = useParams();
  const { token } = useAuth();
  const { showLoading, hideLoading } = useLoading(); // Get loading functions

  const [building, setBuilding] = useState(null);
  const [elevators, setElevators] = useState({});
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const fetchBuilding = async () => {
      setError(null);
      showLoading();
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
      } finally {
        hideLoading();
      }
    };
    if (token) fetchBuilding();
  }, [buildingId, token, showLoading, hideLoading]);

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

  const handleApiCall = async (url, options) => {
    showLoading();
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "API call failed");
      }
      return response;
    } finally {
      hideLoading();
    }
  };

  const handleCallElevator = async (floor) => {
    try {
      await handleApiCall("http://localhost:5009/api/calls", {
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
      alert(`Failed to call elevator: ${err.message}`);
    }
  };

  const handleSelectDestination = async (pickupFloor, destinationFloor) => {
    try {
      await handleApiCall("http://localhost:5009/api/calls/destination", {
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
    } catch (err) {
      alert(`Failed to select destination: ${err.message}`);
    }
  };

  if (!building) return null; // Let the loading modal handle the initial loading state

  const floors = Array.from(
    { length: building.numberOfFloors },
    (_, i) => building.numberOfFloors - 1 - i
  );

  const renderElevatorContent = (elevator) => {
    if (elevator.doorStatus === "Open") {
      return (
        <>
          <span>E-{elevator.id}</span>
          <div className={styles.destinationPad}>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() =>
                  handleSelectDestination(elevator.currentFloor, floor)
                }
                disabled={floor === elevator.currentFloor}
                className={styles.destinationButton}
              >
                {floor}
              </button>
            ))}
          </div>
        </>
      );
    }
    return <span>E-{elevator.id}</span>;
  };

  return (
    <div className={styles.pageContainer}>
      <h1>{building.name}</h1>
      <div className={styles.simulationContainer}>
        <div>
          {floors.map((floorNum) => (
            <div key={floorNum} className={styles.floor}>
              <span>Floor {floorNum}</span>
              <button
                onClick={() => handleCallElevator(floorNum)}
                className={styles.callButton}
              >
                Call
              </button>
            </div>
          ))}
        </div>

        {Object.values(elevators).map((elevator) => (
          <div key={elevator.id} className={styles.shaft}>
            {floors.map((floorNum) => (
              <div key={floorNum} className={styles.shaftCell}>
                {elevator.currentFloor === floorNum && (
                  <div
                    className={`${styles.elevator} ${
                      elevator.doorStatus === "Open" ? styles.elevatorOpen : ""
                    }`}
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
