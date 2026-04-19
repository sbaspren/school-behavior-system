using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SchoolBehaviorSystem.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
            ?? "Server=localhost;Port=3306;Database=design_time;User=root;Password=unused;";
        // ★ نستخدم ServerVersion ثابت (لا AutoDetect) لنتجنب الاتصال الفعلي وقت التصميم.
        optionsBuilder.UseMySql(
            connectionString,
            ServerVersion.Create(10, 6, 0, Pomelo.EntityFrameworkCore.MySql.Infrastructure.ServerType.MariaDb));

        return new AppDbContext(optionsBuilder.Options);
    }
}
