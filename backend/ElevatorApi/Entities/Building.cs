namespace ElevatorApi.Entities
{
    public class Building
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int NumberOfFloors { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public Elevator Elevator { get; set; } = null!;
    }
}
