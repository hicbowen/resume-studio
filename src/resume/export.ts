const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123

function rectFor(context: CanvasRenderingContext2D, rect: DOMRect) {
  context.fillRect(rect.left, rect.top, rect.width, rect.height)
}

function paintElementBox(context: CanvasRenderingContext2D, element: HTMLElement, pageScale: number) {
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  const background = style.backgroundColor
  if (background && background !== 'transparent' && !background.endsWith(', 0)')) {
    context.fillStyle = background
    const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * pageScale
    if (radius > 0 && 'roundRect' in context) {
      context.beginPath()
      context.roundRect(rect.left, rect.top, rect.width, rect.height, radius)
      context.fill()
    } else {
      rectFor(context, rect)
    }
  }

  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const width = (Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0) * pageScale
    const borderStyle = style.getPropertyValue(`border-${side}-style`)
    if (width <= 0 || borderStyle === 'none' || borderStyle === 'hidden') continue
    const color = style.getPropertyValue(`border-${side}-color`)
    if (borderStyle === 'dotted' || borderStyle === 'dashed') {
      context.save()
      context.strokeStyle = color
      context.lineWidth = width
      context.lineCap = borderStyle === 'dotted' ? 'round' : 'butt'
      context.setLineDash(borderStyle === 'dotted' ? [width, width * 1.5] : [width * 3, width * 2])
      context.beginPath()
      if (side === 'top') { context.moveTo(rect.left, rect.top + width / 2); context.lineTo(rect.right, rect.top + width / 2) }
      else if (side === 'right') { context.moveTo(rect.right - width / 2, rect.top); context.lineTo(rect.right - width / 2, rect.bottom) }
      else if (side === 'bottom') { context.moveTo(rect.left, rect.bottom - width / 2); context.lineTo(rect.right, rect.bottom - width / 2) }
      else { context.moveTo(rect.left + width / 2, rect.top); context.lineTo(rect.left + width / 2, rect.bottom) }
      context.stroke()
      context.restore()
    } else {
      context.fillStyle = color
      if (side === 'top') context.fillRect(rect.left, rect.top, rect.width, width)
      else if (side === 'right') context.fillRect(rect.right - width, rect.top, width, rect.height)
      else if (side === 'bottom') context.fillRect(rect.left, rect.bottom - width, rect.width, width)
      else context.fillRect(rect.left, rect.top, width, rect.height)
    }
  }
}

function firstRangeRect(element: Element) {
  const range = document.createRange()
  range.selectNodeContents(element)
  return Array.from(range.getClientRects()).find((rect) => rect.width || rect.height)
}

function paintImages(context: CanvasRenderingContext2D, page: HTMLElement, pageScale: number) {
  for (const image of page.querySelectorAll<HTMLImageElement>('img')) {
    const source = image.currentSrc || image.src
    if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(source) || !image.naturalWidth || !image.naturalHeight) continue

    const rect = image.getBoundingClientRect()
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
    const sourceWidth = rect.width / scale
    const sourceHeight = rect.height / scale
    const sourceX = (image.naturalWidth - sourceWidth) / 2
    const sourceY = (image.naturalHeight - sourceHeight) / 2
    const style = getComputedStyle(image)
    const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * pageScale

    context.save()
    context.beginPath()
    if ('roundRect' in context && radius > 0) context.roundRect(rect.left, rect.top, rect.width, rect.height, radius)
    else context.rect(rect.left, rect.top, rect.width, rect.height)
    context.clip()
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, rect.left, rect.top, rect.width, rect.height)
    context.restore()
  }
}

