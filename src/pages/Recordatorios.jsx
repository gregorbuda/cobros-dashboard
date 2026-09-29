import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function Recordatorios() {
  const { profile } = useAuth()
  const [clientes, setClientes] = useState([])
  const [reglas, setReglas] = useState({})
  const [plantillas, setPlantillas] = useState({ normal: null, extremo: null })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [editandoPlantilla, setEditandoPlantilla] = useState(null)
  const [borradorPlantilla, setBorradorPlantilla] = useState({ asunto: '', cuerpo: '' })

  useEffect(() => {
    if (profile?.vendedor_id) {
      loadData()
      loadPlantillas()
    }
  }, [profile])

  async function loadData() {
    setLoading(true)

    const { data: facturasData } = await supabase
      .schema('cobros_demo')
      .from('scxc_vista_aging')
      .select('*')
      .not('bucket_aging', 'in', '("Por Vencer","Pagada")')

    const clientesMap = {}
    ;(facturasData || []).forEach((f) => {
      const key = f.cliente_id
      if (!clientesMap[key]) {
        clientesMap[key] = {
          cliente_id: f.cliente_id,
          cliente: f.cliente,
          saldo_total: 0,
          max_dias_vencido: 0,
        }
      }
      clientesMap[key].saldo_total += Number(f.saldo_pendiente)
      clientesMap[key].max_dias_vencido = Math.max(
        clientesMap[key].max_dias_vencido,
        Number(f.dias_vencido)
      )
    })
    setClientes(Object.values(clientesMap))

    const { data: reglasData } = await supabase
      .schema('cobros_demo')
      .from('reglas_recordatorio')
      .select('*')
      .eq('vendedor_id', profile.vendedor_id)

    const reglasMap = {}
    ;(reglasData || []).forEach((r) => {
      reglasMap[r.cliente_id] = r
    })
    setReglas(reglasMap)

    setLoading(false)
  }

  async function loadPlantillas() {
    const { data } = await supabase
      .schema('cobros_demo')
      .from('plantillas_recordatorio')
      .select('*')
      .or(`vendedor_id.eq.${profile.vendedor_id},vendedor_id.is.null`)

    const resultado = { normal: null, extremo: null }
    for (const tipo of ['normal', 'extremo']) {
      const propia = data?.find((p) => p.tipo === tipo && p.vendedor_id === profile.vendedor_id)
      const sistema = data?.find((p) => p.tipo === tipo && p.vendedor_id === null)
      resultado[tipo] = propia || sistema
    }
    setPlantillas(resultado)
  }

  function getReglaDefault(clienteId) {
    return (
      reglas[clienteId] || {
        cliente_id: clienteId,
        vendedor_id: profile.vendedor_id,
        frecuencia_dias: 3,
        umbral_extremo_dias: 90,
        activo: false,
        activo_nivel_extremo: true,
        fecha_inicio: new Date().toISOString().slice(0, 10),
      }
    )
  }

  function actualizarCampo(clienteId, campo, valor) {
    setReglas((prev) => ({
      ...prev,
      [clienteId]: {
        ...getReglaDefault(clienteId),
        [campo]: valor,
      },
    }))
  }

  async function guardarRegla(clienteId) {
    setGuardando(clienteId)
    try {
      const regla = getReglaDefault(clienteId)

      const { data, error } = await supabase
        .schema('cobros_demo')
        .from('reglas_recordatorio')
        .upsert(
          {
            cliente_id: clienteId,
            vendedor_id: profile.vendedor_id,
            frecuencia_dias: regla.frecuencia_dias,
            umbral_extremo_dias: regla.umbral_extremo_dias,
            activo: regla.activo,
            activo_nivel_extremo: regla.activo_nivel_extremo,
            fecha_inicio: regla.fecha_inicio,
          },
          { onConflict: 'cliente_id' }
        )
        .select()

      if (error) {
        console.error('Error al guardar regla:', error)
        alert('No se pudo guardar la configuración: ' + error.message)
      } else if (data && data[0]) {
        setReglas((prev) => ({ ...prev, [clienteId]: data[0] }))
      }
    } catch (err) {
      console.error('Excepción al guardar regla:', err)
      alert('Ocurrió un error inesperado al guardar.')
    } finally {
      setGuardando(null)
    }
  }

  function abrirEdicionPlantilla(tipo) {
    setEditandoPlantilla(tipo)
    setBorradorPlantilla({
      asunto: plantillas[tipo]?.asunto || '',
      cuerpo: plantillas[tipo]?.cuerpo || '',
    })
  }

  async function guardarPlantilla() {
    const { error } = await supabase
      .schema('cobros_demo')
      .from('plantillas_recordatorio')
      .upsert(
        {
          vendedor_id: profile.vendedor_id,
          tipo: editandoPlantilla,
          asunto: borradorPlantilla.asunto,
          cuerpo: borradorPlantilla.cuerpo,
        },
        { onConflict: 'vendedor_id,tipo' }
      )

    if (error) {
      console.error('Error al guardar plantilla:', error)
      alert('No se pudo guardar la plantilla.')
      return
    }
    setEditandoPlantilla(null)
    loadPlantillas()
  }

  async function restaurarPlantillaSistema(tipo) {
    await supabase
      .schema('cobros_demo')
      .from('plantillas_recordatorio')
      .delete()
      .eq('vendedor_id', profile.vendedor_id)
      .eq('tipo', tipo)

    loadPlantillas()
  }

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando recordatorios...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 style={styles.title}>Gestión de Recordatorios</h2>
      <p style={styles.subtitle}>
        Configura el envío automático de recordatorios de pago para tus clientes con deuda.
      </p>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Saldo Vencido</th>
              <th style={styles.th}>Días Vencido (máx)</th>
              <th style={styles.th}>Frecuencia (días)</th>
              <th style={styles.th}>Umbral Extremo (días)</th>
              <th style={styles.th}>Activo</th>
              <th style={styles.th}>Activo (Extremo)</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const regla = getReglaDefault(c.cliente_id)
              const esExtremo = c.max_dias_vencido >= regla.umbral_extremo_dias
              return (
                <tr key={c.cliente_id} style={styles.tr}>
                  <td style={styles.td}>{c.cliente}</td>
                  <td style={styles.td}>${c.saldo_total.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ color: esExtremo ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {c.max_dias_vencido} {esExtremo && '⚠️'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      min="1"
                      value={regla.frecuencia_dias}
                      onChange={(e) =>
                        actualizarCampo(c.cliente_id, 'frecuencia_dias', Number(e.target.value))
                      }
                      style={styles.inputSmall}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      min="1"
                      value={regla.umbral_extremo_dias}
                      onChange={(e) =>
                        actualizarCampo(c.cliente_id, 'umbral_extremo_dias', Number(e.target.value))
                      }
                      style={styles.inputSmall}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={regla.activo}
                      onChange={(e) => actualizarCampo(c.cliente_id, 'activo', e.target.checked)}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={regla.activo_nivel_extremo}
                      onChange={(e) =>
                        actualizarCampo(c.cliente_id, 'activo_nivel_extremo', e.target.checked)
                      }
                    />
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => guardarRegla(c.cliente_id)}
                      style={styles.saveButton}
                      disabled={guardando === c.cliente_id}
                    >
                      {guardando === c.cliente_id ? 'Guardando...' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {clientes.length === 0 && (
          <p style={styles.muted}>No tienes clientes con deuda vencida actualmente.</p>
        )}
      </div>

      <h3 style={styles.sectionTitle}>Plantillas de Mensaje</h3>
      <div style={styles.chartsGrid}>
        {['normal', 'extremo'].map((tipo) => (
          <div key={tipo} style={styles.chartCard}>
            <p style={styles.chartTitle}>
              {tipo === 'normal' ? 'Recordatorio Normal' : 'Recordatorio Extremo'}
              {plantillas[tipo]?.vendedor_id === null && (
                <span style={styles.badgeSistema}> (plantilla del sistema)</span>
              )}
            </p>
            <p style={styles.plantillaAsunto}>{plantillas[tipo]?.asunto}</p>
            <p style={styles.plantillaCuerpo}>{plantillas[tipo]?.cuerpo}</p>
            <div style={styles.plantillaActions}>
              <button onClick={() => abrirEdicionPlantilla(tipo)} style={styles.editButton}>
                Editar
              </button>
              {plantillas[tipo]?.vendedor_id === profile.vendedor_id && (
                <button
                  onClick={() => restaurarPlantillaSistema(tipo)}
                  style={styles.linkButtonDanger}
                >
                  Restaurar plantilla del sistema
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editandoPlantilla && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.sectionTitle}>
              Editar plantilla — {editandoPlantilla === 'normal' ? 'Normal' : 'Extremo'}
            </h3>
            <label style={styles.label}>Asunto</label>
            <input
              type="text"
              value={borradorPlantilla.asunto}
              onChange={(e) =>
                setBorradorPlantilla((p) => ({ ...p, asunto: e.target.value }))
              }
              style={styles.input}
            />
            <label style={styles.label}>Cuerpo del mensaje</label>
            <p style={styles.hint}>
              Variables disponibles: {'{{cliente}}'}, {'{{numero_factura}}'}, {'{{monto}}'},{' '}
              {'{{dias_vencido}}'}, {'{{vendedor}}'}
            </p>
            <textarea
              value={borradorPlantilla.cuerpo}
              onChange={(e) => setBorradorPlantilla((p) => ({ ...p, cuerpo: e.target.value }))}
              style={styles.textarea}
              rows={10}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setEditandoPlantilla(null)} style={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={guardarPlantilla} style={styles.saveButton}>
                Guardar Plantilla
              </button>
            </div>
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
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginTop: '28px',
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
    padding: '10px 16px',
    fontSize: '14px',
  },
  inputSmall: {
    width: '60px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '4px 6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  saveButton: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
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
    marginBottom: '8px',
  },
  badgeSistema: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  plantillaAsunto: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    fontStyle: 'italic',
  },
  plantillaCuerpo: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    maxHeight: '150px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  plantillaActions: {
    display: 'flex',
    gap: '12px',
  },
  editButton: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  linkButtonDanger: {
    backgroundColor: 'transparent',
    color: 'var(--danger)',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    width: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  label: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'block',
    marginTop: '12px',
    marginBottom: '4px',
  },
  hint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  textarea: {
    width: '100%',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  muted: {
    color: 'var(--text-secondary)',
    padding: '20px',
  },
}