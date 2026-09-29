import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const MES_NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const COLORES_DONA = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444']
const REGISTROS_POR_PAGINA = 10

export default function Ventas() {
  const [facturas, setFacturas] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear().toString())
  const [mes, setMes] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [anio, mes])

  async function loadData() {
    setLoading(true)
    const { data: facturasData, error: errorFacturas } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('factura_id, numero_factura, cliente, vendedor, monto_total, fecha_emision')

    const { data: itemsData, error: errorItems } = await supabase
      .schema('cobros_demo')
      .from('scxc_facturas_items')
      .select('*')

    if (errorFacturas) console.error(errorFacturas)
    if (errorItems) console.error(errorItems)

    setFacturas(facturasData || [])
    setItems(itemsData || [])
    setLoading(false)
  }

  const aniosDisponibles = [...new Set(facturas.map((f) => f.fecha_emision?.slice(0, 4)))].filter(Boolean).sort().reverse()

  const facturasDelAnio = facturas.filter((f) => f.fecha_emision?.startsWith(anio))

  const facturasFiltradas = facturasDelAnio.filter((f) => {
    if (mes === 'todos') return true
    const fMes = f.fecha_emision.split('-')[1]
    return fMes === mes
  })

  // --- KPIs ---
  const totalFacturado = facturasFiltradas.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const numFacturas = facturasFiltradas.length
  const ticketPromedio = numFacturas > 0 ? totalFacturado / numFacturas : 0

  const facturasAnterior = facturas.filter((f) => {
    if (!f.fecha_emision) return false
    const [fAnio, fMes] = f.fecha_emision.split('-')
    if (mes === 'todos') return fAnio === String(Number(anio) - 1)
    const mesAnteriorNum = Number(mes) === 1 ? 12 : Number(mes) - 1
    const anioMesAnterior = Number(mes) === 1 ? String(Number(anio) - 1) : anio
    return fAnio === anioMesAnterior && fMes === String(mesAnteriorNum).padStart(2, '0')
  })
  const totalAnterior = facturasAnterior.reduce((sum, f) => sum + Number(f.monto_total), 0)
  const variacion = totalAnterior > 0 ? Math.round(((totalFacturado - totalAnterior) / totalAnterior) * 100) : null

  // --- Gráfico de tendencia: SIEMPRE los 12 meses del año seleccionado ---
  const dataPorMes = MES_NOMBRES.map((nombreMes, idx) => {
    const numMes = String(idx + 1).padStart(2, '0')
    const totalMes = facturasDelAnio
      .filter((f) => f.fecha_emision.split('-')[1] === numMes)
      .reduce((sum, f) => sum + Number(f.monto_total), 0)
    return { mes: nombreMes, total: totalMes }
  })

  // --- Resto de gráficos: respetan el filtro de mes ---
  const idsFacturasFiltradas = new Set(facturasFiltradas.map((f) => f.factura_id))
  const itemsFiltrados = items.filter((i) => idsFacturasFiltradas.has(i.factura_id))

  const ventasPorCliente = {}
  facturasFiltradas.forEach((f) => {
    const c = f.cliente || 'Sin asignar'
    ventasPorCliente[c] = (ventasPorCliente[c] || 0) + Number(f.monto_total)
  })
  const dataPorCliente = Object.entries(ventasPorCliente).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto).slice(0, 5)

  const ventasPorVendedor = {}
  facturasFiltradas.forEach((f) => {
    const v = f.vendedor || 'Sin asignar'
    ventasPorVendedor[v] = (ventasPorVendedor[v] || 0) + Number(f.monto_total)
  })
  const dataPorVendedor = Object.entries(ventasPorVendedor).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto)

  const ventasPorProducto = {}
  itemsFiltrados.forEach((i) => {
    ventasPorProducto[i.producto_nombre] = (ventasPorProducto[i.producto_nombre] || 0) + Number(i.subtotal)
  })
  const dataPorProducto = Object.entries(ventasPorProducto).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto).slice(0, 5)

  // --- Paginación de la tabla de facturas ---
  const facturasOrdenadas = [...facturasFiltradas].sort((a, b) => b.fecha_emision.localeCompare(a.fecha_emision))
  const totalPaginas = Math.ceil(facturasOrdenadas.length / REGISTROS_POR_PAGINA) || 1
  const facturasPaginadas = facturasOrdenadas.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  const mesesSelect = [
    { valor: 'todos', label: 'Todo el año' },
    ...MES_NOMBRES.map((nombre, idx) => ({ valor: String(idx + 1).padStart(2, '0'), label: nombre })),
  ]

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando ventas...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={styles.titleRow}>
        <div>
          <h2 style={styles.title}>Ventas</h2>
          <p style={styles.subtitle}>Desempeño de ventas facturadas.</p>
        </div>
        <div style={styles.filtros}>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} style={styles.select}>
            {aniosDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={styles.select}>
            {mesesSelect.map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total Facturado</p>
          <p style={styles.metricValue}>${totalFacturado.toLocaleString()}</p>
          {variacion !== null && (
            <p style={{ ...styles.metricSub, color: variacion >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {variacion >= 0 ? '↑' : '↓'} {Math.abs(variacion)}% vs período anterior
            </p>
          )}
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Facturas Emitidas</p>
          <p style={styles.metricValue}>{numFacturas}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Ticket Promedio</p>
          <p style={styles.metricValue}>${ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div style={styles.chartCard}>
        <p style={styles.chartTitle}>Tendencia de Ventas — {anio}</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dataPorMes}>
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <Area type="monotone" dataKey="total" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Distribución por Cliente</p>
          {dataPorCliente.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={dataPorCliente} dataKey="monto" nameKey="nombre" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                  {dataPorCliente.map((_, idx) => <Cell key={idx} fill={COLORES_DONA[idx % COLORES_DONA.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={styles.muted}>Sin datos para este filtro.</p>}
        </div>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Top Vendedores</p>
          {dataPorVendedor.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dataPorVendedor} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nombre" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Bar dataKey="monto" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={styles.muted}>Sin datos para este filtro.</p>}
        </div>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Top Productos</p>
          {dataPorProducto.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dataPorProducto} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="nombre" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Bar dataKey="monto" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={styles.muted}>Sin datos para este filtro.</p>}
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Facturas del Período</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Factura</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Vendedor</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {facturasPaginadas.map((f) => (
              <tr key={f.factura_id} style={styles.tr}>
                <td style={styles.td}>{f.numero_factura}</td>
                <td style={styles.td}>{f.cliente}</td>
                <td style={styles.td}>{f.vendedor}</td>
                <td style={styles.td}>{f.fecha_emision}</td>
                <td style={styles.td}>${f.monto_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {facturasOrdenadas.length === 0 && <p style={styles.muted}>No hay facturas para este período.</p>}
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
  filtros: { display: 'flex', gap: '8px' },
  select: {
    backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px',
  },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginTop: '28px', marginBottom: '12px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  metricCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '20px' },
  metricLabel: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' },
  metricValue: { fontSize: '22px', fontWeight: 600 },
  metricSub: { fontSize: '12px', marginTop: '4px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' },
  chartCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px' },
  chartTitle: { fontSize: '14px', fontWeight: 500, marginBottom: '12px' },
  tableWrapper: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500 },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 16px', fontSize: '14px' },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
}