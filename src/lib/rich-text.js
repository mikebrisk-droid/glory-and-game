export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatInline(text) {
  const escaped = escapeHtml(text)

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(.+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
}

export function formatBioHtml(value) {
  const source = String(value || '').trim()
  if (!source) return '<p>Athlete profile coming soon.</p>'

  const blocks = source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length && lines.every((line) => /^[-*]\s+/.test(line))) {
        const items = lines
          .map((line) => line.replace(/^[-*]\s+/, ''))
          .map((line) => `<li>${formatInline(line)}</li>`)
          .join('')

        return `<ul>${items}</ul>`
      }

      return `<p>${lines.map(formatInline).join('<br />')}</p>`
    })
    .join('')
}
