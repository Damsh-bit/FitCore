using FitCore.Application.DTOs;
using FitCore.Domain.Entities;
using FitCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitCore.Api.Controllers;

[ApiController]
[Route("api/gymsettings")]
public class GymSettingsController : ControllerBase
{
    // El logo/favicon se cargan en cada page load (sidebar + login), a diferencia de
    // las fotos de progreso — el límite es más chico: ~700KB de imagen equivalen a
    // ~950K caracteres en base64.
    private const int MaxImagenBase64Length = 950_000;
    private static readonly HashSet<string> FuentesValidas = new() { "inter", "geist", "system" };
    private static readonly HashSet<string> RadiosValidos = new() { "none", "sm", "md", "lg" };
    private static readonly HashSet<string> AvatarStylesValidos = new() { "avataaars", "notionists", "personas", "open-peeps" };

    private readonly AppDbContext _context;

    public GymSettingsController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/gymsettings — público: Login lo necesita antes de autenticar
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _context.GymSettings.FirstOrDefaultAsync();
        return Ok(settings is null ? DefaultDto() : ToDto(settings));
    }

    // PUT api/gymsettings — upsert de la única fila
    [Authorize(Roles = "Admin,Entrenador")]
    [HttpPut]
    public async Task<IActionResult> Actualizar(ActualizarGymSettingsDto dto)
    {
        if (!FuentesValidas.Contains(dto.FontFamily))
            return BadRequest(new { mensaje = "La fuente seleccionada no es válida." });

        if (!RadiosValidos.Contains(dto.BorderRadius))
            return BadRequest(new { mensaje = "El radio de bordes seleccionado no es válido." });

        if (!AvatarStylesValidos.Contains(dto.AvatarStyle))
            return BadRequest(new { mensaje = "El estilo de avatar seleccionado no es válido." });

        if ((dto.LogoBase64?.Length ?? 0) > MaxImagenBase64Length ||
            (dto.FaviconBase64?.Length ?? 0) > MaxImagenBase64Length)
            return BadRequest(new { mensaje = "El logo o el favicon superan el tamaño máximo permitido (700KB)." });

        var settings = await _context.GymSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new GymSettings();
            _context.GymSettings.Add(settings);
        }

        settings.NombreGimnasio = string.IsNullOrWhiteSpace(dto.NombreGimnasio) ? null : dto.NombreGimnasio.Trim();
        settings.LogoBase64 = dto.LogoBase64;
        settings.FaviconBase64 = dto.FaviconBase64;
        settings.ColorPrimario = dto.ColorPrimario;
        settings.ColorSecundario = dto.ColorSecundario;
        settings.ColorAcento = dto.ColorAcento;
        settings.BorderRadius = dto.BorderRadius;
        settings.FontFamily = dto.FontFamily;
        settings.AvatarStyle = dto.AvatarStyle;
        settings.MensajeBienvenida = string.IsNullOrWhiteSpace(dto.MensajeBienvenida) ? null : dto.MensajeBienvenida.Trim();
        settings.Telefono = dto.Telefono;
        settings.Whatsapp = dto.Whatsapp;
        settings.Email = dto.Email;
        settings.InstagramUrl = dto.InstagramUrl;
        settings.FacebookUrl = dto.FacebookUrl;
        settings.TiktokUrl = dto.TiktokUrl;
        settings.ReporteOcupacionHabilitado = dto.ReporteOcupacionHabilitado;
        settings.ReporteContableHabilitado = dto.ReporteContableHabilitado;

        await _context.SaveChangesAsync();
        return Ok(ToDto(settings));
    }

    private static GymSettingsDto ToDto(GymSettings s) => new(
        s.NombreGimnasio, s.LogoBase64, s.FaviconBase64,
        s.ColorPrimario, s.ColorSecundario, s.ColorAcento,
        s.BorderRadius, s.FontFamily, s.AvatarStyle, s.MensajeBienvenida,
        s.Telefono, s.Whatsapp, s.Email,
        s.InstagramUrl, s.FacebookUrl, s.TiktokUrl,
        s.ReporteOcupacionHabilitado, s.ReporteContableHabilitado);

    private static GymSettingsDto DefaultDto() => new(
        null, null, null, null, null, null, "lg", "inter", "avataaars", null, null, null, null, null, null, null,
        true, true);
}
