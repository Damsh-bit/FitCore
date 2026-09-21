namespace FitCore.Application.DTOs;

public record GymSettingsDto(
    string? NombreGimnasio,
    string? LogoBase64,
    string? FaviconBase64,
    string? ColorPrimario,
    string? ColorSecundario,
    string? ColorAcento,
    string BorderRadius,
    string FontFamily,
    string AvatarStyle,
    string? MensajeBienvenida,
    string? Telefono,
    string? Whatsapp,
    string? Email,
    string? InstagramUrl,
    string? FacebookUrl,
    string? TiktokUrl,
    bool ReporteOcupacionHabilitado,
    bool ReporteContableHabilitado
);

public record ActualizarGymSettingsDto(
    string? NombreGimnasio,
    string? LogoBase64,
    string? FaviconBase64,
    string? ColorPrimario,
    string? ColorSecundario,
    string? ColorAcento,
    string BorderRadius,
    string FontFamily,
    string AvatarStyle,
    string? MensajeBienvenida,
    string? Telefono,
    string? Whatsapp,
    string? Email,
    string? InstagramUrl,
    string? FacebookUrl,
    string? TiktokUrl,
    bool ReporteOcupacionHabilitado,
    bool ReporteContableHabilitado
);
