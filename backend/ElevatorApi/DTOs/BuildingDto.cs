namespace ElevatorApi.DTOs
{
    public class BuildingDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int NumberOfFloors { get; set; }
    }
}