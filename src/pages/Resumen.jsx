import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

const bucketColorMap = {
  'Por Vencer': '#6b7280',
  '0-21 dias': '#10b981',
  '22-60 dias': '#f59e0b',
  '60-90 dias': '#f97316',
  '+90 dias': '#ef4444',
  'Pagada': '#374151',
}

export default function Resumen() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState([])
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroBucket, setFiltroBucket] = useState(null)

  useEffect(() => {
    loadFacturas()
    loadCobros()
  }, [])

  async function loadFacturas() {
    setLoading(true)
    const { data, error } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')

    if (!error) setFacturas(data)
    setLoading(false)
  }

  async function loadCobros() {
    const { data } = await supabase
      .schema('cobros_demo')
      .from('scxc_cobros')
      .select('*')
      .eq('estado_verificacion', 'verificado')

    if (data) setCobros(data)
  }

  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const totalVencido = facturas
    .filter((f) => !['Por Vencer', 'Pagada'].includes(f.bucket_aging))
    .reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const moraCritica = facturas.filter((f) =>
    ['60-90 dias', '+90 dias'].includes(f.bucket_aging)
  ).length

  const dataPorBucket = Object.values(
    facturas.reduce((acc, f) => {
      const key = f.bucket_aging || 'Sin estado'
      if (!acc[key]) acc[key] = { name: key, value: 0 }
      acc[key].value += Number(f.saldo_pendiente)
      return acc
    }, {})
  ).filter((d) => d.value > 0)

  const dataPorVendedor = Object.values(
    facturas.reduce((acc, f) => {
      const key = f.vendedor || 'Sin asignar'
      if (!acc[key]) acc[key] = { name: key, saldo: 0, vendedorId: f.vendedor_id }
      acc[key].saldo += Number(f.saldo_pendiente)
      return acc
    }, {})
  )

  const dataPorCliente = Object.values(
    facturas.reduce((acc, f) => {
      const key = f.cliente || 'Sin asignar'
      if (!acc[key]) acc[key] = { name: key, saldo: 0, clienteId: f.cliente_id }
      acc[key].saldo += Number(f.saldo_pendiente)
      return acc
    }, {})
  )

  const dataPorMes = Object.values(
    cobros.reduce((acc, c) => {
      const mes = c.fecha_cobro?.slice(0, 7)
      if (!acc[mes]) acc[mes] = { mes, total: 0 }
      acc[mes].total += Number(c.monto)
      return acc
    }, {})
  ).sort((a, b) => a.mes.localeCompare(b.mes))

  const esGerente = profile?.rol === 'gerente_ventas' || profile?.rol === 'gerente_cobranzas'

  const facturasFiltradas = filtroBucket
    ? facturas.filter((f) => f.bucket_aging === filtroBucket)
    : []

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando resumen...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Resumen General</h2>

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

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>
            Cartera por Estado de Vencimiento
            {filtroBucket && <span style={styles.filterHint}> (clic de nuevo para quitar filtro)</span>}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dataPorBucket}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `$${entry.value.toLocaleString()}`}
                cursor="pointer"
                onClick={(entry) => setFiltroBucket(entry.name === filtroBucket ? null : entry.name)}
              >
                {dataPorBucket.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={bucketColorMap[entry.name] || '#3b82f6'}
                    opacity={filtroBucket && filtroBucket !== entry.name ? 0.4 : 1}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {esGerente ? (
          <div style={styles.chartCard}>
            <p style={styles.chartTitle}>Saldo Pendiente por Vendedor</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dataPorVendedor}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar
                  dataKey="saldo"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => navigate(`/vendedor/${data.vendedorId}`)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={styles.chartCard}>
            <p style={styles.chartTitle}>Saldo Pendiente por Cliente</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dataPorCliente}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar
                  dataKey="saldo"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => navigate(`/cliente/${data.clienteId}`)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ ...styles.chartCard, marginBottom: '24px' }}>
        <p style={styles.chartTitle}>Evolución de Cobros Verificados</p>
        {dataPorMes.length === 0 ? (
          <p style={styles.muted}>Aún no hay cobros verificados registrados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dataPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {filtroBucket && (
        <div style={styles.filteredSection}>
          <h3 style={styles.sectionTitle}>
            Facturas — {filtroBucket} ({facturasFiltradas.length})
          </h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Factura</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Vendedor</th>
                  <th style={styles.th}>Vencimiento</th>
                  <th style={styles.th}>Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((f) => (
                  <tr key={f.factura_id} style={styles.tr}>
                    <td style={styles.td}>{f.numero_factura}</td>
                    <td style={styles.td}>
                      <Link to={`/cliente/${f.cliente_id}`} style={styles.link}>
                        {f.cliente}
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <Link to={`/vendedor/${f.vendedor_id}`} style={styles.link}>
                        {f.vendedor}
                      </Link>
                    </td>
                    <td style={styles.td}>{f.fecha_vencimiento}</td>
                    <td style={styles.td}>${f.saldo_pendiente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}

const styles = {
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '20px',
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
  chartTitle: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '12px',
  },
  filterHint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  filteredSection: {
    marginTop: '8px',
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