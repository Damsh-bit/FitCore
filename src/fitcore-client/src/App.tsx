import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { GymSettingsProvider } from "@/context/GymSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import NuevoCliente from "./pages/NuevoCliente";
import Pagos from "./pages/Pagos";
import Asistencias from "./pages/Asistencias";
import Planes from "./pages/Planes";
import PlanesAdmin from "./pages/PlanesAdmin";
import { Toaster } from "./components/ui/toaster";
import EstadoCuenta from "./pages/EstadoCuenta";
import DashboardCliente from "./pages/DashboardCliente";
import MisAsistencias from "./pages/MisAsistencias";
import MiPerfil from "./pages/MiPerfil";
import MiProgreso from "./pages/MiProgreso";
import ClienteProgreso from "./pages/ClienteProgreso";
import Contabilidad from "./pages/Contabilidad";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <GymSettingsProvider>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Admin / Entrenador */}
          <Route path="/dashboard-admin" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Clientes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clientes/nuevo" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><NuevoCliente /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/pagos" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Pagos /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/estado-cuenta" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><EstadoCuenta /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/asistencias" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Asistencias /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/planes-admin" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><PlanesAdmin /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clientes/:userId/progreso" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><ClienteProgreso /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/contabilidad" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Contabilidad /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reportes" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Reportes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/configuracion" element={
            <ProtectedRoute allowedCategorias={["Admin", "Entrenador"]}>
              <Layout><Configuracion /></Layout>
            </ProtectedRoute>
          } />

          {/* Rutas Cliente */}
          <Route path="/dashboard-cliente" element={
            <ProtectedRoute allowedCategorias={["Cliente"]}>
              <Layout><DashboardCliente /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/mi-membresia" element={
            <ProtectedRoute allowedCategorias={["Cliente"]}>
              <Layout><Planes /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/mis-asistencias" element={
            <ProtectedRoute allowedCategorias={["Cliente"]}>
              <Layout><MisAsistencias /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/mi-perfil" element={
            <ProtectedRoute allowedCategorias={["Cliente"]}>
              <Layout><MiPerfil /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/mi-progreso" element={
            <ProtectedRoute allowedCategorias={["Cliente"]}>
              <Layout><MiProgreso /></Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
      </GymSettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