function paintText(context: CanvasRenderingContext2D, page: HTMLElement, pageScale: number) {
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT)
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let node = walker.nextNode()
  while (node) {
    const textNode = node as Text
    const parent = textNode.parentElement
    if (!parent || !textNode.data.trim()) {
      node = walker.nextNode()
      continue
    }
    const style = getComputedStyle(parent)
    if (style.visibility === 'hidden' || !parent.getClientRects().length) {
      node = walker.nextNode()
      continue
    }

    const fontSize = (Number.parseFloat(style.fontSize) || 10) * pageScale
    context.fillStyle = style.color
    context.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`
    context.textBaseline = 'alphabetic'
    context.textAlign = 'left'
    context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr'
    // DOM ranges already include letter spacing, kerning and line wrapping.
    // Reusing measured positions avoids Canvas font metrics extending a line
    // beyond the paper, especially after headings with increased tracking.
    if ('letterSpacing' in context) context.letterSpacing = '0px'
    const range = document.createRange()
    for (const { segment, index } of segmenter.segment(textNode.data)) {
      if (!segment.trim()) continue
      range.setStart(textNode, index)
      range.setEnd(textNode, index + segment.length)
      const rect = range.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      const baselineOffset = (rect.height - fontSize) / 2 + fontSize * 0.82
      context.fillText(segment, rect.left, rect.top + baselineOffset)
    }
    node = walker.nextNode()
  }

  for (const item of page.querySelectorAll<HTMLElement>('li')) {
    const firstLine = firstRangeRect(item)
    if (!firstLine) continue
    const style = getComputedStyle(item)
    const marker = getComputedStyle(item, '::marker')
    const fontSize = (Number.parseFloat(style.fontSize) || 9) * pageScale
    const markerSize = (Number.parseFloat(marker.fontSize) || 9) * pageScale
    context.fillStyle = marker.color || style.color
    context.font = `${style.fontStyle} ${style.fontWeight} ${markerSize}px ${style.fontFamily}`
    context.textBaseline = 'alphabetic'
    context.textAlign = 'left'
    if ('letterSpacing' in context) context.letterSpacing = '0px'
    context.fillText('•', firstLine.left - fontSize * 0.95, firstLine.top + (firstLine.height - fontSize) / 2 + fontSize * 0.82)
  }
}

function rasterizePage(page: HTMLElement, resolution: number) {
  const pageRect = page.getBoundingClientRect()
  const pageScale = page.offsetWidth ? pageRect.width / page.offsetWidth : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(page.offsetWidth * resolution)
  canvas.height = Math.ceil(page.offsetHeight * resolution)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建图片画布。')

  const transformScale = resolution / pageScale
  context.setTransform(transformScale, 0, 0, transformScale, -pageRect.left * transformScale, -pageRect.top * transformScale)
  context.save()
  context.beginPath()
  context.rect(pageRect.left, pageRect.top, pageRect.width, pageRect.height)
  context.clip()
  context.fillStyle = '#ffffff'
  rectFor(context, pageRect)

  const elements = [page, ...Array.from(page.querySelectorAll<HTMLElement>('*'))]
  elements.forEach((element) => paintElementBox(context, element, pageScale))
  paintImages(context, page, pageScale)
  paintText(context, page, pageScale)
  context.restore()
  return canvas
}

export async function downloadResumePng(pages: HTMLElement[], filename: string) {
  if (!pages.length) throw new Error('没有可导出的简历页面。')
  if ('fonts' in document) await document.fonts.ready
  await Promise.all(pages.flatMap((page) => Array.from(page.querySelectorAll<HTMLImageElement>('img')).map((image) => image.decode())))

  const spacing = 28
  const maxHeight = 30_000
  const unscaledHeight = pages.length * PAGE_HEIGHT + (pages.length - 1) * spacing
  const resolution = Math.min(2, maxHeight / unscaledHeight)
  const pageHeight = Math.ceil(PAGE_HEIGHT * resolution)
  const gap = Math.ceil(spacing * resolution)
  const output = document.createElement('canvas')
  output.width = Math.ceil(PAGE_WIDTH * resolution)
  output.height = pages.length * pageHeight + (pages.length - 1) * gap
  const context = output.getContext('2d')
  if (!context) throw new Error('无法创建图片画布。')
  context.fillStyle = '#f1f3f6'
  context.fillRect(0, 0, output.width, output.height)

  for (const [index, page] of pages.entries()) {
    const raster = rasterizePage(page, resolution)
    context.drawImage(raster, 0, index * (pageHeight + gap))
  }

  const png = await new Promise<Blob>((resolve, reject) => {
    output.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 生成失败，请重试。')), 'image/png')
  })
  const url = URL.createObjectURL(png)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'resume'}.png`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
