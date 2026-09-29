import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import { exportarCSV } from '../utils/exportCSV'

const bucketColors = {
  'Por Vencer': 'var(--text-secondary)',
  '0-21 dias': 'var(--success)',
  '22-60 dias': 'var(--warning)',
  '60-90 dias': 'var(--danger)',
  '+90 dias': 'var(--danger)',
  'Pagada': 'var(--text-muted)',
}

const REGISTROS_POR_PAGINA = 10

export default function Dashboard() {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadFacturas()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroEstado])

  async function loadFacturas() {
    setLoading(true)
    const { data, error } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')
      .order('fecha_vencimiento', { ascending: true })

    if (!error) setFacturas(data)
    setLoading(false)
  }

  const facturasFiltradas = facturas.filter((f) =>
    filtroEstado === 'todos' ? true : f.bucket_aging === filtroEstado
  )

  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const totalVencido = facturas
    .filter((f) => !['Por Vencer', 'Pagada'].includes(f.bucket_aging))
    .reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const moraCritica = facturas.filter((f) =>
    ['60-90 dias', '+90 dias'].includes(f.bucket_aging)
  ).length

  const buckets = ['todos', 'Por Vencer', '0-21 dias', '22-60 dias', '60-90 dias', '+90 dias', 'Pagada']

  // --- Paginación ---
  const totalPaginas = Math.ceil(facturasFiltradas.length / REGISTROS_POR_PAGINA) || 1
  const facturasPaginadas = facturasFiltradas.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  return (
    <Layout>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>Cartera de Facturas</h2>
        <button
          onClick={() =>
            exportarCSV(
              facturasFiltradas.map((f) => ({
                Factura: f.numero_factura,
                Cliente: f.cliente,
                Vendedor: f.vendedor,
                Vencimiento: f.fecha_vencimiento,
                Saldo_Pendiente: f.saldo_pendiente,
                Estado: f.bucket_aging,
              })),
              'cartera_facturas'
            )
          }
          style={styles.exportButton}
        >
          Exportar CSV
        </button>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Facturado</p>
          <p style={styles.metricValue}>${totalFacturado.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Pendiente</p>
          <p style={styles.metricValue}>${totalPendiente.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Vencido</p>
          <p style={{ ...styles.metricValue, color: 'var(--danger)' }}>
            ${totalVencido.toLocaleString()}
          </p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Facturas en Mora Crítica</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>{moraCritica}</p>
        </div>
      </div>

      <div style={styles.filters}>
        {buckets.map((b) => (
          <button
            key={b}
            onClick={() => setFiltroEstado(b)}
            style={{
              ...styles.filterButton,
              ...(filtroEstado === b ? styles.filterButtonActive : {}),
            }}
          >
            {b === 'todos' ? 'Todos' : b}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.muted}>Cargando facturas...</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Factura</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Vendedor</th>
                <th style={styles.th}>Vencimiento</th>
                <th style={styles.th}>Saldo Pendiente</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturasPaginadas.map((f) => (
                <tr key={f.factura_id} style={styles.tr}>
                  <td style={styles.td}>{f.numero_factura}</td>
                  <td style={styles.td}>
                    <Link to={`/cliente/${f.cliente_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {f.cliente}
                    </Link>
                  </td>
                  <td style={styles.td}>
                    <Link to={`/vendedor/${f.vendedor_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {f.vendedor}
                    </Link>
                  </td>
                  <td style={styles.td}>{f.fecha_vencimiento}</td>
                  <td style={styles.td}>${f.saldo_pendiente}</td>
                  <td style={styles.td}>
                    <span style={{ color: bucketColors[f.bucket_aging] || 'var(--text-primary)' }}>
                      {f.bucket_aging}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {facturasFiltradas.length === 0 && (
            <p style={styles.muted}>No hay facturas para este filtro.</p>
          )}
          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPaginaActual}
          />
        </div>
      )}
    </Layout>
  )
}

const styles = {
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
  },
  exportButton: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
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
    padding: '20px',
  },
  metricLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 600,
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    borderColor: 'var(--accent)',
  },
  tableWrapper: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-color)',
    fontWeight: 500,
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
  },
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}