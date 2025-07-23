using Microsoft.AspNetCore.SignalR;

namespace ElevatorApi.Hubs
{
    public class ElevatorHub : Hub
    {
        public async Task JoinBuildingGroup(string buildingId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"building-{buildingId}");
        }
    }
}