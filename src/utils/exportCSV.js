export function exportarCSV(datos, nombreArchivo) {
  if (!datos || datos.length === 0) {
    alert('No hay datos para exportar.')
    return
  }

  const columnas = Object.keys(datos[0])
  const encabezado = columnas.join(',')

  const filas = datos.map((fila) =>
    columnas
      .map((col) => {
        const valor = fila[col] ?? ''
        const texto = String(valor).replace(/"/g, '""')
        return `"${texto}"`
      })
      .join(',')
  )

  const csv = [encabezado, ...filas].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}