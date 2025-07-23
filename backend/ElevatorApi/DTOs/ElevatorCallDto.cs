namespace ElevatorApi.DTOs
{
    public class ElevatorCallDto
    {
        public int BuildingId { get; set; }
        public int RequestedFloor { get; set; }
    }
}