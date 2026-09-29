export default function Pagination({ paginaActual, totalPaginas, onCambiarPagina }) {
  if (totalPaginas <= 1) return null

  return (
    <div style={styles.wrapper}>
      <button
        onClick={() => onCambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1}
        style={{ ...styles.button, ...(paginaActual === 1 ? styles.buttonDisabled : {}) }}
      >
        ← Anterior
      </button>
      <span style={styles.info}>
        Página {paginaActual} de {totalPaginas}
      </span>
      <button
        onClick={() => onCambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        style={{ ...styles.button, ...(paginaActual === totalPaginas ? styles.buttonDisabled : {}) }}
      >
        Siguiente →
      </button>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
  },
  button: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  info: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
}