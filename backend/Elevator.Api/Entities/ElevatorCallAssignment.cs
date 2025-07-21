namespace Elevator.Api.Entities
{
    public class ElevatorCallAssignment
    {
        public int Id { get; set; }
        public DateTime AssignmentTime { get; set; }

        public int ElevatorId { get; set; }
        public Elevator Elevator { get; set; }

        public int ElevatorCallId { get; set; }
        public ElevatorCall ElevatorCall { get; set; }
    }
}