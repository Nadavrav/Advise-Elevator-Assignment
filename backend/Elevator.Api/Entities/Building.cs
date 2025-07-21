namespace Elevator.Api.Entities
{
    public class Building
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int NumberOfFloors { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }
        
        public Elevator Elevator { get; set; }
    }
}