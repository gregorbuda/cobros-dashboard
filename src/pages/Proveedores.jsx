import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'

const REGISTROS_POR_PAGINA = 10

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: proveedoresData, error: errorProveedores } = await supabase
      .schema('cobros_demo')
      .from('scxp_proveedores')
      .select('*')
      .order('nombre', { ascending: true })

    const { data: facturasData, error: errorFacturas } = await supabase
      .schema('cobros_demo')
      .from('scxp_vista_facturas')
      .select('proveedor_id, saldo_pendiente, estado')

    if (errorProveedores) console.error(errorProveedores)
    if (errorFacturas) console.error(errorFacturas)

    const combinados = (proveedoresData || []).map((p) => {
      const facturasProveedor = (facturasData || []).filter((f) => f.proveedor_id === p.id && f.estado !== 'pagada')
      const deudaTotal = facturasProveedor.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0)
      return {
        ...p,
        facturas_pendientes: facturasProveedor.length,
        deuda_total: deudaTotal,
      }
    })

    setProveedores(combinados)
    setLoading(false)
  }

  const deudaGlobalTotal = proveedores.reduce((sum, p) => sum + p.deuda_total, 0)

  // --- Paginación ---
  const totalPaginas = Math.ceil(proveedores.length / REGISTROS_POR_PAGINA) || 1
  const proveedoresPaginados = proveedores.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando proveedores...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Proveedores</h2>
      <p style={styles.subtitle}>Catálogo sincronizado desde el ERP, con resumen de deuda pendiente.</p>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Proveedores registrados</p>
          <p style={styles.metricValue}>{proveedores.length}</p>
        </div>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>Deuda total con proveedores</p>
          <p style={{ ...styles.metricValue, color: 'var(--warning)' }}>${deudaGlobalTotal.toLocaleString()}</p>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Proveedor</th>
              <th style={styles.th}>Correo</th>
              <th style={styles.th}>Facturas Pendientes</th>
              <th style={styles.th}>Deuda Total</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresPaginados.map((p) => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>{p.nombre}</td>
                <td style={styles.td}>{p.email || '—'}</td>
                <td style={styles.td}>{p.facturas_pendientes}</td>
                <td style={{ ...styles.td, color: p.deuda_total > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 500 }}>
                  ${p.deuda_total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proveedores.length === 0 && <p style={styles.muted}>No hay proveedores registrados.</p>}
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
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
  metricCard: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '16px' },
  metricLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' },
  metricValue: { fontSize: '22px', fontWeight: 700 },
  tableWrapper: { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500 },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 16px', fontSize: '14px' },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
}