using System.Security.Claims;
using FitCore.Domain.Entities;
using FitCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitCore.Api.Controllers;

[Authorize(Roles = "Admin,Entrenador")]
[ApiController]
[Route("api/[controller]")]
[Route("api/clientes")] // Alias para retrocompatibilidad
public class UsuariosController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _context;

    public UsuariosController(UserManager<AppUser> userManager, AppDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    // GET api/usuarios?categoria=Cliente&activo=true
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Categoria? categoria = null,
        [FromQuery] bool? activo = null)
    {
        var query = _userManager.Users.AsNoTracking().AsQueryable();

        if (categoria.HasValue)
            query = query.Where(u => u.Categoria == categoria.Value);

        if (activo.HasValue)
            query = query.Where(u => u.Activo == activo.Value);

        var usuarios = await query.ToListAsync();

        // Traer membresías activas de los usuarios filtrados
        var hoy = DateTime.UtcNow;
        var userIds = usuarios.Select(u => u.Id).ToList();

        var membresiasActivas = await _context.Membresias
            .AsNoTracking()
            .Include(m => m.Plan)
            .Where(m => userIds.Contains(m.UserId) && m.Activa && m.FechaFin >= hoy)
            .ToListAsync();

        // Traer total aportado (pagos acumulados) por usuario
        var pagosPorUsuario = await _context.Pagos
            .AsNoTracking()
            .Where(p => userIds.Contains(p.UserId))
            .GroupBy(p => p.UserId)
            .Select(g => new { UserId = g.Key, TotalMonto = g.Sum(p => p.Monto) })
            .ToDictionaryAsync(x => x.UserId, x => x.TotalMonto);

        // Traer métricas de asistencia por usuario
        var hace30Dias = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var asistenciasStats = await _context.Asistencias
            .AsNoTracking()
            .Where(a => userIds.Contains(a.UserId))
            .GroupBy(a => a.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Total = g.Count(),
                Ultimos30Dias = g.Count(a => a.Fecha >= hace30Dias),
                Ultima = g.Max(a => (DateOnly?)a.Fecha)
            })
            .ToDictionaryAsync(x => x.UserId);

        var result = usuarios.Select(u =>
        {
            var mem = membresiasActivas.FirstOrDefault(m => m.UserId == u.Id);
            pagosPorUsuario.TryGetValue(u.Id, out var totalPagado);
            asistenciasStats.TryGetValue(u.Id, out var asis);
            return ToDto(
                u,
                mem,
                totalPagado,
                asis?.Total ?? 0,
                asis?.Ultimos30Dias ?? 0,
                asis?.Ultima
            );
        });

        return Ok(result);
    }

    // GET api/usuarios/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var hoy = DateTime.UtcNow;
        var mem = await _context.Membresias
            .AsNoTracking()
            .Include(m => m.Plan)
            .Where(m => m.UserId == id && m.Activa && m.FechaFin >= hoy)
            .FirstOrDefaultAsync();

        var totalPagado = await _context.Pagos
            .AsNoTracking()
            .Where(p => p.UserId == id)
            .SumAsync(p => (decimal?)p.Monto) ?? 0;

        var hace30Dias = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var totalAsistencias = await _context.Asistencias
            .AsNoTracking()
            .Where(a => a.UserId == id)
            .CountAsync();

        var asistenciasUltimos30Dias = await _context.Asistencias
            .AsNoTracking()
            .Where(a => a.UserId == id && a.Fecha >= hace30Dias)
            .CountAsync();

        var ultimaAsistencia = await _context.Asistencias
            .AsNoTracking()
            .Where(a => a.UserId == id)
            .MaxAsync(a => (DateOnly?)a.Fecha);

        return Ok(ToDto(user, mem, totalPagado, totalAsistencias, asistenciasUltimos30Dias, ultimaAsistencia));
    }

    // GET api/usuarios/activos/count?categoria=Cliente
    [HttpGet("activos/count")]
    public async Task<IActionResult> GetActivosCount([FromQuery] Categoria? categoria = null)
    {
        var query = _userManager.Users.Where(u => u.Activo);

        if (categoria.HasValue)
            query = query.Where(u => u.Categoria == categoria.Value);

        var count = await query.CountAsync();
        return Ok(new { total = count });
    }

    // POST api/usuarios
    [HttpPost]
    public async Task<IActionResult> Create(CreateUsuarioDto dto)
    {
        var userExistente = await _userManager.FindByEmailAsync(dto.Email);
        if (userExistente is not null)
            return Conflict(new { mensaje = "Ya existe un usuario con ese email." });

        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            Nombre = dto.Nombre,
            Apellido = dto.Apellido ?? string.Empty,
            Telefono = dto.Telefono ?? string.Empty,
            Categoria = dto.Categoria,
            Activo = true,
        };

        var password = dto.Password ?? $"Temp_{Guid.NewGuid():N}!1A";
        var resultado = await _userManager.CreateAsync(user, password);

        if (!resultado.Succeeded)
            return BadRequest(new { errores = resultado.Errors.Select(e => e.Description) });

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToDto(user, null));
    }

    // PUT api/usuarios/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, UpdateUsuarioDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.Nombre = dto.Nombre;
        user.Apellido = dto.Apellido ?? user.Apellido;
        user.Telefono = dto.Telefono ?? user.Telefono;
        user.Email = dto.Email;
        user.UserName = dto.Email;
        user.Categoria = dto.Categoria;
        user.Activo = dto.Activo;
        user.AptoMedicoVence = dto.AptoMedicoVence;
        user.ContactoEmergenciaNombre = dto.ContactoEmergenciaNombre;
        user.ContactoEmergenciaTelefono = dto.ContactoEmergenciaTelefono;
        user.ContactoEmergenciaRelacion = dto.ContactoEmergenciaRelacion;

        var resultado = await _userManager.UpdateAsync(user);
        if (!resultado.Succeeded)
            return BadRequest(new { errores = resultado.Errors.Select(e => e.Description) });

        return NoContent();
    }

    // DELETE api/usuarios/{id} → soft delete
    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.Activo = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    // DELETE api/usuarios/{id}/permanente → hard delete
    [HttpDelete("{id}/permanente")]
    public async Task<IActionResult> HardDelete(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var resultado = await _userManager.DeleteAsync(user);
        if (!resultado.Succeeded)
            return BadRequest(new { errores = resultado.Errors.Select(e => e.Description) });

        return NoContent();
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private static UsuarioDto ToDto(
        AppUser u,
        Membresia? membresiaActiva,
        decimal totalPagado = 0,
        int totalAsistencias = 0,
        int asistenciasUltimos30Dias = 0,
        DateOnly? ultimaAsistencia = null) => new(
        u.Id,
        u.Nombre,
        u.Apellido,
        u.Telefono,
        u.Email ?? string.Empty,
        u.FechaAlta,
        u.Activo,
        u.Categoria,
        membresiaActiva?.PlanId,
        membresiaActiva?.Plan?.Nombre,
        membresiaActiva?.FechaFin,
        u.AptoMedicoVence,
        u.ContactoEmergenciaNombre,
        u.ContactoEmergenciaTelefono,
        u.ContactoEmergenciaRelacion,
        totalPagado,
        totalAsistencias,
        asistenciasUltimos30Dias,
        ultimaAsistencia
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record UsuarioDto(
    string Id,
    string Nombre,
    string Apellido,
    string Telefono,
    string Email,
    DateTime FechaAlta,
    bool Activo,
    FitCore.Domain.Entities.Categoria Categoria,
    int? PlanId,
    string? PlanNombre,
    DateTime? MembresiaVence,
    DateOnly? AptoMedicoVence,
    string? ContactoEmergenciaNombre = null,
    string? ContactoEmergenciaTelefono = null,
    string? ContactoEmergenciaRelacion = null,
    decimal TotalPagado = 0,
    int TotalAsistencias = 0,
    int AsistenciasUltimos30Dias = 0,
    DateOnly? UltimaAsistencia = null
);

public record CreateUsuarioDto(
    string Nombre,
    string? Apellido,
    string? Telefono,
    string Email,
    string? Password,
    FitCore.Domain.Entities.Categoria Categoria
);

public record UpdateUsuarioDto(
    string Nombre,
    string? Apellido,
    string? Telefono,
    string Email,
    bool Activo,
    FitCore.Domain.Entities.Categoria Categoria,
    DateOnly? AptoMedicoVence = null,
    string? ContactoEmergenciaNombre = null,
    string? ContactoEmergenciaTelefono = null,
    string? ContactoEmergenciaRelacion = null
);

public record UpdateMiPerfilDto(
    string? Telefono,
    string? ContactoEmergenciaNombre,
    string? ContactoEmergenciaTelefono,
    string? ContactoEmergenciaRelacion,
    DateOnly? AptoMedicoVence
);

