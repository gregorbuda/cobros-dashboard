import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'

export default function Configuracion() {
  const [emailAnalistaCobros, setEmailAnalistaCobros] = useState('')
  const [emailGerenteCxp, setEmailGerenteCxp] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  function mostrarNotificacion(mensaje, tipo = 'success') {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  async function loadData() {
    setLoading(true)

    const { data: configData } = await supabase
      .schema('cobros_demo')
      .from('configuracion')
      .select('clave, valor')
      .eq('clave', 'email_analista_cobros')
      .maybeSingle()

    const { data: gerenteData } = await supabase
      .schema('cobros_demo')
      .from('dashboard_usuarios')
      .select('email')
      .eq('rol', 'gerente_cxp')
      .maybeSingle()

    setEmailAnalistaCobros(configData?.valor || '')
    setEmailGerenteCxp(gerenteData?.email || '—')
    setLoading(false)
  }

  async function guardarEmailAnalista(e) {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase
      .schema('cobros_demo')
      .from('configuracion')
      .update({ valor: emailAnalistaCobros, updated_at: new Date().toISOString() })
      .eq('clave', 'email_analista_cobros')

    if (error) {
      mostrarNotificacion('No se pudo guardar: ' + error.message, 'error')
    } else {
      mostrarNotificacion('Correo actualizado correctamente.', 'success')
    }
    setGuardando(false)
  }

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando configuración...</p>
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

      <h2 style={styles.title}>Configuración</h2>
      <p style={styles.subtitle}>Correos que reciben notificaciones de aprobación.</p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Analista de Cobros</h3>
        <p style={styles.cardDesc}>Aprueba los pagos reportados por clientes. No tiene acceso al bot ni al dashboard.</p>
        <form onSubmit={guardarEmailAnalista} style={styles.form}>
          <input
            type="email"
            value={emailAnalistaCobros}
            onChange={(e) => setEmailAnalistaCobros(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.saveButton} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Gerente de Cuentas por Pagar</h3>
        <p style={styles.cardDesc}>Aprueba los pagos a proveedores. Tiene su propio acceso al dashboard — este correo se gestiona desde su cuenta, no aquí.</p>
        <p style={styles.readOnlyEmail}>{emailGerenteCxp}</p>
      </div>
    </Layout>
  )
}

const styles = {
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    marginBottom: '16px',
  },
  cardTitle: { fontSize: '16px', fontWeight: 600, marginBottom: '6px' },
  cardDesc: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' },
  form: { display: 'flex', gap: '10px' },
  input: {
    flex: 1,
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  saveButton: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  readOnlyEmail: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '10px 14px',
    borderRadius: '6px',
    display: 'inline-block',
  },
  muted: { color: 'var(--text-secondary)', padding: '20px' },
  toast: {
    position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
    borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 500,
    zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
}