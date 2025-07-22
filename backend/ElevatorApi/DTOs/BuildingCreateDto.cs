using System.ComponentModel.DataAnnotations;

namespace ElevatorApi.DTOs
{
    public class BuildingCreateDto
    {
        [Required]
        public string Name { get; set; } = null!;

        [Required]
        [Range(1, 100)]
        public int NumberOfFloors { get; set; }
    }
}