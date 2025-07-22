using ElevatorApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace ElevatorApi.Data // <-- Note the updated namespace
{
    public class ElevatorDbContext : DbContext
    {
        public ElevatorDbContext(DbContextOptions<ElevatorDbContext> options) : base(options) {}

        public DbSet<User> Users { get; set; }
        public DbSet<Building> Buildings { get; set; }
        public DbSet<Elevator> Elevators { get; set; }
        public DbSet<ElevatorCall> ElevatorCalls { get; set; }
        public DbSet<ElevatorCallAssignment> ElevatorCallAssignments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ElevatorCallAssignment>()
                .HasOne(a => a.Elevator)
                .WithMany(e => e.ElevatorCallAssignments)
                .HasForeignKey(a => a.ElevatorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}