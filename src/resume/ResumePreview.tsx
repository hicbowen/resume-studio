import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { resumeSectionOrder, type CoreResumeSection, type EducationItem, type ExperienceItem, type ProjectItem, type ResumeData, type ResumeModuleItem, type ResumeTypographyScale, type ResumeTemplateId } from './model'
import { getResumeTemplate } from './templates'
import { sampleResume } from './sample'

type Block = { key: string; content: ReactNode; overflowParts?: ReactNode[] }

const sectionNames: Record<CoreResumeSection, string> = {
  summary: '个人简介',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育背景',
  skills: '专业技能',
} as const

const typographyOptions: Array<{ value: ResumeTypographyScale; label: string }> = [
  { value: 1, label: '更小一点' },
  { value: 2, label: '稍小' },
  { value: 3, label: '标准' },
  { value: 4, label: '稍大' },
  { value: 5, label: '更大一点' },
]

function SectionTitle({ children, ordinal }: { children: ReactNode; ordinal: number }) {
  return (
    <div className="resume-section-title">
      <span className="resume-section-marker" aria-hidden="true">{String(ordinal).padStart(2, '0')}</span>
      <h2>{children}</h2>
      <span className="resume-section-title-rule" aria-hidden="true" />
    </div>
  )
}

function formatPeriod(start: string, end: string) {
  return [start, end].filter(Boolean).join(' — ')
}

