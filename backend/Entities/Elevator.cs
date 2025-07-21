namespace Elevator.Api.Entities
{
    public enum ElevatorStatus
    {
        Idle,
        MovingUp,
        MovingDown,
        OpeningDoors,
        ClosingDoors
    }

    public enum Direction
    {
        Up,
        Down,
        None
    }

    public enum DoorStatus
    {
        Open,
        Closed
    }

    public class Elevator
    {
        public int Id { get; set; }
        public int CurrentFloor { get; set; }
        public ElevatorStatus Status { get; set; }
        public Direction Direction { get; set; }
        public DoorStatus DoorStatus { get; set; }

        public int BuildingId { get; set; }
        public Building Building { get; set; }

        public ICollection<ElevatorCallAssignment> ElevatorCallAssignments { get; set; }
    }
}