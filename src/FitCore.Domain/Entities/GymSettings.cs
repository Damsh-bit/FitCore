namespace FitCore.Domain.Entities;

public class GymSettings
{
    public int Id { get; set; }

    // Identidad de marca
    public string? NombreGimnasio { get; set; }
    public string? LogoBase64 { get; set; }
    public string? FaviconBase64 { get; set; }

    // Colores y estética — colores en hex (ej "#f97316"), radius/fuente como preset validado server-side.
    public string? ColorPrimario { get; set; }
    public string? ColorSecundario { get; set; }
    public string? ColorAcento { get; set; }
    public string BorderRadius { get; set; } = "lg";
    public string FontFamily { get; set; } = "inter";

    // Estilo de los avatares generados (DiceBear) para clientes y usuarios sin foto propia.
    public string AvatarStyle { get; set; } = "avataaars";

    // Comunicación al cliente
    public string? MensajeBienvenida { get; set; }
    public string? Telefono { get; set; }
    public string? Whatsapp { get; set; }
    public string? Email { get; set; }
    public string? InstagramUrl { get; set; }
    public string? FacebookUrl { get; set; }
    public string? TiktokUrl { get; set; }

    // Visibilidad de reportes opcionales (true = visible). Ingresos y Morosidad son siempre visibles.
    // Default true para no romper instalaciones existentes al migrar.
    public bool ReporteOcupacionHabilitado { get; set; } = true;
    public bool ReporteContableHabilitado { get; set; } = true;
}
