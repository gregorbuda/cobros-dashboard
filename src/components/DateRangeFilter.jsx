export default function DateRangeFilter({ desde, hasta, onDesdeChange, onHastaChange }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.field}>
        <label style={styles.label}>Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => onDesdeChange(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => onHastaChange(e.target.value)}
          style={styles.input}
        />
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  input: {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    colorScheme: 'dark',
  },
}