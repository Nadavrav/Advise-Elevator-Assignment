# Real-Time Elevator Simulation

This project is a full-stack application designed to simulate and manage a system of elevators in real-time. It was built as a take-home assignment for a junior developer position.

The system features a .NET backend with a background service running the core elevator logic, and a React frontend for user interaction and visualization. Real-time communication is handled by SignalR.

## Project Structure

The repository is organized into two main folders:

-   **/backend**: Contains the ASP.NET Core Web API project (`ElevatorApi`). This handles all business logic, database interactions, and the real-time simulation.
-   **/frontend**: Contains the React project (`elevator-client`). This provides the user interface for authentication, building management, and the elevator simulation view.

## Technologies Used

-   **Backend**: ASP.NET Core 8, Entity Framework Core, SignalR
-   **Frontend**: React, JavaScript, react-router-dom
-   **Database**: SQL Server
-   **Real-time Communication**: SignalR
-   **Authentication**: JWT (JSON Web Tokens)

## Setup and Running Instructions

### Prerequisites

-   .NET 8 SDK
-   Node.js and npm
-   SQL Server (LocalDB or a full instance)

### 1. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend/ElevatorApi
    ```
2.  **Configure Database:**
    - Open the `appsettings.json` file.
    - Verify that the `DefaultConnection` string under `ConnectionStrings` points to your local SQL Server instance. The default is set to use LocalDB.
3.  **Restore Dependencies:**
    ```bash
    dotnet restore
    ```
4.  **Create the Database:**
    - Run the Entity Framework migrations to create the database and its schema.
    ```bash
    dotnet ef database update
    ```
5.  **Run the Server:**
    ```bash
    dotnet run
    ```
    The backend server will start, typically on `http://localhost:5009`. The background service for the elevator simulation will start running automatically.

### 2. Frontend Setup

1.  **Open a new, separate terminal.**
2.  **Navigate to the frontend directory:**
    ```bash
    cd frontend/elevator-client
    ```
3.  **Restore Dependencies:**
    ```bash
    npm install
    ```
4.  **Verify API Port:**
    - In the frontend code (e.g., `src/pages/AuthPage.js`), the API URL is hardcoded to `http://localhost:5009`. If your backend is running on a different port, you will need to update it there.
5.  **Run the Client:**
    ```bash
    npm start
    ```
    The React application will open in your browser, typically at `http://localhost:3000`.

## Algorithm Approach

The elevator simulation is managed by a `BackgroundService` in the backend that runs on a timed loop (a "tick").

-   **State Management:** The service uses an in-memory `ConcurrentDictionary` to manage the destination queues and door timers for each elevator, separate from the database state.
-   **Dispatcher Logic:** When new calls are found in the database, the service acts as a dispatcher. For an `Idle` elevator, it finds the closest unhandled call to assign as a new mission.
-   **"On the Way" Pickups:** While an elevator is `MovingUp` or `MovingDown`, the service checks for new calls that are on its current path and in the same direction, adding them to its destination queue.
-   **State Machine:** A `switch` statement manages the elevator's state (`Idle`, `MovingUp`, `MovingDown`, `OpeningDoors`, `ClosingDoors`) to control its behavior during each tick.

## Bonus Mission

The bonus mission for supporting **multiple elevators per building** was completed.
-   **Database:** The schema was refactored to a one-to-many relationship between `Building` and `Elevator`. The UI was updated to allow the user to specify the number of elevators when creating a building.
-   **Algorithm:** The background service's dispatcher logic was upgraded to handle multiple elevators, assigning new calls to the closest idle elevator in a building.
-   **Frontend:** The UI in the `BuildingViewPage` was updated to display multiple elevator shafts side-by-side and to track the state of each elevator individually via real-time SignalR updates.