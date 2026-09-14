using FitCore.Domain.Entities;
using FitCore.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitCore.Api.Controllers;

[Authorize(Roles = "Admin,Entrenador")]
[ApiController]
[Route("api/[controller]")]
public class PlanesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlanesController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/planes
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var hoy = DateTime.UtcNow;
        var planes = await _context.Planes
            .AsNoTracking()
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Precio,
                p.DuracionEnDias,
                p.Activo,
                SociosActivos = p.Membresias.Count(m => m.Activa && m.FechaFin >= hoy && m.User.Activo)
            })
            .ToListAsync();
        return Ok(planes);
    }

    // POST api/planes/ajuste-masivo
    [HttpPost("ajuste-masivo")]
    public async Task<IActionResult> AjusteMasivo([FromBody] AjusteMasivoRequest request)
    {
        if (request.Porcentaje == 0)
            return BadRequest(new { message = "El porcentaje debe ser distinto de cero." });

        var planesActivos = await _context.Planes
            .Where(p => p.Activo)
            .ToListAsync();

        foreach (var plan in planesActivos)
        {
            decimal nuevoPrecio = plan.Precio * (1 + (request.Porcentaje / 100m));
            if (request.RedondearACien)
            {
                nuevoPrecio = Math.Round(nuevoPrecio / 100m, MidpointRounding.AwayFromZero) * 100m;
            }
            else
            {
                nuevoPrecio = Math.Round(nuevoPrecio, 2);
            }
            plan.Precio = Math.Max(0, nuevoPrecio);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Se actualizaron {planesActivos.Count} planes con un {request.Porcentaje}% de aumento.", actualizados = planesActivos.Count });
    }

    // GET api/planes/2
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var plan = await _context.Planes.FindAsync(id);
        if (plan is null) return NotFound();
        return Ok(plan);
    }

    // POST api/planes
    [HttpPost]
    public async Task<IActionResult> Create(Plan plan)
    {
        _context.Planes.Add(plan);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, plan);
    }

    // PUT api/planes/2
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Plan plan)
    {
        if (id != plan.Id) return BadRequest();
        _context.Entry(plan).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/planes/2
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await _context.Planes.FindAsync(id);
        if (plan is null) return NotFound();
        plan.Activo = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class AjusteMasivoRequest
{
    public decimal Porcentaje { get; set; }
    public bool RedondearACien { get; set; } = true;
}
