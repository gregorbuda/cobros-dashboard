import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const UMBRAL_BAJO_STOCK = 20
const REGISTROS_POR_PAGINA = 10

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .schema('cobros_demo')
      .from('sinv_productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) console.error(error)
    setProductos(data || [])
    setLoading(false)
  }

  // --- Métricas ---
  const productosActivos = productos.filter((p) => p.activo)
  const valorTotalInventario = productosActivos.reduce((sum, p) => sum + Number(p.precio) * Number(p.stock_disponible), 0)
  const productosBajoStock = productosActivos.filter((p) => Number(p.stock_disponible) < UMBRAL_BAJO_STOCK)
  const productosSinStock = productosActivos.filter((p) => Number(p.stock_disponible) === 0)

  const dataStockPorProducto = productosActivos
    .map((p) => ({ nombre: p.nombre, stock: Number(p.stock_disponible) }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)

  // --- Paginación ---
  const totalPaginas = Math.ceil(productos.length / REGISTROS_POR_PAGINA) || 1
  const productosPaginados = productos.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando productos...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Productos e Inventario</h2>
      <p style={styles.subtitle}>Catálogo sincronizado desde el ERP. Precios, stock y estado son de solo lectura.</p>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Valor total de inventario</p>
          <p style={styles.metricValue}>${valorTotalInventario.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Productos activos</p>
          <p style={styles.metricValue}>{productosActivos.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Bajo stock (&lt;{UMBRAL_BAJO_STOCK})</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>{productosBajoStock.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Sin stock</p>
          <p style={{ ...styles.metricValue, color: 'var(--danger)' }}>{productosSinStock.length}</p>
        </div>
      </div>

      <div style={styles.chartCard}>
        <p style={styles.chartTitle}>Productos con menor stock</p>
        {dataStockPorProducto.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataStockPorProducto} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="nombre" type="category" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="stock">
                {dataStockPorProducto.map((entry, index) => (
                  <Cell key={index} fill={entry.stock === 0 ? 'var(--danger)' : entry.stock < UMBRAL_BAJO_STOCK ? 'var(--warning)' : 'var(--accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={styles.muted}>Sin productos activos.</p>
        )}
      </div>

      <h3 style={styles.sectionTitle}>Catálogo</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Precio</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Unidad</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {productosPaginados.map((p) => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>{p.codigo}</td>
                <td style={styles.td}>{p.nombre}</td>
                <td style={styles.td}>${p.precio}</td>
                <td style={{ ...styles.td, color: Number(p.stock_disponible) === 0 ? 'var(--danger)' : Number(p.stock_disponible) < UMBRAL_BAJO_STOCK ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {p.stock_disponible}
                </td>
                <td style={styles.td}>{p.unidad_medida}</td>
                <td style={styles.td}>
                  <span style={{ color: p.activo ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productos.length === 0 && <p style={styles.muted}>No hay productos registrados.</p>}
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
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginTop: '28px', marginBottom: '12px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  metricCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '16px' },
  metricLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' },
  metricValue: { fontSize: '22px', fontWeight: 700 },
  chartCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '24px' },
  chartTitle: { fontSize: '14px', fontWeight: 500, marginBottom: '8px' },
  tableWrapper: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500 },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 16px', fontSize: '14px' },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
}