using System.Security.Claims;
using ElevatorApi.Data;
using ElevatorApi.DTOs;
using ElevatorApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ElevatorApi.Controllers
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

        [HttpGet]
        public async Task<IActionResult> GetBuildings()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var buildings = await _context
                .Buildings.Where(b => b.UserId == userId)
                .Select(b => new BuildingDto // Select into the DTO
                {
                    Id = b.Id,
                    Name = b.Name,
                    NumberOfFloors = b.NumberOfFloors,
                })
                .ToListAsync();

            return Ok(buildings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBuilding(BuildingCreateDto buildingDto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var building = new Building
            {
                Name = buildingDto.Name,
                NumberOfFloors = buildingDto.NumberOfFloors,
                NumberOfElevators = buildingDto.NumberOfElevators,
                UserId = userId,
            };

            for (int i = 0; i < building.NumberOfElevators; i++)
            {
                var elevator = new Elevator
                {
                    CurrentFloor = 0,
                    Status = ElevatorStatus.Idle,
                    Direction = Direction.None,
                    DoorStatus = DoorStatus.Closed,
                    Building = building,
                };
                _context.Elevators.Add(elevator);
            }

            _context.Buildings.Add(building);

            await _context.SaveChangesAsync();

            var buildingToReturn = new BuildingDto
            {
                Id = building.Id,
                Name = building.Name,
                NumberOfFloors = building.NumberOfFloors,
            };

            return Ok(buildingToReturn);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBuilding(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var building = await _context
                .Buildings.Include(b => b.Elevators)
                .Where(b => b.UserId == userId && b.Id == id)
                .FirstOrDefaultAsync();

            if (building == null)
            {
                return NotFound();
            }

            var buildingDto = new BuildingDto
            {
                Id = building.Id,
                Name = building.Name,
                NumberOfFloors = building.NumberOfFloors,
                Elevators = building
                    .Elevators.Select(e => new ElevatorDto
                    {
                        Id = e.Id,
                        CurrentFloor = e.CurrentFloor,
                        Status = e.Status,
                        Direction = e.Direction,
                        DoorStatus = e.DoorStatus,
                    })
                    .ToList(),
            };

            return Ok(buildingDto);
        }
    }
}