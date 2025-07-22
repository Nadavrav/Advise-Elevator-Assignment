namespace ElevatorApi.Entities
{
    public class ElevatorCall
    {
        public int Id { get; set; }
        public int RequestedFloor { get; set; }
        public int? DestinationFloor { get; set; }
        public DateTime CallTime { get; set; }
        public bool IsHandled { get; set; }

        public int BuildingId { get; set; }
        public Building Building { get; set; } = null!;

        public ICollection<ElevatorCallAssignment> ElevatorCallAssignments { get; set; } = new List<ElevatorCallAssignment>();
    }
}