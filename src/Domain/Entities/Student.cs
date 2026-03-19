using SchoolBehaviorSystem.Domain.Enums;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Domain.Entities;

public class Student : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; } = 1;
    public string StudentNumber { get; set; } = "";     // رقم الطالب
    public string Name { get; set; } = "";              // اسم الطالب
    public Stage Stage { get; set; }                    // المرحلة
    public string Grade { get; set; } = "";             // الصف
    public string Class { get; set; } = "";             // الفصل
    public string Mobile { get; set; } = "";            // رقم الجوال (ولي الأمر)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
