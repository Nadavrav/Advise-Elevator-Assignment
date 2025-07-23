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
    public class CallsController : ControllerBase
    {
        private readonly ElevatorDbContext _context;

        public CallsController(ElevatorDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateCall(ElevatorCallDto callDto)
        {
            var call = new ElevatorCall
            {
                BuildingId = callDto.BuildingId,
                RequestedFloor = callDto.RequestedFloor,
                CallTime = DateTime.UtcNow,
                IsHandled = false,
            };

            _context.ElevatorCalls.Add(call);
            await _context.SaveChangesAsync();

            return Ok(call);
        }

        [HttpPut("destination")]
        public async Task<IActionResult> UpdateDestination(DestinationDto destinationDto)
        {
            // Find the original call that brought the elevator to the pickup floor
            var originalCall = await _context
                .ElevatorCalls.Where(c =>
                    c.BuildingId == destinationDto.BuildingId
                    && c.RequestedFloor == destinationDto.PickupFloor
                    && c.DestinationFloor == null
                )
                .OrderByDescending(c => c.CallTime)
                .FirstOrDefaultAsync();

            if (originalCall == null)
            {
                return NotFound("Could not find the original pickup call to update.");
            }

            originalCall.DestinationFloor = destinationDto.DestinationFloor;
            await _context.SaveChangesAsync();

            return Ok(originalCall);
        }
    }
}
