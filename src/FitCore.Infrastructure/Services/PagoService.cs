using FitCore.Application.DTOs;
using FitCore.Domain.Entities;
using FitCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace FitCore.Infrastructure.Services;

public class PagoService
{
    private readonly AppDbContext _context;
    private readonly UserManager<AppUser> _userManager;

    public PagoService(AppDbContext context, UserManager<AppUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<PagoResponse> Crear(CrearPagoRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
            throw new Exception("Usuario no encontrado");

        var hoy = DateTime.UtcNow;
        int periodoMes = request.PeriodoMes ?? hoy.Month;
        int periodoAnio = request.PeriodoAnio ?? hoy.Year;

        // Validar que el período no sea más de 3 meses atrás
        var periodoSolicitado = new DateTime(periodoAnio, periodoMes, 1, 0, 0, 0, DateTimeKind.Utc);
        var limiteMinimo = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-3);
        var limiteMaximo = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        if (periodoSolicitado < limiteMinimo)
            throw new Exception("Solo se pueden registrar pagos de los últimos 3 meses.");

        if (periodoSolicitado > limiteMaximo)
            throw new Exception("No se pueden registrar pagos de meses futuros.");

        // Verificar que no haya pago para ese período
        var yaExiste = await _context.Pagos.AnyAsync(p =>
            p.UserId == request.UserId &&
            p.PeriodoMes == periodoMes &&
            p.PeriodoAnio == periodoAnio);

        if (yaExiste)
            throw new Exception($"Ya existe un pago registrado para {NombreMes(periodoMes, periodoAnio)}.");

        // Obtener la membresía del cliente (por id si viene provisto, o la activa/última)
        var membresia = request.MembresiaId.HasValue
            ? await _context.Membresias
                .Include(m => m.Plan)
                .FirstOrDefaultAsync(m => m.Id == request.MembresiaId.Value && m.UserId == request.UserId)
            : await _context.Membresias
                .Include(m => m.Plan)
                .Where(m => m.UserId == request.UserId && m.Activa && m.FechaFin >= hoy)
                .OrderByDescending(m => m.FechaFin)
                .FirstOrDefaultAsync();

        if (membresia == null)
        {
            membresia = await _context.Membresias
                .Include(m => m.Plan)
                .Where(m => m.UserId == request.UserId)
                .OrderByDescending(m => m.FechaFin)
                .FirstOrDefaultAsync();
        }

        if (membresia == null)
            throw new Exception("El cliente no tiene una membresía activa ni registrada.");

        if (request.Monto.HasValue && request.Monto.Value <= 0)
            throw new Exception("El monto a pagar debe ser mayor a cero.");

        decimal montoFinal = (request.Monto.HasValue && request.Monto.Value > 0)
            ? request.Monto.Value
            : membresia.Plan.Precio;

        // Componer nota predeterminada con mes y plan
        string nombreMes = NombreMes(periodoMes, periodoAnio);
        if (!string.IsNullOrEmpty(nombreMes))
            nombreMes = char.ToUpper(nombreMes[0]) + nombreMes[1..];

        string planTexto = !string.IsNullOrWhiteSpace(membresia.Plan?.Nombre)
            ? $" - Plan {membresia.Plan.Nombre}"
            : "";
        string notaBase = $"Cuota {nombreMes}{planTexto}";

        string notaFinal;
        if (!string.IsNullOrWhiteSpace(request.Nota))
        {
            string notaLimpia = request.Nota.Trim();
            if (notaLimpia.StartsWith(notaBase, StringComparison.OrdinalIgnoreCase) ||
                notaLimpia.Contains($"Cuota {nombreMes}", StringComparison.OrdinalIgnoreCase))
            {
                notaFinal = notaLimpia;
            }
            else
            {
                notaFinal = $"{notaBase} | {notaLimpia}";
            }
        }
        else
        {
            notaFinal = notaBase;
        }

        var pago = new Pago
        {
            UserId = request.UserId,
            MembresiaId = membresia.Id,
            Monto = montoFinal,
            Metodo = request.Metodo,
            Nota = notaFinal,
            Fecha = DateTime.UtcNow,
            PeriodoMes = periodoMes,
            PeriodoAnio = periodoAnio,
        };

        _context.Pagos.Add(pago);
        await _context.SaveChangesAsync();

        return new PagoResponse
        {
            Id = pago.Id,
            UserId = pago.UserId,
            ClienteNombre = $"{user.Nombre} {user.Apellido}",
            ClienteTelefono = user.Telefono,
            PlanNombre = membresia?.Plan?.Nombre,
            Monto = pago.Monto,
            Metodo = pago.Metodo,
            Fecha = pago.Fecha,
            Nota = pago.Nota,
            PeriodoMes = pago.PeriodoMes,
            PeriodoAnio = pago.PeriodoAnio,
        };
    }

