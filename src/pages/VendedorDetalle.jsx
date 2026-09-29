import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'

const bucketColors = {
  'Por Vencer': 'var(--text-secondary)',
  '0-21 dias': 'var(--success)',
  '22-60 dias': 'var(--warning)',
  '60-90 dias': 'var(--danger)',
  '+90 dias': 'var(--danger)',
  'Pagada': 'var(--text-muted)',
}

export default function VendedorDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')
      .eq('vendedor_id', id)
      .order('fecha_vencimiento', { ascending: true })

    setFacturas(data || [])
    setLoading(false)
  }

  const nombreVendedor = facturas[0]?.vendedor || 'Vendedor'
  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const totalVencido = facturas
    .filter((f) => !['Por Vencer', 'Pagada'].includes(f.bucket_aging))
    .reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)

  const clientesUnicos = [...new Map(facturas.map((f) => [f.cliente_id, f.cliente])).entries()]

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Volver
      </button>

      <h2 style={styles.title}>{nombreVendedor}</h2>
      <p style={styles.subtitle}>{clientesUnicos.length} clientes asignados</p>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Facturado</p>
          <p style={styles.metricValue}>${totalFacturado.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Pendiente</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>
            ${totalPendiente.toLocaleString()}
          </p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Vencido</p>
          <p style={{ ...styles.metricValue, color: 'var(--danger)' }}>
            ${totalVencido.toLocaleString()}
          </p>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Cartera de Clientes</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Factura</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Vencimiento</th>
              <th style={styles.th}>Saldo Pendiente</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.factura_id} style={styles.tr}>
                <td style={styles.td}>{f.numero_factura}</td>
                <td style={styles.td}>
                  <Link to={`/cliente/${f.cliente_id}`} style={styles.link}>
                    {f.cliente}
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
      </div>
    </Layout>
  )
}

const styles = {
  backButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '16px',
    padding: 0,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '28px',
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
    fontSize: '22px',
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '12px',
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
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
  },
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}