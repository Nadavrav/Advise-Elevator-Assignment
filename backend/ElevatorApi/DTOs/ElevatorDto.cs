namespace ElevatorApi.DTOs
{
    public class ElevatorDto
    {
        public int Id { get; set; }
        public int CurrentFloor { get; set; }
        public Entities.ElevatorStatus Status { get; set; }
        public Entities.Direction Direction { get; set; }
        public Entities.DoorStatus DoorStatus { get; set; }
    }
}