    public async Task<List<PagoResponse>> GetAll()
    {
        return await _context.Pagos
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Membresia).ThenInclude(m => m.Plan)
            .OrderByDescending(p => p.Fecha)
            .Select(p => new PagoResponse
            {
                Id = p.Id,
                UserId = p.UserId,
                ClienteNombre = p.User != null ? $"{p.User.Nombre} {p.User.Apellido}" : "Cliente Desconocido",
                ClienteTelefono = p.User != null ? p.User.Telefono : null,
                PlanNombre = p.Membresia != null && p.Membresia.Plan != null ? p.Membresia.Plan.Nombre : null,
                Monto = p.Monto,
                Metodo = p.Metodo,
                Fecha = p.Fecha,
                Nota = p.Nota,
                PeriodoMes = p.PeriodoMes,
                PeriodoAnio = p.PeriodoAnio,
            })
            .ToListAsync();
    }

    public async Task<List<EstadoCuentaDto>> GetEstadoCuenta()
    {
        var hoy = DateTime.UtcNow;

        // Generar los últimos 3 meses incluyendo el actual
        var periodos = Enumerable.Range(0, 3)
            .Select(i => {
                var d = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                return (Mes: d.Month, Anio: d.Year);
            })
            .OrderBy(p => p.Anio).ThenBy(p => p.Mes)
            .ToList();

        // Clientes con membresía activa: una sola consulta con el Usuario y el
        // Plan ya incluidos (antes eran 3 round trips separados: ids, clientes
        // y membresías).
        var membresias = await _context.Membresias
            .AsNoTracking()
            .Include(m => m.User)
            .Include(m => m.Plan)
            .Where(m => m.Activa && m.FechaFin >= hoy && m.User.Activo)
            .ToListAsync();

        var clientes = membresias
            .Select(m => m.User)
            .DistinctBy(u => u.Id)
            .ToList();

        var clienteIds = clientes.Select(c => c.Id).ToList();

        // Pagos en los últimos 3 meses para estos clientes
        var periodoMinMes = periodos.First().Mes;
        var periodoMinAnio = periodos.First().Anio;

        var pagos = await _context.Pagos
            .AsNoTracking()
            .Where(p => clienteIds.Contains(p.UserId) &&
                        (p.PeriodoAnio > periodoMinAnio ||
                        (p.PeriodoAnio == periodoMinAnio && p.PeriodoMes >= periodoMinMes)))
            .ToListAsync();

        return clientes.Select(c =>
        {
            var membresia = membresias.FirstOrDefault(m => m.UserId == c.Id);
            var pagosCliente = pagos.Where(p => p.UserId == c.Id).ToList();

            var detallePeriodos = periodos.Select(p =>
            {
                var pago = pagosCliente.FirstOrDefault(x => x.PeriodoMes == p.Mes && x.PeriodoAnio == p.Anio);
                return new PeriodoEstado
                {
                    Mes = p.Mes,
                    Anio = p.Anio,
                    NombreMes = NombreMes(p.Mes, p.Anio),
                    Pagado = pago is not null,
                    Monto = pago?.Monto,
                    Metodo = pago?.Metodo,
                    FechaPago = pago?.Fecha,
                };
            }).ToList();

            // Tiene deuda si algún mes anterior al actual no está pagado
            var mesesAnteriores = detallePeriodos
                .Where(p => !(p.Mes == hoy.Month && p.Anio == hoy.Year))
                .ToList();

            bool tieneDeuda = mesesAnteriores.Any(p => !p.Pagado);
            bool mesActualPagado = detallePeriodos
                .Any(p => p.Mes == hoy.Month && p.Anio == hoy.Year && p.Pagado);

            string estadoGeneral = tieneDeuda ? "ConDeuda"
                : mesActualPagado ? "AlDia"
                : "PendienteMesActual"; // Membresía activa, sin deuda, pero aún no pagó este mes

            return new EstadoCuentaDto
            {
                UserId = c.Id,
                Nombre = $"{c.Nombre} {c.Apellido}",
                Email = c.Email ?? string.Empty,
                Telefono = c.Telefono,
                MembresiaId = membresia?.Id,
                PlanNombre = membresia?.Plan?.Nombre,
                PlanPrecio = membresia?.Plan?.Precio,
                MembresiaVence = membresia?.FechaFin,
                EstadoGeneral = estadoGeneral,
                Periodos = detallePeriodos,
            };
        })
        .OrderBy(e => e.EstadoGeneral) // ConDeuda primero
        .ToList();
    }

    private static string NombreMes(int mes, int anio)
    {
        var fecha = new DateTime(anio, mes, 1);
        return fecha.ToString("MMMM yyyy", new CultureInfo("es-AR"));
    }
}