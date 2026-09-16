import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";

type Plan = {
  id: number;
  nombre: string;
  precio: number;
};

export default function NuevoCliente() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
  });
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/planes")
      .then((res) => res.json())
      .then((data) => setPlanes(data))
      .catch(() => {/* si falla, simplemente no hay planes */});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear el cliente (categoría Cliente)
      const response = await apiFetch("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ ...form, categoria: 2 }),
      });

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error al crear cliente",
          description: "Hubo un problema al crear el cliente. Por favor, intenta nuevamente.",
        });
        return;
      }

      const nuevoCliente = await response.json();

      // 2. Si se seleccionó un plan, crear la membresía
      if (planId) {
        const membresiaRes = await apiFetch("/api/membresias", {
          method: "POST",
          body: JSON.stringify({ userId: nuevoCliente.id, planId: parseInt(planId) }),
        });

        if (!membresiaRes.ok) {
          // El cliente se creó pero la membresía falló
          toast({
            variant: "destructive",
            title: "Cliente creado, pero no se pudo asignar el plan",
            description: "Podés asignarle el plan desde el panel de clientes.",
          });
          setTimeout(() => navigate("/clientes"), 1500);
          return;
        }
      }

      toast({
        variant: "success",
        title: "Cliente creado exitosamente",
        description: planId
          ? `El cliente ${form.nombre} fue agregado con el plan asignado.`
          : `El cliente ${form.nombre} ha sido agregado correctamente.`,
      });
      setForm({ nombre: "", telefono: "", email: "" });
      setTimeout(() => navigate("/clientes"), 1500);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al crear cliente",
        description: "Hubo un problema al crear el cliente. Por favor, intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo Cliente</CardTitle>
          <CardDescription>
            Completa el formulario para agregar un nuevo cliente al sistema.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Ingresa el nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                placeholder="Ingresa el teléfono"
                value={form.telefono}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ingresa el email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Plan opcional */}
            <div className="space-y-2">
              <Label htmlFor="plan">
                Plan{" "}
                <span className="text-muted-foreground font-normal text-sm">(opcional)</span>
              </Label>
              <Select
                value={planId}
                onValueChange={(val) => setPlanId(val === "ninguno" ? "" : val)}
                disabled={loading || planes.length === 0}
              >
                <SelectTrigger id="plan">
                  <SelectValue placeholder={planes.length === 0 ? "Cargando planes..." : "Sin plan asignado"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin plan</SelectItem>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre} — ${p.precio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clientes")}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? "Guardando..." : "Guardar cliente"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
