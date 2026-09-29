import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const REGISTROS_POR_PAGINA = 10

export default function CuentasPorPagar() {
  const [facturas, setFacturas] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notificacion, setNotificacion] = useState(null)
  const [paginaFacturas, setPaginaFacturas] = useState(1)
  const [paginaPagos, setPaginaPagos] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  function mostrarNotificacion(mensaje, tipo = 'success') {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  async function loadData() {
    setLoading(true)

    const { data: facturasData, error: errorFacturas } = await supabase
      .schema('cobros_demo')
      .from('scxp_vista_facturas')
      .select('*')
      .order('fecha_vencimiento', { ascending: true })

    if (errorFacturas) {
      mostrarNotificacion('No se pudieron cargar las facturas: ' + errorFacturas.message, 'error')
    }

    const { data: pagosData, error: errorPagos } = await supabase
      .schema('cobros_demo')
      .from('scxp_pagos')
      .select('*, scxp_facturas(numero_factura)')
      .order('created_at', { ascending: false })

    if (errorPagos) {
      mostrarNotificacion('No se pudieron cargar los pagos: ' + errorPagos.message, 'error')
    }

    setFacturas(facturasData || [])
    setPagos(pagosData || [])
    setLoading(false)
  }

  function estadoBadgeColor(estado) {
    if (estado === 'verificado') return 'var(--success)'
    if (estado === 'rechazado') return 'var(--danger)'
    return 'var(--warning)'
  }

  // --- Métricas de riesgo (facturas) ---
  const facturasPendientes = facturas.filter((f) => f.estado !== 'pagada')
  const totalPendiente = facturasPendientes.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
  const facturasVencidas = facturasPendientes.filter((f) => Number(f.dias_vencido) > 0)
  const proximasAVencer = facturasPendientes.filter((f) => Number(f.dias_vencido) <= 0 && Number(f.dias_vencido) >= -7)

  // --- Métricas de pagos ---
  const pagosVerificados = pagos.filter((p) => p.estado_verificacion === 'verificado')
  const pagosPendientes = pagos.filter((p) => p.estado_verificacion === 'pendiente')
  const pagosRechazados = pagos.filter((p) => p.estado_verificacion === 'rechazado')
  const totalPagado = pagosVerificados.reduce((sum, p) => sum + Number(p.monto), 0)
  const tasaAprobacion = pagos.length > 0
    ? Math.round((pagosVerificados.length / (pagosVerificados.length + pagosRechazados.length || 1)) * 100)
    : 0

  const dataEstadoPagos = [
    { name: 'Verificado', value: pagosVerificados.length, color: 'var(--success)' },
    { name: 'Pendiente', value: pagosPendientes.length, color: 'var(--warning)' },
    { name: 'Rechazado', value: pagosRechazados.length, color: 'var(--danger)' },
  ].filter((d) => d.value > 0)

  const dataPorProveedor = Object.values(
    facturasPendientes.reduce((acc, f) => {
      if (!acc[f.proveedor]) acc[f.proveedor] = { proveedor: f.proveedor, saldo: 0 }
      acc[f.proveedor].saldo += Number(f.saldo_pendiente)
      return acc
    }, {})
  )

  // --- Paginación (independiente para cada tabla) ---
  const totalPaginasFacturas = Math.ceil(facturas.length / REGISTROS_POR_PAGINA) || 1
  const facturasPaginadas = facturas.slice(
    (paginaFacturas - 1) * REGISTROS_POR_PAGINA,
    paginaFacturas * REGISTROS_POR_PAGINA
  )

  const totalPaginasPagos = Math.ceil(pagos.length / REGISTROS_POR_PAGINA) || 1
  const pagosPaginados = pagos.slice(
    (paginaPagos - 1) * REGISTROS_POR_PAGINA,
    paginaPagos * REGISTROS_POR_PAGINA
  )

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando Cuentas por Pagar...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      {notificacion && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: notificacion.tipo === 'error' ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {notificacion.mensaje}
        </div>
      )}

      <h2 style={styles.title}>Cuentas por Pagar</h2>
      <p style={styles.subtitle}>Facturas de proveedores y pagos reportados.</p>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total pendiente a proveedores</p>
          <p style={styles.metricValue}>${totalPendiente.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Facturas vencidas</p>
          <p style={{ ...styles.metricValue, color: 'var(--danger)' }}>{facturasVencidas.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Próximas a vencer (7 días)</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>{proximasAVencer.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Total pagado (verificado)</p>
          <p style={{ ...styles.metricValue, color: 'var(--success)' }}>${totalPagado.toLocaleString()}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Tasa de aprobación</p>
          <p style={styles.metricValue}>{tasaAprobacion}%</p>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Estado de pagos reportados</p>
          {dataEstadoPagos.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dataEstadoPagos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {dataEstadoPagos.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.muted}>Sin pagos reportados todavía.</p>
          )}
        </div>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Saldo pendiente por proveedor</p>
          {dataPorProveedor.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dataPorProveedor}>
                <XAxis dataKey="proveedor" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="saldo" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.muted}>No hay saldos pendientes.</p>
          )}
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Facturas de Proveedores</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Factura</th>
              <th style={styles.th}>Proveedor</th>
              <th style={styles.th}>Vencimiento</th>
              <th style={styles.th}>Monto Total</th>
              <th style={styles.th}>Pagado</th>
              <th style={styles.th}>Saldo Pendiente</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturasPaginadas.map((f) => (
              <tr key={f.factura_id} style={styles.tr}>
                <td style={styles.td}>{f.numero_factura}</td>
                <td style={styles.td}>{f.proveedor}</td>
                <td style={styles.td}>
                  {f.fecha_vencimiento}
                  {f.dias_vencido > 0 && f.estado !== 'pagada' && (
                    <span style={styles.vencidoTag}> ⚠️ {f.dias_vencido}d</span>
                  )}
                </td>
                <td style={styles.td}>${f.monto_total}</td>
                <td style={styles.td}>${f.monto_pagado}</td>
                <td style={styles.td}>${f.saldo_pendiente}</td>
                <td style={styles.td}>
                  <span style={{ color: f.estado === 'pagada' ? 'var(--success)' : 'var(--text-primary)' }}>
                    {f.estado === 'pagada' ? '✓ Pagada' : 'Pendiente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {facturas.length === 0 && <p style={styles.muted}>No hay facturas de proveedores registradas.</p>}
        <Pagination
          paginaActual={paginaFacturas}
          totalPaginas={totalPaginasFacturas}
          onCambiarPagina={setPaginaFacturas}
        />
      </div>

      <h3 style={styles.sectionTitle}>Pagos Reportados</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Factura</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Método</th>
              <th style={styles.th}>Referencia</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagosPaginados.map((p) => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>{p.scxp_facturas?.numero_factura || '—'}</td>
                <td style={styles.td}>{new Date(p.fecha_pago).toLocaleDateString()}</td>
                <td style={styles.td}>${p.monto}</td>
                <td style={styles.td}>{p.metodo_pago}</td>
                <td style={styles.td}>{p.referencia}</td>
                <td style={styles.td}>
                  <span style={{ color: estadoBadgeColor(p.estado_verificacion), fontWeight: 500 }}>
                    {p.estado_verificacion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && <p style={styles.muted}>No hay pagos reportados todavía.</p>}
        <Pagination
          paginaActual={paginaPagos}
          totalPaginas={totalPaginasPagos}
          onCambiarPagina={setPaginaPagos}
        />
      </div>
    </Layout>
  )
}

const styles = {
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, marginTop: '28px', marginBottom: '12px' },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
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
  vencidoTag: { color: 'var(--danger)', fontSize: '12px' },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
  toast: {
    position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
    borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 500,
    zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
}