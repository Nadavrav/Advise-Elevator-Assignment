using System.Collections.Concurrent;
using ElevatorApi.Data;
using ElevatorApi.Entities;
using ElevatorApi.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ElevatorApi.Services
{
    public class ElevatorBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ElevatorBackgroundService> _logger;
        private readonly int _tickIntervalSeconds;
        private const int DoorOpenDurationInTicks = 3;

        private readonly ConcurrentDictionary<int, List<int>> _elevatorDestinations = new();
        private readonly ConcurrentDictionary<int, int> _doorTimers = new();

        public ElevatorBackgroundService(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<ElevatorBackgroundService> logger
        )
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _tickIntervalSeconds = configuration.GetValue<int>(
                "ElevatorSettings:TickIntervalSeconds",
                5
            );
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Elevator Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dbContext =
                            scope.ServiceProvider.GetRequiredService<ElevatorDbContext>();
                        var hubContext = scope.ServiceProvider.GetRequiredService<
                            IHubContext<ElevatorHub>
                        >();

                        var buildings = await dbContext
                            .Buildings.Include(b => b.Elevators)
                            .ToListAsync(stoppingToken);

                        foreach (var building in buildings)
                        {
                            var pendingCalls = await dbContext
                                .ElevatorCalls.Where(c =>
                                    c.BuildingId == building.Id && !c.IsHandled
                                )
                                .ToListAsync(stoppingToken);

                            // --- DISPATCHER LOGIC ---
                            foreach (var call in pendingCalls)
                            {
                                var idleAndClosest = building
                                    .Elevators.Where(e => e.Status == ElevatorStatus.Idle)
                                    .OrderBy(e => Math.Abs(e.CurrentFloor - call.RequestedFloor))
                                    .FirstOrDefault();

                                if (idleAndClosest != null)
                                {
                                    var destinations = _elevatorDestinations.GetOrAdd(
                                        idleAndClosest.Id,
                                        new List<int>()
                                    );
                                    if (!destinations.Contains(call.RequestedFloor))
                                        destinations.Add(call.RequestedFloor);
                                    if (
                                        call.DestinationFloor.HasValue
                                        && !destinations.Contains(call.DestinationFloor.Value)
                                    )
                                        destinations.Add(call.DestinationFloor.Value);
                                    call.IsHandled = true;
                                }
                            }

                            // --- STATE MACHINE LOGIC ---
                            foreach (var elevator in building.Elevators)
                            {
                                _elevatorDestinations.TryAdd(elevator.Id, new List<int>());
                                _doorTimers.TryAdd(elevator.Id, 0);
                                var destinations = _elevatorDestinations[elevator.Id];

                                switch (elevator.Status)
                                {
                                    case ElevatorStatus.Idle:
                                        if (destinations.Any())
                                        {
                                            int nextStop = destinations
                                                .OrderBy(d => Math.Abs(elevator.CurrentFloor - d))
                                                .First();
                                            if (elevator.CurrentFloor < nextStop)
                                            {
                                                elevator.Status = ElevatorStatus.MovingUp;
                                                elevator.Direction = Direction.Up;
                                            }
                                            else if (elevator.CurrentFloor > nextStop)
                                            {
                                                elevator.Status = ElevatorStatus.MovingDown;
                                                elevator.Direction = Direction.Down;
                                            }
                                            else
                                            {
                                                elevator.Status = ElevatorStatus.OpeningDoors;
                                            }
                                        }
                                        break;

                                    case ElevatorStatus.MovingUp:
                                    case ElevatorStatus.MovingDown:
                                        var onTheWayCalls = await dbContext
                                            .ElevatorCalls.Where(c =>
                                                c.BuildingId == elevator.BuildingId && !c.IsHandled
                                            )
                                            .ToListAsync(stoppingToken);

                                        foreach (var call in onTheWayCalls)
                                        {
                                            bool isMovingUp =
                                                elevator.Status == ElevatorStatus.MovingUp;
                                            if (
                                                isMovingUp
                                                && call.RequestedFloor > elevator.CurrentFloor
                                            )
                                            {
                                                if (!destinations.Contains(call.RequestedFloor))
                                                    destinations.Add(call.RequestedFloor);
                                                call.IsHandled = true;
                                            }
                                            else if (
                                                !isMovingUp
                                                && call.RequestedFloor < elevator.CurrentFloor
                                            )
                                            {
                                                if (!destinations.Contains(call.RequestedFloor))
                                                    destinations.Add(call.RequestedFloor);
                                                call.IsHandled = true;
                                            }
                                        }

                                        if (elevator.Status == ElevatorStatus.MovingUp)
                                            elevator.CurrentFloor++;
                                        if (elevator.Status == ElevatorStatus.MovingDown)
                                            elevator.CurrentFloor--;

                                        if (destinations.Contains(elevator.CurrentFloor))
                                        {
                                            elevator.Status = ElevatorStatus.OpeningDoors;
                                        }
                                        break;

                                    case ElevatorStatus.OpeningDoors:
                                        elevator.DoorStatus = DoorStatus.Open;
                                        _doorTimers[elevator.Id] = DoorOpenDurationInTicks;
                                        elevator.Status = ElevatorStatus.ClosingDoors;
                                        destinations.Remove(elevator.CurrentFloor);
                                        break;

                                    case ElevatorStatus.ClosingDoors:
                                        if (_doorTimers[elevator.Id] > 0)
                                        {
                                            _doorTimers[elevator.Id]--;
                                        }
                                        else
                                        {
                                            elevator.DoorStatus = DoorStatus.Closed;

                                            var updatedCall = await dbContext
                                                .ElevatorCalls.Where(c =>
                                                    c.BuildingId == elevator.BuildingId
                                                    && c.RequestedFloor == elevator.CurrentFloor
                                                    && c.DestinationFloor.HasValue
                                                )
                                                .OrderByDescending(c => c.CallTime)
                                                .FirstOrDefaultAsync(stoppingToken);

                                            if (
                                                updatedCall != null
                                                && !destinations.Contains(
                                                    updatedCall.DestinationFloor.Value
                                                )
                                            )
                                            {
                                                destinations.Add(
                                                    updatedCall.DestinationFloor.Value
                                                );
                                            }

                                            if (destinations.Any())
                                            {
                                                int nextStop = destinations
                                                    .OrderBy(d =>
                                                        Math.Abs(elevator.CurrentFloor - d)
                                                    )
                                                    .First();
                                                if (elevator.CurrentFloor < nextStop)
                                                {
                                                    elevator.Status = ElevatorStatus.MovingUp;
                                                    elevator.Direction = Direction.Up;
                                                }
                                                else if (elevator.CurrentFloor > nextStop)
                                                {
                                                    elevator.Status = ElevatorStatus.MovingDown;
                                                    elevator.Direction = Direction.Down;
                                                }
                                            }
                                            else
                                            {
                                                elevator.Status = ElevatorStatus.Idle;
                                                elevator.Direction = Direction.None;
                                            }
                                        }
                                        break;
                                }
                            }
                        }

                        await dbContext.SaveChangesAsync(stoppingToken);

                        var allElevators = buildings.SelectMany(b => b.Elevators);
                        foreach (var elevator in allElevators)
                        {
                            string groupName = $"building-{elevator.BuildingId}";
                            await hubContext
                                .Clients.Group(groupName)
                                .SendAsync(
                                    "ReceiveElevatorUpdate",
                                    new
                                    {
                                        elevator.Id,
                                        elevator.CurrentFloor,
                                        elevator.Status,
                                        elevator.Direction,
                                        elevator.DoorStatus,
                                    },
                                    stoppingToken
                                );
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred in the Elevator Background Service.");
                }

                await Task.Delay(TimeSpan.FromSeconds(_tickIntervalSeconds), stoppingToken);
            }
        }
    }
}
