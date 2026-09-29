import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'

export default function Riesgo() {
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFacturas()
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

  // Top 5 clientes con mayor saldo vencido (excluye Por Vencer y Pagada)
  const saldoVencidoPorCliente = Object.values(
    facturas
      .filter((f) => !['Por Vencer', 'Pagada'].includes(f.bucket_aging))
      .reduce((acc, f) => {
        const key = f.cliente || 'Sin asignar'
        if (!acc[key]) acc[key] = { name: key, saldo: 0, clienteId: f.cliente_id }
        acc[key].saldo += Number(f.saldo_pendiente)
        return acc
      }, {})
  )
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)

  // Top 5 facturas más vencidas (mayor días de vencimiento)
  const facturasMasVencidas = [...facturas]
    .filter((f) => !['Por Vencer', 'Pagada'].includes(f.bucket_aging))
    .sort((a, b) => Number(b.dias_vencido) - Number(a.dias_vencido))
    .slice(0, 5)

  // Proyección de vencimientos próximos
  const hoy = new Date()
  const diasHasta = (fecha) => {
    const d = new Date(fecha)
    return Math.ceil((d - hoy) / (1000 * 60 * 60 * 24))
  }

  const proximasAVencer = facturas.filter((f) => {
    if (f.bucket_aging !== 'Por Vencer') return false
    const dias = diasHasta(f.fecha_vencimiento)
    return dias >= 0 && dias <= 30
  })

  const en7dias = proximasAVencer.filter((f) => diasHasta(f.fecha_vencimiento) <= 7)
  const en15dias = proximasAVencer.filter((f) => diasHasta(f.fecha_vencimiento) <= 15)
  const en30dias = proximasAVencer

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando análisis de riesgo...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Riesgo de Cartera</h2>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Vence en 7 días</p>
          <p style={styles.metricValue}>
            ${en7dias.reduce((s, f) => s + Number(f.saldo_pendiente), 0).toLocaleString()}
          </p>
          <p style={styles.metricSub}>{en7dias.length} facturas</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Vence en 15 días</p>
          <p style={styles.metricValue}>
            ${en15dias.reduce((s, f) => s + Number(f.saldo_pendiente), 0).toLocaleString()}
          </p>
          <p style={styles.metricSub}>{en15dias.length} facturas</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricValue}>
            ${en30dias.reduce((s, f) => s + Number(f.saldo_pendiente), 0).toLocaleString()}
          </p>
          <p style={styles.metricLabel}>Vence en 30 días</p>
          <p style={styles.metricSub}>{en30dias.length} facturas</p>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Top 5 Clientes con Mayor Mora</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={saldoVencidoPorCliente} layout="vertical">
              <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={12} width={140} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar
                dataKey="saldo"
                fill="#ef4444"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => navigate(`/cliente/${data.clienteId}`)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Top 5 Facturas Más Vencidas</p>
          <div style={styles.miniTableWrapper}>
            {facturasMasVencidas.map((f) => (
              <Link key={f.factura_id} to={`/cliente/${f.cliente_id}`} style={styles.miniRow}>
                <div>
                  <p style={styles.miniRowMain}>{f.numero_factura}</p>
                  <p style={styles.miniRowSub}>{f.cliente}</p>
                </div>
                <div style={styles.miniRowRight}>
                  <p style={styles.miniRowMain}>${f.saldo_pendiente}</p>
                  <p style={{ ...styles.miniRowSub, color: 'var(--danger)' }}>
                    {f.dias_vencido} días vencida
                  </p>
                </div>
              </Link>
            ))}
            {facturasMasVencidas.length === 0 && (
              <p style={styles.muted}>No hay facturas vencidas.</p>
            )}
          </div>
        </div>
      </div>
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
    gridTemplateColumns: 'repeat(3, 1fr)',
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
    fontSize: '22px',
    fontWeight: 600,
  },
  metricSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
  miniTableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  miniRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: 'inherit',
    backgroundColor: 'var(--bg-tertiary)',
  },
  miniRowMain: {
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  miniRowSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  miniRowRight: {
    textAlign: 'right',
  },
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}