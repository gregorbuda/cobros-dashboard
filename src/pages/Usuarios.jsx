import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'

export default function Usuarios() {
  const [clientes, setClientes] = useState([])
  const [vendedoresConAcceso, setVendedoresConAcceso] = useState([])
  const [clientesSinAcceso, setClientesSinAcceso] = useState([])
  const [vendedoresSinAcceso, setVendedoresSinAcceso] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [notificacion, setNotificacion] = useState(null)
  const [nuevoAcceso, setNuevoAcceso] = useState({
    tipo: 'cliente',
    entidad_id: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  function mostrarNotificacion(mensaje, tipo = 'success') {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  async function loadData() {
    setLoading(true)

    const { data: clientesData } = await supabase
      .schema('cobros_demo')
      .from('scxc_clientes')
      .select('id, nombre, vendedor_id')

    const { data: usuariosData } = await supabase
      .schema('cobros_demo')
      .from('usuarios')
      .select('id, tipo_usuario, referencia_id, email, acceso_bot_activo')

    const { data: vendedoresData } = await supabase
      .schema('cobros_demo')
      .from('sven_vendedores')
      .select('id, nombre')

    const usuariosCliente = (usuariosData || []).filter((u) => u.tipo_usuario === 'cliente')
    const usuariosVendedor = (usuariosData || []).filter((u) => u.tipo_usuario === 'vendedor')

    const clientesCombinados = (clientesData || []).map((c) => {
      const usuario = usuariosCliente.find((u) => u.referencia_id === c.id)
      const vendedor = (vendedoresData || []).find((v) => v.id === c.vendedor_id)
      return {
        id_relacionado: c.id,
        nombre: c.nombre,
        vendedor_nombre: vendedor?.nombre || '—',
        usuario_id: usuario?.id || null,
        email: usuario?.email || '—',
        acceso_activo: usuario?.acceso_bot_activo ?? null,
      }
    })

    const vendedoresCombinados = (vendedoresData || []).map((v) => {
      const usuario = usuariosVendedor.find((u) => u.referencia_id === v.id)
      return {
        id_relacionado: v.id,
        nombre: v.nombre,
        usuario_id: usuario?.id || null,
        email: usuario?.email || '—',
        acceso_activo: usuario?.acceso_bot_activo ?? null,
      }
    })

    setClientes(clientesCombinados)
    setVendedoresConAcceso(vendedoresCombinados)
    setClientesSinAcceso(clientesCombinados.filter((c) => !c.usuario_id))
    setVendedoresSinAcceso(vendedoresCombinados.filter((v) => !v.usuario_id))
    setLoading(false)
  }

  async function toggleAcceso(usuarioId, valorActual) {
    setGuardando(usuarioId)
    const { error } = await supabase
      .schema('cobros_demo')
      .from('usuarios')
      .update({ acceso_bot_activo: !valorActual })
      .eq('id', usuarioId)

    if (error) {
      mostrarNotificacion('No se pudo actualizar el acceso: ' + error.message, 'error')
    } else {
      mostrarNotificacion('Acceso actualizado correctamente.', 'success')
      await loadData()
    }
    setGuardando(null)
  }

  async function crearAcceso(e) {
    e.preventDefault()

    if (!nuevoAcceso.entidad_id || !nuevoAcceso.email || !nuevoAcceso.password) {
      mostrarNotificacion('Completa todos los campos.', 'error')
      return
    }

    const { error } = await supabase
      .schema('cobros_demo')
      .from('usuarios')
      .insert({
        tipo_usuario: nuevoAcceso.tipo,
        referencia_id: nuevoAcceso.entidad_id,
        email: nuevoAcceso.email,
        password_hash: nuevoAcceso.password,
        acceso_bot_activo: true,
      })

    if (error) {
      mostrarNotificacion('No se pudo crear el acceso: ' + error.message, 'error')
      return
    }

    mostrarNotificacion('Acceso creado correctamente.', 'success')
    setNuevoAcceso({ tipo: 'cliente', entidad_id: '', email: '', password: '' })
    setMostrandoAlta(false)
    loadData()
  }

  if (loading) {
    return (
      <Layout>
        <p style={styles.muted}>Cargando accesos...</p>
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

      <div style={styles.titleRow}>
        <h2 style={styles.title}>Gestión de Acceso de Usuarios</h2>
        <button onClick={() => setMostrandoAlta(!mostrandoAlta)} style={styles.addButton}>
          {mostrandoAlta ? 'Cancelar' : '+ Nuevo Acceso'}
        </button>
      </div>

      {mostrandoAlta && (
        <form onSubmit={crearAcceso} style={styles.form}>
          <div style={styles.formRow}>
            <select
              value={nuevoAcceso.tipo}
              onChange={(e) => setNuevoAcceso({ ...nuevoAcceso, tipo: e.target.value, entidad_id: '' })}
              style={styles.input}
            >
              <option value="cliente">Cliente</option>
              <option value="vendedor">Vendedor</option>
            </select>
            <select
              value={nuevoAcceso.entidad_id}
              onChange={(e) => setNuevoAcceso({ ...nuevoAcceso, entidad_id: e.target.value })}
              style={styles.input}
            >
              <option value="">
                {nuevoAcceso.tipo === 'cliente' ? 'Selecciona cliente sin acceso' : 'Selecciona vendedor sin acceso'}
              </option>
              {(nuevoAcceso.tipo === 'cliente' ? clientesSinAcceso : vendedoresSinAcceso).map((ent) => (
                <option key={ent.id_relacionado} value={ent.id_relacionado}>{ent.nombre}</option>
              ))}
            </select>
            <input
              type="email"
              placeholder="Correo de acceso"
              value={nuevoAcceso.email}
              onChange={(e) => setNuevoAcceso({ ...nuevoAcceso, email: e.target.value })}
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Contraseña"
              value={nuevoAcceso.password}
              onChange={(e) => setNuevoAcceso({ ...nuevoAcceso, password: e.target.value })}
              style={styles.input}
            />
            <button type="submit" style={styles.saveButton}>Crear Acceso</button>
          </div>
        </form>
      )}

      <h3 style={styles.sectionTitle}>Clientes</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Vendedor</th>
              <th style={styles.th}>Correo de Acceso</th>
              <th style={styles.th}>Acceso al Bot</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id_relacionado} style={styles.tr}>
                <td style={styles.td}>{c.nombre}</td>
                <td style={styles.td}>{c.vendedor_nombre}</td>
                <td style={styles.td}>{c.email}</td>
                <td style={styles.td}>
                  {c.usuario_id ? (
                    <button
                      onClick={() => toggleAcceso(c.usuario_id, c.acceso_activo)}
                      style={{
                        ...styles.toggleButton,
                        backgroundColor: c.acceso_activo ? 'var(--success)' : 'var(--danger)',
                      }}
                      disabled={guardando === c.usuario_id}
                    >
                      {guardando === c.usuario_id ? '...' : c.acceso_activo ? 'Activo' : 'Inactivo'}
                    </button>
                  ) : (
                    <span style={styles.muted}>Sin acceso configurado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={styles.sectionTitle}>Vendedores</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vendedor</th>
              <th style={styles.th}>Correo de Acceso</th>
              <th style={styles.th}>Acceso al Bot</th>
            </tr>
          </thead>
          <tbody>
            {vendedoresConAcceso.map((v) => (
              <tr key={v.id_relacionado} style={styles.tr}>
                <td style={styles.td}>{v.nombre}</td>
                <td style={styles.td}>{v.email}</td>
                <td style={styles.td}>
                  {v.usuario_id ? (
                    <button
                      onClick={() => toggleAcceso(v.usuario_id, v.acceso_activo)}
                      style={{
                        ...styles.toggleButton,
                        backgroundColor: v.acceso_activo ? 'var(--success)' : 'var(--danger)',
                      }}
                      disabled={guardando === v.usuario_id}
                    >
                      {guardando === v.usuario_id ? '...' : v.acceso_activo ? 'Activo' : 'Inactivo'}
                    </button>
                  ) : (
                    <span style={styles.muted}>Sin acceso configurado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginTop: '28px',
    marginBottom: '12px',
  },
  addButton: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  form: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    padding: '16px',
    marginBottom: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  input: {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    flex: '1 1 180px',
  },
  saveButton: {
    backgroundColor: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
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
  toggleButton: {
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  muted: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 500,
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
}