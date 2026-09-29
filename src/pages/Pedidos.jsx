import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const REGISTROS_POR_PAGINA = 10

export default function Pedidos() {
  const { profile } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pedidoExpandido, setPedidoExpandido] = useState(null)
  const [filtro, setFiltro] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtro])

  async function loadData() {
    setLoading(true)

    let query = supabase
      .schema('cobros_demo')
      .from('solicitudes_pedido')
      .select('*, scxc_clientes(nombre), sven_vendedores(nombre)')
      .order('fecha_solicitud', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error(error)
    }

    setPedidos(data || [])
    setLoading(false)
  }

  function toggleExpandir(id) {
    setPedidoExpandido(pedidoExpandido === id ? null : id)
  }

  function estadoBadgeColor(estado) {
    if (estado === 'aprobado') return 'var(--success)'
    if (estado === 'rechazado') return 'var(--danger)'
    return 'var(--warning)'
  }

  function getItems(p) {
    return typeof p.items === 'string' ? JSON.parse(p.items) : p.items
  }

  function aplicaFiltro(p) {
    if (!filtro) return true
    if (filtro.tipo === 'estado') return p.estado === filtro.valor
    if (filtro.tipo === 'cliente') return p.scxc_clientes?.nombre === filtro.valor
    if (filtro.tipo === 'vendedor') return p.sven_vendedores?.nombre === filtro.valor
    if (filtro.tipo === 'producto') {
      const items = getItems(p)
      return items?.some((i) => i.nombre === filtro.valor)
    }
    return true
  }

  const pedidosFiltrados = pedidos.filter(aplicaFiltro)

  // --- Métricas (sobre datos filtrados) ---
  const pendientes = pedidosFiltrados.filter((p) => p.estado === 'pendiente')
  const aprobados = pedidosFiltrados.filter((p) => p.estado === 'aprobado')
  const rechazados = pedidosFiltrados.filter((p) => p.estado === 'rechazado')
  const montoPendiente = pendientes.reduce((sum, p) => sum + Number(p.monto_total), 0)
  const tasaAprobacion = (aprobados.length + rechazados.length) > 0
    ? Math.round((aprobados.length / (aprobados.length + rechazados.length)) * 100)
    : 0

  const dataEstadoPedidos = [
    { name: 'Pendiente', value: pendientes.length, color: 'var(--warning)' },
    { name: 'Aprobado', value: aprobados.length, color: 'var(--success)' },
    { name: 'Rechazado', value: rechazados.length, color: 'var(--danger)' },
  ].filter((d) => d.value > 0)

  const productosContador = {}
  pedidosFiltrados.forEach((p) => {
    getItems(p)?.forEach((item) => {
      if (!productosContador[item.nombre]) productosContador[item.nombre] = 0
      productosContador[item.nombre] += Number(item.cantidad)
    })
  })
  const dataProductos = Object.entries(productosContador)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  const clientesContador = {}
  pedidosFiltrados.forEach((p) => {
    const nombre = p.scxc_clientes?.nombre || 'Sin cliente'
    clientesContador[nombre] = (clientesContador[nombre] || 0) + Number(p.monto_total)
  })
  const dataClientes = Object.entries(clientesContador)
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5)

  const vendedoresContador = {}
  pedidosFiltrados.forEach((p) => {
    const nombre = p.sven_vendedores?.nombre || 'Sin vendedor'
    vendedoresContador[nombre] = (vendedoresContador[nombre] || 0) + Number(p.monto_total)
  })
  const dataVendedores = Object.entries(vendedoresContador)
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto)

  // --- Paginación ---
  const totalPaginas = Math.ceil(pedidosFiltrados.length / REGISTROS_POR_PAGINA) || 1
  const pedidosPaginados = pedidosFiltrados.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando pedidos...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={styles.titleRow}>
        <div>
          <h2 style={styles.title}>Pedidos</h2>
          <p style={styles.subtitle}>Solicitudes de pedido de clientes y su estado de aprobación.</p>
        </div>
        {filtro && (
          <div style={styles.filterChip}>
            <span>Filtrando por: {filtro.label}</span>
            <button onClick={() => setFiltro(null)} style={styles.filterChipClose}>×</button>
          </div>
        )}
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Pedidos pendientes</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>{pendientes.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Monto en pedidos pendientes</p>
          <p style={styles.metricValue}>${montoPendiente.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Tasa de aprobación</p>
          <p style={styles.metricValue}>{tasaAprobacion}%</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total de pedidos</p>
          <p style={styles.metricValue}>{pedidosFiltrados.length}</p>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Estado de los pedidos</p>
          {dataEstadoPedidos.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dataEstadoPedidos}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label
                  style={{ cursor: 'pointer' }}
                  onClick={(entry) => setFiltro({ tipo: 'estado', valor: entry.name.toLowerCase(), label: `Estado: ${entry.name}` })}
                >
                  {dataEstadoPedidos.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.muted}>Sin pedidos para este filtro.</p>
          )}
        </div>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Productos más pedidos</p>
          {dataProductos.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataProductos}>
                <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="cantidad"
                  fill="var(--accent)"
                  style={{ cursor: 'pointer' }}
                  onClick={(entry) => setFiltro({ tipo: 'producto', valor: entry.nombre, label: `Producto: ${entry.nombre}` })}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.muted}>Sin datos para este filtro.</p>
          )}
        </div>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Pedidos por cliente (monto)</p>
          {dataClientes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataClientes}>
                <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="monto"
                  fill="#8b5cf6"
                  style={{ cursor: 'pointer' }}
                  onClick={(entry) => setFiltro({ tipo: 'cliente', valor: entry.nombre, label: `Cliente: ${entry.nombre}` })}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.muted}>Sin datos para este filtro.</p>
          )}
        </div>
        {profile?.rol !== 'vendedor' && (
          <div style={styles.chartCard}>
            <p style={styles.chartTitle}>Pedidos por vendedor (monto)</p>
            {dataVendedores.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataVendedores}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="monto"
                    fill="#0ea5e9"
                    style={{ cursor: 'pointer' }}
                    onClick={(entry) => setFiltro({ tipo: 'vendedor', valor: entry.nombre, label: `Vendedor: ${entry.nombre}` })}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={styles.muted}>Sin datos para este filtro.</p>
            )}
          </div>
        )}
      </div>

      <h3 style={styles.sectionTitle}>Listado de Pedidos</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}>Cliente</th>
              {profile?.rol !== 'vendedor' && <th style={styles.th}>Vendedor</th>}
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Monto Total</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {pedidosPaginados.map((p) => {
              const items = getItems(p)
              return (
                <>
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <button onClick={() => toggleExpandir(p.id)} style={styles.expandButton}>
                        {pedidoExpandido === p.id ? '▼' : '▶'}
                      </button>
                    </td>
                    <td style={styles.td}>{p.scxc_clientes?.nombre || '—'}</td>
                    {profile?.rol !== 'vendedor' && <td style={styles.td}>{p.sven_vendedores?.nombre || '—'}</td>}
                    <td style={styles.td}>{new Date(p.fecha_solicitud).toLocaleDateString()}</td>
                    <td style={styles.td}>${p.monto_total}</td>
                    <td style={styles.td}>
                      <span style={{ color: estadoBadgeColor(p.estado), fontWeight: 500, textTransform: 'capitalize' }}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                  {pedidoExpandido === p.id && (
                    <tr>
                      <td colSpan={profile?.rol !== 'vendedor' ? 6 : 5} style={styles.detalleCell}>
                        <table style={styles.tablaDetalle}>
                          <thead>
                            <tr>
                              <th style={styles.thDetalle}>Producto</th>
                              <th style={styles.thDetalle}>Cantidad</th>
                              <th style={styles.thDetalle}>Precio Unit.</th>
                              <th style={styles.thDetalle}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items?.map((item, idx) => (
                              <tr key={idx}>
                                <td style={styles.tdDetalle}>{item.nombre}</td>
                                <td style={styles.tdDetalle}>{item.cantidad}</td>
                                <td style={styles.tdDetalle}>${item.precio_unitario}</td>
                                <td style={styles.tdDetalle}>${item.subtotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {pedidosFiltrados.length === 0 && <p style={styles.muted}>No hay pedidos para este filtro.</p>}
        <Pagination
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          onCambiarPagina={setPaginaActual}
        />
      </div>
    </Layout>
  )
}

const styles = {
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)' },
  filterChip: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'var(--accent)', color: 'white',
    padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
  },
  filterChipClose: {
    background: 'none', border: 'none', color: 'white', fontSize: '16px',
    cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginTop: '28px', marginBottom: '12px' },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '16px',
  },
  metricLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' },
  metricValue: { fontSize: '22px', fontWeight: 700 },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  chartCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '20px',
  },
  chartTitle: { fontSize: '14px', fontWeight: 500, marginBottom: '8px' },
  tableWrapper: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500,
  },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 16px', fontSize: '14px' },
  expandButton: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px',
  },
  detalleCell: {
    padding: '0 16px 16px 48px',
    backgroundColor: 'var(--bg-tertiary)',
  },
  tablaDetalle: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  thDetalle: {
    textAlign: 'left', padding: '8px 12px', fontSize: '11px',
    color: 'var(--text-secondary)', fontWeight: 500,
  },
  tdDetalle: { padding: '6px 12px', fontSize: '13px' },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
}