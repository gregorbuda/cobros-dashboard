import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'
import { exportarCSV } from '../utils/exportCSV'

const estadoColors = {
  pendiente: 'var(--warning)',
  verificado: 'var(--success)',
  rechazado: 'var(--danger)',
}

const REGISTROS_POR_PAGINA = 10

export default function Cobros() {
  const [cobros, setCobros] = useState([])
  const [facturasMap, setFacturasMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [paginaActual, setPaginaActual] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroEstado])

  async function loadData() {
    setLoading(true)

    const { data: cobrosData, error: cobrosError } = await supabase
      .schema('cobros_demo')
      .from('scxc_cobros')
      .select('*')
      .order('fecha_cobro', { ascending: false })

    const { data: facturasData } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('factura_id, numero_factura, cliente, vendedor, vendedor_id')

    if (facturasData) {
      const map = {}
      facturasData.forEach((f) => {
        map[f.factura_id] = f
      })
      setFacturasMap(map)
    }

    if (!cobrosError) setCobros(cobrosData)
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

  const cobrosFiltrados = cobros.filter((c) =>
    filtroEstado === 'todos' ? true : c.estado_verificacion === filtroEstado
  )

  const estados = ['todos', 'pendiente', 'verificado', 'rechazado']

  // --- Paginación ---
  const totalPaginas = Math.ceil(cobrosFiltrados.length / REGISTROS_POR_PAGINA) || 1
  const cobrosPaginados = cobrosFiltrados.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  )

  return (
    <Layout>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>Cobros Reportados</h2>
        <button
          onClick={() =>
            exportarCSV(
              cobrosFiltrados.map((c) => {
                const factura = facturasMap[c.factura_id]
                return {
                  Factura: factura?.numero_factura || '',
                  Cliente: factura?.cliente || '',
                  Vendedor: factura?.vendedor || '',
                  Fecha: c.fecha_cobro,
                  Monto: c.monto,
                  Metodo: c.metodo_pago,
                  Referencia: c.referencia,
                  Estado: c.estado_verificacion,
                }
              }),
              'cobros_reportados'
            )
          }
          style={styles.exportButton}
        >
          Exportar CSV
        </button>
      </div>

      <div style={styles.filters}>
        {estados.map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            style={{
              ...styles.filterButton,
              ...(filtroEstado === e ? styles.filterButtonActive : {}),
            }}
          >
            {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.muted}>Cargando cobros...</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Factura</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Vendedor</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Monto</th>
                <th style={styles.th}>Método</th>
                <th style={styles.th}>Referencia</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {cobrosPaginados.map((c) => {
                const factura = facturasMap[c.factura_id]
                return (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.td}>{factura?.numero_factura || '—'}</td>
                    <td style={styles.td}>{factura?.cliente || '—'}</td>
                    <td style={styles.td}>
                      {factura?.vendedor ? (
                        <Link to={`/vendedor/${factura.vendedor_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {factura.vendedor}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
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
                      <button
                        onClick={() => verComprobante(c.url_comprobante)}
                        style={styles.linkButton}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {cobrosFiltrados.length === 0 && (
            <p style={styles.muted}>No hay cobros para este filtro.</p>
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
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
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