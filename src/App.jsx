import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Resumen from './pages/Resumen'
import Cobros from './pages/Cobros'
import ClienteDetalle from './pages/ClienteDetalle'
import VendedorDetalle from './pages/VendedorDetalle'
import Riesgo from './pages/Riesgo'
import Cobranza from './pages/Cobranza'
import Recordatorios from './pages/Recordatorios'
import Usuarios from './pages/Usuarios'
import CuentasPorPagar from './pages/CuentasPorPagar'
import Configuracion from './pages/Configuracion'
import Pedidos from './pages/Pedidos'
import Productos from './pages/Productos'
import Proveedores from './pages/Proveedores'
import Ventas from './pages/Ventas'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Cargando...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function InicioPorRol() {
  const { profile } = useAuth()

  if (profile?.rol === 'admin') {
    return <Navigate to="/usuarios" replace />
  }
  if (profile?.rol === 'analista_cxp' || profile?.rol === 'gerente_cxp') {
    return <Navigate to="/cuentas-por-pagar" replace />
  }

  return <Resumen />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <InicioPorRol />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cartera"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cobros"
        element={
          <ProtectedRoute>
            <Cobros />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/:id"
        element={
          <ProtectedRoute>
            <ClienteDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendedor/:id"
        element={
          <ProtectedRoute>
            <VendedorDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/riesgo"
        element={
          <ProtectedRoute>
            <Riesgo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cobranza"
        element={
          <ProtectedRoute>
            <Cobranza />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recordatorios"
        element={
          <ProtectedRoute>
            <Recordatorios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
        <ProtectedRoute>
          <Pedidos />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ventas"
      element={
      <ProtectedRoute>
        <Ventas />
      </ProtectedRoute>
      }
    />
    <Route
        path="/productos"
        element={
        <ProtectedRoute>
          <Productos />
        </ProtectedRoute>
      }
    />
    <Route
        path="/proveedores"
        element={
        <ProtectedRoute>
          <Proveedores />
        </ProtectedRoute>
      }
    />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cuentas-por-pagar"
        element={
          <ProtectedRoute>
            <CuentasPorPagar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <Configuracion />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}