using Elevator.Api.Data;
using Elevator.Api.DTOs;
using Elevator.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ElevatorEntity = Elevator.Api.Entities.Elevator;

namespace Elevator.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BuildingsController : ControllerBase
    {
        private readonly ElevatorDbContext _context;

        public BuildingsController(ElevatorDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateBuilding(BuildingCreateDto buildingDto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var building = new Building
            {
                Name = buildingDto.Name,
                NumberOfFloors = buildingDto.NumberOfFloors,
                UserId = userId
            };

            var elevator = new ElevatorEntity
            {
                CurrentFloor = 0,
                Status = ElevatorStatus.Idle,
                Direction = Direction.None,
                DoorStatus = DoorStatus.Closed,
                Building = building
            };

            _context.Buildings.Add(building);
            _context.Elevators.Add(elevator);

            await _context.SaveChangesAsync();

            return Ok(building);
        }
    }
}