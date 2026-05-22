/**
 * Exports the mind-map SVG to a PNG file.
 * Embeds fonts as base64, inlines CSS variables, and downloads the result.
 */
export async function exportPng(svgEl: SVGSVGElement, title: string): Promise<void> {
  const w = svgEl.clientWidth  || window.innerWidth
  const h = svgEl.clientHeight || window.innerHeight

  // Resolve CSS custom properties
  const rootStyle = getComputedStyle(document.documentElement)
  const cssVars: Record<string, string> = {}
  for (const prop of ['--paper-card', '--ink', '--ink-soft', '--accent', '--accent-soft', '--muted']) {
    cssVars[prop] = rootStyle.getPropertyValue(prop).trim()
  }
  const ink    = cssVars['--ink']    || '#1f2533'
  const accent = cssVars['--accent'] || '#c4604a'

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width',  String(w * 2))
  clone.setAttribute('height', String(h * 2))

  // Inline .node-text class — CSS classes not available in blob scope
  for (const el of clone.querySelectorAll('text.node-text')) {
    el.setAttribute('text-anchor', 'middle')
    el.setAttribute('dominant-baseline', 'middle')
    el.setAttribute('font-family', 'Caveat, cursive')
    el.setAttribute('fill', el.classList.contains('selected') ? accent : ink)
    el.removeAttribute('class')
  }

  // Paper background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%');  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', cssVars['--paper-card'] || '#fdfaf2')
  clone.insertBefore(bg, clone.firstChild)

  // Fetch and embed fonts as base64
  const fontRules = Array.from(document.styleSheets)
    .flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } })
    .filter(r => r instanceof CSSFontFaceRule)
    .map(r => r.cssText)

  const embeddedFonts: string[] = []
  for (const rule of fontRules) {
    const m = rule.match(/url\(["']?(https?:[^"')]+)["']?\)/)
    if (!m || !m[1]) { embeddedFonts.push(rule); continue }
    try {
      const buf = await fetch(m[1]).then(r => r.arrayBuffer())
      let binary = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
      const b64  = btoa(binary)
      const mime = m[1].includes('woff2') ? 'font/woff2' : 'font/woff'
      embeddedFonts.push(rule.replace(m[0], `url(data:${mime};base64,${b64})`))
    } catch {
      embeddedFonts.push(rule)
    }
  }

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent = embeddedFonts.join('\n')
  clone.insertBefore(styleEl, clone.firstChild)

  // Resolve remaining CSS variable references
  let svgStr = new XMLSerializer().serializeToString(clone)
  svgStr = svgStr.replace(/var\(\s*(--[a-z-]+)\s*\)/g, (_, name: string) => cssVars[name] ?? '#000')

  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * 2; canvas.height = h * 2
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(pngBlob => {
        if (!pngBlob) { reject(new Error('PNG export failed')); return }
        const a   = document.createElement('a')
        const safeName = (title || 'mindmap').replace(/[^a-z0-9_\-]+/gi, '_')
        a.href     = URL.createObjectURL(pngBlob)
        a.download = `${safeName}.png`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(a.href)
        resolve()
      }, 'image/png')
    }
    img.onerror = reject
    img.src     = url
  })
}