function HighlightText({ text, emphasizeMetrics }: { text: string; emphasizeMetrics: boolean }) {
  if (!emphasizeMetrics) return text
  const matches = Array.from(text.matchAll(/\d+(?:\.\d+)?(?:\s?(?:%|％|万元|元|美元|万|亿|倍|个|项|人|家|天|周|月|年|小时|分钟|秒|k|K|w|W))?(?:\+|以上|以内)?/g))
  if (!matches.length) return text
  const parts: ReactNode[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    const start = match.index ?? cursor
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<strong className="resume-metric" key={`metric-${index}`}>{match[0]}</strong>)
    cursor = start + match[0].length
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function HighlightList({ items, emphasizeMetrics = false }: { items: string[]; emphasizeMetrics?: boolean }) {
  const highlights = items.map((item) => item.trim()).filter(Boolean)
  if (!highlights.length) return null
  return (
    <ul className="resume-highlights">
      {highlights.map((item, index) => <li key={`${index}-${item}`}><HighlightText text={item} emphasizeMetrics={emphasizeMetrics} /></li>)}
    </ul>
  )
}

function ExperienceEntry({ item, emphasizeMetrics = false }: { item: ExperienceItem; emphasizeMetrics?: boolean }) {
  return (
    <article className="resume-entry">
      <div className="resume-entry-heading">
        <div>
          <h3>{item.role || '职位名称'}</h3>
          <p className="resume-entry-subtitle">{[item.company, item.location].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
      <HighlightList items={item.highlights} emphasizeMetrics={emphasizeMetrics} />
    </article>
  )
}

function experienceOverflowParts(item: ExperienceItem, emphasizeMetrics = false): ReactNode[] {
  const parts: ReactNode[] = [
    <article className="resume-entry" key="heading">
      <div className="resume-entry-heading">
        <div><h3>{item.role || '职位名称'}</h3><p className="resume-entry-subtitle">{[item.company, item.location].filter(Boolean).join(' · ')}</p></div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
    </article>,
  ]
  item.highlights.map((highlight) => highlight.trim()).filter(Boolean).forEach((highlight, index) => {
    parts.push(<article className="resume-entry resume-entry-fragment" key={`highlight-${index}`}><ul className="resume-highlights"><li><HighlightText text={highlight} emphasizeMetrics={emphasizeMetrics} /></li></ul></article>)
  })
  return parts
}

function ProjectEntry({ item, emphasizeMetrics = false }: { item: ProjectItem; emphasizeMetrics?: boolean }) {
  return (
    <article className="resume-entry">
      <div className="resume-entry-heading">
        <div>
          <h3>{item.name || '项目名称'}</h3>
          <p className="resume-entry-subtitle">{[item.role, item.link].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
      <HighlightList items={item.highlights} emphasizeMetrics={emphasizeMetrics} />
    </article>
  )
}

function projectOverflowParts(item: ProjectItem, emphasizeMetrics = false): ReactNode[] {
  const parts: ReactNode[] = [
    <article className="resume-entry" key="heading">
      <div className="resume-entry-heading">
        <div><h3>{item.name || '项目名称'}</h3><p className="resume-entry-subtitle">{[item.role, item.link].filter(Boolean).join(' · ')}</p></div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
    </article>,
  ]
  item.highlights.map((highlight) => highlight.trim()).filter(Boolean).forEach((highlight, index) => {
    parts.push(<article className="resume-entry resume-entry-fragment" key={`highlight-${index}`}><ul className="resume-highlights"><li><HighlightText text={highlight} emphasizeMetrics={emphasizeMetrics} /></li></ul></article>)
  })
  return parts
}

function EducationEntry({ item }: { item: EducationItem }) {
  return (
    <article className="resume-entry">
      <div className="resume-entry-heading">
        <div>
          <h3>{item.school || '学校名称'}</h3>
          <p className="resume-entry-subtitle">{[item.degree, item.major].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
      {item.details.trim() && <p className="resume-entry-details">{item.details}</p>}
    </article>
  )
}

function educationOverflowParts(item: EducationItem): ReactNode[] {
  const parts: ReactNode[] = [
    <article className="resume-entry" key="heading">
      <div className="resume-entry-heading">
        <div><h3>{item.school || '学校名称'}</h3><p className="resume-entry-subtitle">{[item.degree, item.major].filter(Boolean).join(' · ')}</p></div>
        <span className="resume-period">{formatPeriod(item.startDate, item.endDate)}</span>
      </div>
    </article>,
  ]
  if (item.details.trim()) parts.push(<article className="resume-entry" key="details"><p className="resume-entry-details">{item.details}</p></article>)
  return parts
}

function ModuleEntry({ item }: { item: ResumeModuleItem }) {
  return (
    <article className="resume-entry">
      <div className="resume-entry-heading">
        <div>
          <h3>{item.title || '条目名称'}</h3>
          {item.subtitle && <p className="resume-entry-subtitle">{item.subtitle}</p>}
        </div>
        {item.time && <span className="resume-period">{item.time}</span>}
      </div>
      {item.description.trim() && <p className="resume-entry-details">{item.description}</p>}
    </article>
  )
}

function moduleOverflowParts(item: ResumeModuleItem): ReactNode[] {
  const parts: ReactNode[] = [
    <article className="resume-entry" key="heading">
      <div className="resume-entry-heading">
        <div><h3>{item.title || '条目名称'}</h3>{item.subtitle && <p className="resume-entry-subtitle">{item.subtitle}</p>}</div>
        {item.time && <span className="resume-period">{item.time}</span>}
      </div>
    </article>,
  ]
  item.description.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    parts.push(<article className="resume-entry resume-entry-fragment" key={`description-${index}`}><p className="resume-entry-details">{line}</p></article>)
  })
  return parts
}

function appendEntryBlocks<T extends { id: string }>(
  blocks: Block[],
  key: string,
  title: string,
  items: T[],
  renderEntry: (item: T) => ReactNode,
  renderOverflowParts: (item: T) => ReactNode[],
  ordinal: number,
) {
  if (!items.length) return
  const [first, ...rest] = items
  const firstParts = renderOverflowParts(first)
  blocks.push({
    key: `${key}-first`,
    content: <section className="resume-section-group"><SectionTitle ordinal={ordinal}>{title}</SectionTitle>{renderEntry(first)}</section>,
    overflowParts: [<section className="resume-section-group" key="heading"><SectionTitle ordinal={ordinal}>{title}</SectionTitle>{firstParts[0]}</section>, ...firstParts.slice(1)],
  })
  rest.forEach((item) => blocks.push({ key: `${key}-${item.id}`, content: renderEntry(item), overflowParts: renderOverflowParts(item) }))
}

function buildBlocks(data: ResumeData): Block[] {
  const blocks: Block[] = []
  const profile = data.profile
  const emphasizeMetrics = data.templateId === 'data-impact'
  const contacts = [
    { label: '邮箱', value: profile.email },
    { label: '电话', value: profile.phone },
    { label: '城市', value: profile.location },
    { label: '网站', value: profile.website },
  ].filter((contact) => contact.value)

  blocks.push({
    key: 'profile',
    content: (
      <header className={`resume-header${profile.avatarDataUrl && profile.showAvatar ? ' has-avatar' : ''}`}>
        <div className="resume-header-top">
          <div className="resume-header-info">
            <div className="resume-name-group">
              <h1>{profile.fullName || '你的姓名'}</h1>
              {profile.headline && <p>{profile.headline}</p>}
            </div>
            {contacts.length > 0 && (
              <div className="resume-contact-list">
                {contacts.map((contact) => (
                  <span className="resume-contact-item" key={contact.label}>
                    <span className="resume-contact-label">{contact.label}</span>
                    <span className="resume-contact-value">{contact.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {profile.avatarDataUrl && profile.showAvatar && <img className="resume-avatar" src={profile.avatarDataUrl} alt="个人头像" />}
        </div>
      </header>
    ),
  })

  data.sectionOrder.forEach((section) => {
    if (data.visibility[section] === false) return
    const ordinal = blocks.filter((block) => block.key.endsWith('-first') || block.key === 'summary' || block.key === 'skills').length + 1
    if (section === 'summary' && data.summary.trim()) {
      blocks.push({
        key: 'summary',
        content: <section className="resume-section-group"><SectionTitle ordinal={ordinal}>{sectionNames.summary}</SectionTitle><p className="resume-summary">{data.summary}</p></section>,
      })
    }
    if (section === 'experience') {
      appendEntryBlocks(blocks, 'experience', sectionNames.experience, data.experience, (item) => <ExperienceEntry item={item} emphasizeMetrics={emphasizeMetrics} />, (item) => experienceOverflowParts(item, emphasizeMetrics), ordinal)
    }
    if (section === 'projects') {
      appendEntryBlocks(blocks, 'projects', sectionNames.projects, data.projects, (item) => <ProjectEntry item={item} emphasizeMetrics={emphasizeMetrics} />, (item) => projectOverflowParts(item, emphasizeMetrics), ordinal)
    }
    if (section === 'education') {
      appendEntryBlocks(blocks, 'education', sectionNames.education, data.education, (item) => <EducationEntry item={item} />, educationOverflowParts, ordinal)
    }
    if (section === 'skills' && data.skills.some((skill) => skill.trim())) {
      blocks.push({
        key: 'skills',
        content: (
          <section className="resume-section-group">
            <SectionTitle ordinal={ordinal}>{sectionNames.skills}</SectionTitle>
            <div className="resume-skill-list">{data.skills.filter((skill) => skill.trim()).map((skill, index) => <span key={`${index}-${skill}`}>{skill}</span>)}</div>
          </section>
        ),
      })
    }
    if (!resumeSectionOrder.includes(section as CoreResumeSection)) {
      const module = data.modules.find((item) => item.id === section)
      if (module) appendEntryBlocks(blocks, module.id, module.title, module.items, (item) => <ModuleEntry item={item} />, moduleOverflowParts, ordinal)
    }
  })
  return blocks
}

function PaginatedBlocks({ blocks, pageKeys }: { blocks: Block[]; pageKeys: string[] }) {
  const byKey = new Map(blocks.map((block) => [block.key, block]))
  return pageKeys.map((key) => {
    const fragmentMarker = '::part::'
    const partIndex = key.includes(fragmentMarker) ? Number(key.split(fragmentMarker).at(-1)) : -1
    const blockKey = partIndex >= 0 ? key.slice(0, key.lastIndexOf(fragmentMarker)) : key
    const block = byKey.get(blockKey)
    const content = partIndex >= 0 ? block?.overflowParts?.[partIndex] : block?.content
    return block && content ? <div className="resume-block" data-block-key={key} key={key}>{content}</div> : null
  })
}

// Thumbnails share the real sheet markup and styles, so the gallery cannot drift
// from the exported resume. Use fictional sample content rather than private data.
const thumbnailBlocks = buildBlocks(sampleResume)
export function ResumeTemplateThumbnail({ templateId }: { templateId: ResumeTemplateId }) {
  return (
    <div className="resume-page template-preview-sheet" data-template-id={templateId}>
      <div className="page-content">
        {thumbnailBlocks.map((block) => <div className="resume-block" key={block.key}>{block.content}</div>)}
      </div>
    </div>
  )
}

export default function ResumePreview({ data, onTypographyScaleChange, onOpenThemePicker }: { data: ResumeData; onTypographyScaleChange: (scale: ResumeTypographyScale) => void; onOpenThemePicker: () => void }) {
  const blocks = useMemo(() => buildBlocks(data), [data])
  const typographyScale = data.typographyScale ?? 3
  const fontScaleFactors = [1.02, 1.06, 1.1, 1.14, 1.18]
  const [pages, setPages] = useState<string[][]>(() => [blocks.map((block) => block.key)])
  const measurementContentRef = useRef<HTMLDivElement>(null)
  const measurementPageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(0.76)
  const [manualScale, setManualScale] = useState<number | null>(null)
  const scale = manualScale ?? fitScale

  useLayoutEffect(() => {
    const content = measurementContentRef.current
    if (!content) return
    // Mobile editor view hides this subtree. Measure again when it becomes visible,
    // and after font metrics change, instead of paginating zero-height blocks.
    const paginate = () => {
      const availableHeight = content.getBoundingClientRect().height
      if (availableHeight <= 0) return
      const gap = Number.parseFloat(getComputedStyle(content).rowGap) || 14
      const normalHeights = new Map(Array.from(content.querySelectorAll<HTMLElement>('[data-measure-key]'))
        .map((element) => [element.dataset.measureKey ?? '', element.getBoundingClientRect().height] as const))
      const partHeights = new Map(Array.from(content.querySelectorAll<HTMLElement>('[data-fragment-key]'))
        .map((element) => [element.dataset.fragmentKey ?? '', element.getBoundingClientRect().height] as const))
      const measurements = blocks.flatMap((block) => {
        const normalHeight = normalHeights.get(block.key) ?? 0
        if (normalHeight <= availableHeight || !block.overflowParts?.length) return [[block.key, normalHeight] as const]
        return block.overflowParts.map((_, index) => {
          const key = `${block.key}::part::${index}`
          return [key, partHeights.get(key) ?? 0] as const
        })
      })
      const nextPages: string[][] = []
      let page: string[] = []
      let used = 0

      measurements.forEach(([key, height]) => {
        const addition = (page.length ? gap : 0) + height
        if (page.length && used + addition > availableHeight) {
          nextPages.push(page)
          page = []
          used = 0
        }
        page.push(key)
        used += (page.length > 1 ? gap : 0) + height
      })
      if (page.length || nextPages.length === 0) nextPages.push(page)
      setPages((current) => JSON.stringify(current) === JSON.stringify(nextPages) ? current : nextPages)
    }
    paginate()
    const observer = new ResizeObserver(paginate)
    observer.observe(content)
    content.querySelectorAll<HTMLElement>('[data-measure-key], [data-fragment-key]').forEach((element) => observer.observe(element))
    let disposed = false
    document.fonts.ready.then(() => { if (!disposed) paginate() })
    return () => { disposed = true; observer.disconnect() }
  }, [blocks, typographyScale, data.templateId])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const page = measurementPageRef.current
    if (!viewport || !page) return
    const resizeObserver = new ResizeObserver(() => {
      const pageWidth = page.getBoundingClientRect().width
      const styles = window.getComputedStyle(viewport)
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      const availableWidth = Math.max(200, viewport.clientWidth - horizontalPadding - 8)
      setFitScale(Math.min(1, Math.max(0.32, availableWidth / pageWidth)))
    })
    resizeObserver.observe(viewport)
    return () => resizeObserver.disconnect()
  }, [])

  const scaleStyle = { '--page-scale': scale } as CSSProperties
  const typographyStyle = { '--resume-base-font-size': `${11.5 * fontScaleFactors[typographyScale - 1]}px` } as CSSProperties
  const existingKeys = new Set(blocks.flatMap((block) => [block.key, ...(block.overflowParts ?? []).map((_, index) => `${block.key}::part::${index}`)]))

  return (
    <div className="preview-workspace">
      <div className="preview-toolbar">
        <div className="preview-metadata">
          <button type="button" className="template-picker-trigger" aria-haspopup="dialog" aria-label={`当前主题：${getResumeTemplate(data.templateId).name}，点击切换`} onClick={onOpenThemePicker}>
            <span className="template-picker-label">主题</span>
            <span className="template-picker-name">{getResumeTemplate(data.templateId).name}</span>
            <svg className="template-picker-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" /></svg>
          </button>
          <span className="context-separator" />
          <span className="preview-page-meta" aria-label={`A4 纵向，${pages.length} 页`}>
            <span>A4 纵向</span><span className="preview-page-meta-dot" aria-hidden="true">·</span><span className="preview-page-count">{pages.length} 页</span>
          </span>
        </div>
        <div className="preview-toolbar-actions">
          <div className="typography-controls" role="group" aria-label="简历字号">
            <label htmlFor="resume-typography-scale">字号</label>
            <select
              id="resume-typography-scale"
              aria-label="简历字号"
              value={typographyScale}
              onChange={(event) => onTypographyScaleChange(Number(event.target.value) as ResumeTypographyScale)}
            >
              {typographyOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <span className="preview-control-separator" aria-hidden="true" />
          <div className="zoom-controls" role="group" aria-label="预览缩放">
            <div className="zoom-stepper">
              <button type="button" aria-label="缩小预览" onClick={() => setManualScale(Math.max(0.45, (manualScale ?? fitScale) - 0.08))}>−</button>
              <output aria-live="polite">{Math.round(scale * 100)}%</output>
              <button type="button" aria-label="放大预览" onClick={() => setManualScale(Math.min(1.25, (manualScale ?? fitScale) + 0.08))}>+</button>
            </div>
            <button type="button" className="fit-button" onClick={() => setManualScale(null)}>适合窗口</button>
          </div>
        </div>
      </div>

      <div className="preview-scroll" ref={viewportRef}>
        <div className="preview-pages" id="print-area">
          {pages.map((keys, index) => (
            <div className="page-slot" style={scaleStyle} key={`page-${index}`}>
              <article className="resume-page" data-template-id={data.templateId} style={typographyStyle}>
                <div className="page-content">
                  <PaginatedBlocks blocks={blocks} pageKeys={keys.filter((key) => existingKeys.has(key))} />
                </div>
                {pages.length > 1 && (
                  <footer className="resume-page-footer" aria-label={`第 ${index + 1} 页，共 ${pages.length} 页`}>
                    <span>{index + 1} / {pages.length}</span>
                  </footer>
                )}
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="measurement-stage" aria-hidden="true">
        <div className="resume-page" data-template-id={data.templateId} ref={measurementPageRef} style={typographyStyle}>
          <div className="page-content" ref={measurementContentRef}>
            {blocks.map((block) => <div className="resume-block" data-measure-key={block.key} key={block.key}>{block.content}</div>)}
            <div className="measure-overflow-options">
              {blocks.flatMap((block) => block.overflowParts?.map((part, index) => {
                const key = `${block.key}::part::${index}`
                return <div className="resume-block" data-fragment-key={key} key={key}>{part}</div>
              }) ?? [])}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
