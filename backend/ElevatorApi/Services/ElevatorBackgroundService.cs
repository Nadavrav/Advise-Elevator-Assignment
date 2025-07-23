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

        // This dictionary will hold the destination queue for each elevator, in memory.
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

                        var elevators = await dbContext.Elevators.ToListAsync(stoppingToken);

                        foreach (var elevator in elevators)
                        {
                            // Initialize this elevator's queue and timer if it's not already there
                            _elevatorDestinations.TryAdd(elevator.Id, new List<int>());
                            _doorTimers.TryAdd(elevator.Id, 0);

                            var destinations = _elevatorDestinations[elevator.Id];

                            switch (elevator.Status)
                            {
                                case ElevatorStatus.Idle:
                                    var pendingCall = await dbContext
                                        .ElevatorCalls.Where(c =>
                                            c.BuildingId == elevator.BuildingId && !c.IsHandled
                                        )
                                        .OrderBy(c => c.CallTime)
                                        .FirstOrDefaultAsync(stoppingToken);

                                    if (pendingCall != null)
                                    {
                                        _logger.LogInformation(
                                            "Elevator {Id} is handling call {CallId}",
                                            elevator.Id,
                                            pendingCall.Id
                                        );

                                        destinations.Add(pendingCall.RequestedFloor);
                                        if (pendingCall.DestinationFloor.HasValue)
                                        {
                                            destinations.Add(pendingCall.DestinationFloor.Value);
                                        }

                                        pendingCall.IsHandled = true;

                                        if (elevator.CurrentFloor < destinations.First())
                                        {
                                            elevator.Status = ElevatorStatus.MovingUp;
                                            elevator.Direction = Direction.Up;
                                        }
                                        else if (elevator.CurrentFloor > destinations.First())
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
                                        // Check if the call is in the same direction and on the path
                                        if (
                                            isMovingUp
                                            && call.RequestedFloor > elevator.CurrentFloor
                                        )
                                        {
                                            destinations.Add(call.RequestedFloor);
                                            if (call.DestinationFloor.HasValue)
                                                destinations.Add(call.DestinationFloor.Value);
                                            call.IsHandled = true;
                                        }
                                        else if (
                                            !isMovingUp
                                            && call.RequestedFloor < elevator.CurrentFloor
                                        )
                                        {
                                            destinations.Add(call.RequestedFloor);
                                            if (call.DestinationFloor.HasValue)
                                                destinations.Add(call.DestinationFloor.Value);
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
                                    _logger.LogInformation(
                                        "Elevator {Id} doors opening at floor {Floor}",
                                        elevator.Id,
                                        elevator.CurrentFloor
                                    );
                                    break;

                                case ElevatorStatus.ClosingDoors:
                                    if (_doorTimers[elevator.Id] > 0)
                                    {
                                        _doorTimers[elevator.Id]--;
                                    }
                                    else
                                    {
                                        elevator.DoorStatus = DoorStatus.Closed;
                                        _logger.LogInformation(
                                            "Elevator {Id} doors closed",
                                            elevator.Id
                                        );

                                        // After closing doors, check if a destination was selected for the current floor.
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
                                            _logger.LogInformation(
                                                "Elevator {Id} received new destination: {Floor}",
                                                elevator.Id,
                                                updatedCall.DestinationFloor.Value
                                            );
                                            destinations.Add(updatedCall.DestinationFloor.Value);
                                        }

                                        if (destinations.Any())
                                        {
                                            // Sort destinations to find the next logical stop
                                            destinations.Sort();
                                            int nextStop =
                                                (elevator.Direction == Direction.Up)
                                                    ? destinations.First()
                                                    : destinations.Last();

                                            if (elevator.CurrentFloor < nextStop)
                                            {
                                                elevator.Status = ElevatorStatus.MovingUp;
                                                elevator.Direction = Direction.Up;
                                            }
                                            else
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

                        await dbContext.SaveChangesAsync(stoppingToken);
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
