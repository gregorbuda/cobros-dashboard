import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

const estadoColors = {
  pendiente: 'var(--warning)',
  verificado: 'var(--success)',
  rechazado: 'var(--danger)',
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState([])
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    const { data: facturasData } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')
      .eq('cliente_id', id)
      .order('fecha_vencimiento', { ascending: true })

    setFacturas(facturasData || [])

    if (facturasData && facturasData.length > 0) {
      const facturaIds = facturasData.map((f) => f.factura_id)
      const { data: cobrosData } = await supabase
        .schema('cobros_demo')
        .from('scxc_cobros')
        .select('*')
        .in('factura_id', facturaIds)
        .order('fecha_cobro', { ascending: false })

      setCobros(cobrosData || [])
    }

    setLoading(false)
  }

  async function verComprobante(path) {
    if (!path) return
    const cleanPath = path.replace(/^comprobantes-pago\//, '')
    const { data, error } = await supabase.storage
      .from('comprobantes-pago')
      .createSignedUrl(cleanPath, 3600)

    if (error) {
      alert('No se pudo generar el link del comprobante.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const nombreCliente = facturas[0]?.cliente || 'Cliente'
  const nombreVendedor = facturas[0]?.vendedor || '—'
  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const totalPagado = totalFacturado - totalPendiente

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

      <h2 style={styles.title}>{nombreCliente}</h2>
      <p style={styles.subtitle}>Vendedor asignado: {nombreVendedor}</p>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Facturado</p>
          <p style={styles.metricValue}>${totalFacturado.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Pagado</p>
          <p style={{ ...styles.metricValue, color: 'var(--success)' }}>
            ${totalPagado.toLocaleString()}
          </p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Pendiente</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>
            ${totalPendiente.toLocaleString()}
          </p>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Facturas</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Factura</th>
              <th style={styles.th}>Vencimiento</th>
              <th style={styles.th}>Monto Total</th>
              <th style={styles.th}>Saldo Pendiente</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.factura_id} style={styles.tr}>
                <td style={styles.td}>{f.numero_factura}</td>
                <td style={styles.td}>{f.fecha_vencimiento}</td>
                <td style={styles.td}>${f.monto_total}</td>
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

      <h3 style={styles.sectionTitle}>Cobros Reportados</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Método</th>
              <th style={styles.th}>Referencia</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {cobros.map((c) => (
              <tr key={c.id} style={styles.tr}>
                <td style={styles.td}>{c.fecha_cobro}</td>
                <td style={styles.td}>${c.monto}</td>
                <td style={styles.td}>{c.metodo_pago}</td>
                <td style={styles.td}>{c.referencia}</td>
                <td style={styles.td}>
                  <span style={{ color: estadoColors[c.estado_verificacion] }}>
                    {c.estado_verificacion}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => verComprobante(c.url_comprobante)} style={styles.linkButton}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cobros.length === 0 && <p style={styles.muted}>Sin cobros reportados.</p>}
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
    marginTop: '8px',
  },
  tableWrapper: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    marginBottom: '28px',
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
  linkButton: {
    backgroundColor: 'transparent',
    color: 'var(--accent)',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}