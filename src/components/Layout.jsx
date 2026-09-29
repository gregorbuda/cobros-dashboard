import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const rolLabels = {
  vendedor: 'Vendedor',
  gerente_ventas: 'Gerente de Ventas',
  gerente_cobranzas: 'Gerente de Cobranzas',
}

export default function Layout({ children }) {
  const { profile, session, signOut } = useAuth()
  const location = useLocation()
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickFuera(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const navItems = (() => {
    if (profile?.rol === 'admin') {
      return [
        { path: '/usuarios', label: 'Usuarios' },
        { path: '/configuracion', label: 'Configuración' },
      ]
    }
    if (profile?.rol === 'analista_cxp' || profile?.rol === 'gerente_cxp') {
      return [
        { path: '/cuentas-por-pagar', label: 'Cuentas por Pagar' },
        { path: '/proveedores', label: 'Proveedores' },
      ]
    }
return [
  { path: '/', label: 'Resumen' },
  { path: '/ventas', label: 'Ventas' },
  {
    label: 'Cartera y Cobranza',
    dropdown: [
      { path: '/riesgo', label: 'Riesgo de Cartera' },
      { path: '/cobranza', label: 'Efectividad de Cobranza' },
      { path: '/cartera', label: 'Cartera de Facturas' },
      { path: '/cobros', label: 'Cobros Reportados' },
    ],
  },
  { path: '/pedidos', label: 'Pedidos' },
  { path: '/productos', label: 'Productos' },
  ...(profile?.rol === 'vendedor' ? [{ path: '/recordatorios', label: 'Recordatorios' }] : []),
]
  })()

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>Suite de Gestión Administrativa</h1>
          <nav style={styles.nav}>
            {navItems.map((item) =>
              item.dropdown ? (
                <div key={item.label} style={styles.dropdownWrapper} ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownAbierto(!dropdownAbierto)}
                    style={{
                      ...styles.navLink,
                      ...styles.dropdownTrigger,
                      ...(item.dropdown.some((d) => d.path === location.pathname) ? styles.navLinkActive : {}),
                    }}
                  >
                    {item.label} <span style={styles.dropdownArrow}>{dropdownAbierto ? '▲' : '▼'}</span>
                  </button>
                  {dropdownAbierto && (
                    <div style={styles.dropdownMenu}>
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setDropdownAbierto(false)}
                          style={{
                            ...styles.dropdownItem,
                            ...(location.pathname === sub.path ? styles.dropdownItemActive : {}),
                          }}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navLink,
                    ...(location.pathname === item.path ? styles.navLinkActive : {}),
                  }}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.roleTag}>
            {session?.user?.email} · {rolLabels[profile?.rol] || ''}
          </span>
          <button onClick={signOut} style={styles.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main style={styles.main}>{children}</main>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '16px',
    fontWeight: 600,
  },
  nav: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  navLinkActive: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  dropdownWrapper: {
    position: 'relative',
  },
  dropdownTrigger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dropdownArrow: {
    fontSize: '9px',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '6px',
    minWidth: '180px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    zIndex: 100,
  },
  dropdownItem: {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    padding: '8px 10px',
    borderRadius: '6px',
  },
  dropdownItemActive: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  roleTag: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '7px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: {
    padding: '32px',
  },
}