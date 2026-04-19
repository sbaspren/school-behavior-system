using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SchoolBehaviorSystem.Domain.Entities;
using SchoolBehaviorSystem.Domain.Interfaces;

namespace SchoolBehaviorSystem.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly int _tenantId = 1;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContextAccessor = null) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
        // ★ يقرأ tenant_id من JWT مباشرة — بدون ITenantService لتجنب circular dependency
        // Single-Tenant الآن: إذا لم يوجد claim → يستخدم 1
        // Multi-Tenant لاحقاً: الـ claim يُضاف تلقائياً من AuthService
        var claim = httpContextAccessor?.HttpContext?.User?.FindFirst("tenant_id");
        if (claim != null && int.TryParse(claim.Value, out var tid))
            _tenantId = tid;
    }

    /// <summary>
    /// ★ يرجع TenantId الفعال — يفضل HttpContext.Items["OverrideTenantId"] على JWT
    /// يُستخدم في public endpoints (نموذج المعلم) لتحديد Tenant بدون JWT
    /// </summary>
    private int GetEffectiveTenantId()
    {
        // ★ أولاً: تحقق من override (يُستخدم في public endpoints)
        if (_httpContextAccessor?.HttpContext?.Items.TryGetValue("OverrideTenantId", out var overrideObj) == true
            && overrideObj is int overrideTid)
            return overrideTid;

        return _tenantId;
    }

    // Core
    public DbSet<SchoolSettings> SchoolSettings => Set<SchoolSettings>();
    public DbSet<StageConfig> StageConfigs => Set<StageConfig>();
    public DbSet<GradeConfig> GradeConfigs => Set<GradeConfig>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<Committee> Committees => Set<Committee>();
    public DbSet<CommitteeMember> CommitteeMembers => Set<CommitteeMember>();
    public DbSet<CommitteeMeeting> CommitteeMeetings => Set<CommitteeMeeting>();
    public DbSet<Subject> Subjects => Set<Subject>();

    // Students
    public DbSet<Student> Students => Set<Student>();

    // Records
    public DbSet<Violation> Violations => Set<Violation>();
    public DbSet<ViolationTypeDef> ViolationTypeDefs => Set<ViolationTypeDef>();
    public DbSet<TardinessRecord> TardinessRecords => Set<TardinessRecord>();
    public DbSet<PermissionRecord> PermissionRecords => Set<PermissionRecord>();
    public DbSet<DailyAbsence> DailyAbsences => Set<DailyAbsence>();
    public DbSet<CumulativeAbsence> CumulativeAbsences => Set<CumulativeAbsence>();
    public DbSet<EducationalNote> EducationalNotes => Set<EducationalNote>();
    public DbSet<PositiveBehavior> PositiveBehaviors => Set<PositiveBehavior>();
    public DbSet<CommunicationLog> CommunicationLogs => Set<CommunicationLog>();

    // Support
    public DbSet<NoteTypeDef> NoteTypeDefs => Set<NoteTypeDef>();
    public DbSet<ParentExcuse> ParentExcuses => Set<ParentExcuse>();
    public DbSet<ParentAccessCode> ParentAccessCodes => Set<ParentAccessCode>();
    public DbSet<WhatsAppSession> WhatsAppSessions => Set<WhatsAppSession>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<WhatsAppSettings> WhatsAppSettings => Set<WhatsAppSettings>();
    public DbSet<LinkedPerson> LinkedPersons => Set<LinkedPerson>();

    // Templates
    public DbSet<MessageTemplate> MessageTemplates => Set<MessageTemplate>();

    // Academic
    public DbSet<AcademicSummary> AcademicSummaries => Set<AcademicSummary>();
    public DbSet<AcademicGrade> AcademicGrades => Set<AcademicGrade>();

    // Tenant / License
    public DbSet<Tenant> Tenants => Set<Tenant>();

    // Academic Calendar (عام — بدون TenantId)
    public DbSet<AcademicCalendar> AcademicCalendars => Set<AcademicCalendar>();

    // ── Auto-set TenantId on new entities ──
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var effectiveTid = GetEffectiveTenantId();
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            // ★ دائماً نعيّن TenantId للكيانات الجديدة — يستخدم Override إذا موجود
            if (entry.State == EntityState.Added)
                entry.Entity.TenantId = effectiveTid;
        }
        return await base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // SchoolSettings - single row
        modelBuilder.Entity<SchoolSettings>(e =>
        {
            e.ToTable("school_settings");
            e.HasKey(x => x.Id);
        });

        // StageConfig
        modelBuilder.Entity<StageConfig>(e =>
        {
            e.ToTable("stage_configs");
            e.HasKey(x => x.Id);
            e.HasMany(x => x.Grades).WithOne(x => x.StageConfig).HasForeignKey(x => x.StageConfigId);
        });

        modelBuilder.Entity<GradeConfig>(e =>
        {
            e.ToTable("grade_configs");
            e.HasKey(x => x.Id);
        });

        // Users
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenLink).IsUnique();
        });

        // Teachers
        modelBuilder.Entity<Teacher>(e =>
        {
            e.ToTable("teachers");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.CivilId).IsUnique();
        });

        // Students
        modelBuilder.Entity<Student>(e =>
        {
            e.ToTable("students");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.StudentNumber);
            e.HasIndex(x => new { x.Stage, x.Grade, x.Class });
        });

        // Violations
        modelBuilder.Entity<Violation>(e =>
        {
            e.ToTable("violations");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        modelBuilder.Entity<ViolationTypeDef>(e =>
        {
            e.ToTable("violation_type_defs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
        });

        // Tardiness
        modelBuilder.Entity<TardinessRecord>(e =>
        {
            e.ToTable("tardiness_records");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        // Permissions
        modelBuilder.Entity<PermissionRecord>(e =>
        {
            e.ToTable("permission_records");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        // Daily Absence
        modelBuilder.Entity<DailyAbsence>(e =>
        {
            e.ToTable("daily_absences");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            // ★ Optional FK — يسمح بـ StudentId=0 لسجلات "لا يوجد غائب" (NO_ABSENCE)
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).IsRequired(false);
        });

        // Cumulative Absence
        modelBuilder.Entity<CumulativeAbsence>(e =>
        {
            e.ToTable("cumulative_absences");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.StudentId, x.Stage, x.Semester, x.AcademicYear }).IsUnique();
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        // Educational Notes
        modelBuilder.Entity<EducationalNote>(e =>
        {
            e.ToTable("educational_notes");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        // Positive Behavior
        modelBuilder.Entity<PositiveBehavior>(e =>
        {
            e.ToTable("positive_behaviors");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.HijriDate });
            e.HasIndex(x => x.RecordedAt);
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
            e.HasOne(x => x.LinkedViolation).WithMany().HasForeignKey(x => x.LinkedViolationId).OnDelete(DeleteBehavior.SetNull);
        });

        // Communication Log
        modelBuilder.Entity<CommunicationLog>(e =>
        {
            e.ToTable("communication_logs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Stage, x.MiladiDate });
            e.HasIndex(x => new { x.Semester, x.AcademicYear });
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });

        // Support tables
        modelBuilder.Entity<Committee>(e =>
        {
            e.ToTable("committees");
            e.HasMany(x => x.MembersList).WithOne(x => x.Committee).HasForeignKey(x => x.CommitteeId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Meetings).WithOne(x => x.Committee).HasForeignKey(x => x.CommitteeId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<CommitteeMember>(e =>
        {
            e.ToTable("committee_members");
            e.HasKey(x => x.Id);
        });
        modelBuilder.Entity<CommitteeMeeting>(e =>
        {
            e.ToTable("committee_meetings");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CommitteeId, x.MeetingNumber });
        });
        modelBuilder.Entity<Subject>(e => { e.ToTable("subjects"); });
        modelBuilder.Entity<NoteTypeDef>(e => { e.ToTable("note_type_defs"); });
        modelBuilder.Entity<ParentExcuse>(e =>
        {
            e.ToTable("parent_excuses");
            e.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId);
        });
        modelBuilder.Entity<ParentAccessCode>(e =>
        {
            e.ToTable("parent_access_codes");
            e.HasIndex(x => x.Code).IsUnique();
        });
        modelBuilder.Entity<WhatsAppSession>(e =>
        {
            e.ToTable("whatsapp_sessions");
            // ★ العلاقة مع User: حذف المستخدم يحذف جلساته تلقائياً
            e.HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired(false);
            e.HasIndex(s => s.UserId);
        });
        modelBuilder.Entity<AuditLog>(e => { e.ToTable("audit_logs"); });
        modelBuilder.Entity<WhatsAppSettings>(e => { e.ToTable("whatsapp_settings"); });
        modelBuilder.Entity<MessageTemplate>(e =>
        {
            e.ToTable("message_templates");
            e.HasIndex(x => x.Type).IsUnique();
        });
        modelBuilder.Entity<LinkedPerson>(e =>
        {
            e.ToTable("linked_persons");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Phone, x.Type });
        });

        // ── Tenant table ──
        modelBuilder.Entity<Tenant>(e =>
        {
            e.ToTable("tenants");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<AcademicCalendar>(e =>
        {
            e.ToTable("academic_calendars");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.AcademicYear).IsUnique();
        });

        // ══════════════════════════════════════════════════
        // Global Query Filters — كل Entity يُفلتر بـ TenantId تلقائياً
        // الآن: _tenantId = 1 دائماً (Single-Tenant)
        // لاحقاً: _tenantId يُقرأ من JWT (Multi-Tenant) بدون تعديل أي Controller
        // ══════════════════════════════════════════════════
        modelBuilder.Entity<User>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<Student>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<Teacher>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<Violation>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<SchoolSettings>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<StageConfig>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<WhatsAppSession>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<WhatsAppSettings>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<Subject>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<AcademicGrade>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<AcademicSummary>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<AuditLog>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<Committee>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<CommitteeMember>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<CommitteeMeeting>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<CommunicationLog>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<CumulativeAbsence>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<DailyAbsence>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<EducationalNote>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<LinkedPerson>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<MessageTemplate>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<ParentAccessCode>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<ParentExcuse>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<PermissionRecord>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<PositiveBehavior>().HasQueryFilter(e => e.TenantId == _tenantId);
        modelBuilder.Entity<TardinessRecord>().HasQueryFilter(e => e.TenantId == _tenantId);
    }
}
