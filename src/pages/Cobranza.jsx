import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import DateRangeFilter from '../components/DateRangeFilter'

const estadoColorMap = {
  verificado: '#10b981',
  pendiente: '#f59e0b',
  rechazado: '#ef4444',
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hace90DiasISO() {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

export default function Cobranza() {
  const [facturas, setFacturas] = useState([])
  const [cobros, setCobros] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(hace90DiasISO())
  const [hasta, setHasta] = useState(hoyISO())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: facturasData } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')

    const { data: cobrosData } = await supabase
      .schema('cobros_demo')
      .from('scxc_cobros')
      .select('*')

    setFacturas(facturasData || [])
    setCobros(cobrosData || [])
    setLoading(false)
  }

  const cobrosEnRango = cobros.filter(
    (c) => c.fecha_cobro >= desde && c.fecha_cobro <= hasta
  )

  const facturasConSaldo = facturas.filter((f) => Number(f.saldo_pendiente) > 0)
  const dso =
    facturasConSaldo.length > 0
      ? Math.round(
          facturasConSaldo.reduce((sum, f) => sum + Number(f.dias_vencido || 0), 0) /
            facturasConSaldo.length
        )
      : 0

  const cobrosVerificados = cobrosEnRango.filter((c) => c.estado_verificacion === 'verificado')
  const porMes = cobrosVerificados.reduce((acc, c) => {
    const mes = c.fecha_cobro?.slice(0, 7)
    if (!acc[mes]) acc[mes] = 0
    acc[mes] += Number(c.monto)
    return acc
  }, {})
  const mesesOrdenados = Object.keys(porMes).sort()
  const mesActual = mesesOrdenados[mesesOrdenados.length - 1]
  const mesAnterior = mesesOrdenados[mesesOrdenados.length - 2]
  const totalMesActual = porMes[mesActual] || 0
  const totalMesAnterior = porMes[mesAnterior] || 0
  const variacion =
    totalMesAnterior > 0
      ? Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100)
      : null

  const dataEstados = ['verificado', 'pendiente', 'rechazado']
    .map((estado) => ({
      name: estado.charAt(0).toUpperCase() + estado.slice(1),
      value: cobrosEnRango.filter((c) => c.estado_verificacion === estado).length,
      key: estado,
    }))
    .filter((d) => d.value > 0)

  const totalCobrosReportados = cobrosEnRango.length
  const tasaRechazo =
    totalCobrosReportados > 0
      ? Math.round(
          (cobrosEnRango.filter((c) => c.estado_verificacion === 'rechazado').length /
            totalCobrosReportados) *
            100
        )
      : 0

  // DSO y cobro por vendedor
  const dsoPorVendedor = Object.values(
    facturasConSaldo.reduce((acc, f) => {
      const key = f.vendedor || 'Sin asignar'
      if (!acc[key]) acc[key] = { name: key, dias: [], count: 0 }
      acc[key].dias.push(Number(f.dias_vencido || 0))
      acc[key].count += 1
      return acc
    }, {})
  ).map((v) => ({
    name: v.name,
    dso: Math.round(v.dias.reduce((s, d) => s + d, 0) / v.dias.length),
  }))

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando análisis de cobranza...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Efectividad de Cobranza</h2>

      <DateRangeFilter desde={desde} hasta={hasta} onDesdeChange={setDesde} onHastaChange={setHasta} />

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>DSO (Días Promedio de Cobro)</p>
          <p style={styles.metricValue}>{dso} días</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Cobrado este mes (en rango)</p>
          <p style={styles.metricValue}>${totalMesActual.toLocaleString()}</p>
          {variacion !== null && (
            <p
              style={{
                ...styles.metricSub,
                color: variacion >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {variacion >= 0 ? '↑' : '↓'} {Math.abs(variacion)}% vs mes anterior
            </p>
          )}
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Tasa de Rechazo (en rango)</p>
          <p style={{ ...styles.metricValue, color: tasaRechazo > 20 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {tasaRechazo}%
          </p>
          <p style={styles.metricSub}>{totalCobrosReportados} cobros reportados</p>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Estado de Cobros Reportados (en rango)</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dataEstados}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(entry) => `${entry.value}`}
              >
                {dataEstados.map((entry) => (
                  <Cell key={entry.key} fill={estadoColorMap[entry.key]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Cobrado por Mes (en rango)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mesesOrdenados.map((m) => ({ mes: m, total: porMes[m] }))}>
              <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...styles.chartCard, marginTop: '16px' }}>
        <p style={styles.chartTitle}>DSO por Vendedor</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dsoPorVendedor}>
            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip formatter={(value) => `${value} días`} />
            <Bar dataKey="dso" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
    marginTop: '4px',
    color: 'var(--text-muted)',
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
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}