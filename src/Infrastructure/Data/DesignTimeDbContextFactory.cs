using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SchoolBehaviorSystem.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        // Connection string for design-time only (migrations)
        optionsBuilder.UseMySql(
            "Server=localhost;Port=3306;Database=schoolbehaviorsystem;User=root;Password=Admin123;",
            ServerVersion.AutoDetect("Server=localhost;Port=3306;Database=schoolbehaviorsystem;User=root;Password=Admin123;"));

        return new AppDbContext(optionsBuilder.Options);
    }
}
