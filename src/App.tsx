import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import ResumePreview, { ResumeTemplateThumbnail } from './resume/ResumePreview'
import { downloadResumePng } from './resume/export'
import { resumeTemplatePresets } from './resume/templates'
import {
  createBlankResume,
  createId,
  optionalResumeModuleCatalog,
  type BuiltInModuleKind,
  type CoreResumeSection,
  type EducationItem,
  type ExperienceItem,
  type ProjectItem,
  type ResumeData,
  type ResumeModule,
  type ResumeModuleItem,
  type ResumeModuleKind,
  type ResumeProfile,
  type ResumeTypographyScale,
  type ResumeWorkspace,
  resumeSectionOrder,
} from './resume/model'
import { createDocument, isResumeData, loadWorkspace, normalizeResumeData, saveWorkspace } from './resume/storage'
import './App.css'
import './resume/themes.css'

type IconName = 'plus' | 'copy' | 'trash' | 'eye' | 'eyeOff' | 'up' | 'down' | 'download' | 'file' | 'documents' | 'camera' | 'check' | 'spark' | 'close' | 'grip'

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.1 3.7M6.2 6.2C3.5 7.8 2 12 2 12s3.5 6 10 6c1.1 0 2.1-.2 3-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    up: <><path d="m6 14 6-6 6 6" /></>,
    down: <><path d="m6 10 6 6 6-6" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    documents: <><rect x="7" y="3" width="13" height="16" rx="2" /><path d="M4 7v12a2 2 0 0 0 2 2h10M10 8h7M10 12h7" /></>,
    camera: <><path d="M14 4h-4l-1.5 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L14 4Z" /><circle cx="12" cy="12.5" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    grip: <path d="M8 5h.01M8 12h.01M8 19h.01M16 5h.01M16 12h.01M16 19h.01" strokeWidth={3} />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>
}

function IconButton({ label, icon, onClick, disabled, tone = 'default' }: {
  label: string
  icon: IconName
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}) {
  return <button type="button" className={`icon-button ${tone === 'danger' ? 'danger' : ''}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}><Icon name={icon} /></button>
}

async function compressAvatar(file: File) {
  if (!file.type.match(/^image\/(?:jpeg|png|webp)$/)) throw new Error('请上传 JPG、PNG 或 WebP 图片。')
  if (file.size > 8 * 1024 * 1024) throw new Error('头像文件不能超过 8 MB。')

  const bitmap = await createImageBitmap(file)
  try {
    const maxDimension = 384
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法处理这张图片，请换一张再试。')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const avatarDataUrl = canvas.toDataURL('image/jpeg', 0.84)
    if (avatarDataUrl.length > 900_000) throw new Error('图片无法压缩到本地保存限制内，请换一张图片。')
    return avatarDataUrl
  } finally {
    bitmap.close()
  }
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 4, hint }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function EditorSection({ id, number, title, summary, expanded, onExpandToggle, visible, onToggle, onRemove, children }: {
  id: string
  number: string
  title: string
  summary?: string
  expanded: boolean
  onExpandToggle: () => void
  visible?: boolean
  onToggle?: () => void
  onRemove?: () => void
  children: ReactNode
}) {
  return (
    <section data-editor-section={id} className={`editor-section ${expanded ? 'section-expanded' : 'section-collapsed'} ${visible === false ? 'section-muted' : ''}`}>
      <div className="editor-section-heading">
        <button type="button" className="section-trigger" aria-expanded={expanded} aria-controls={`section-content-${id}`} onClick={onExpandToggle}>
          <span className="section-number">{number}</span>
          <span className="section-labels"><span className="section-title">{title}</span>{summary && <span className="section-summary">{summary}</span>}</span>
          <span className="section-chevron"><Icon name="down" size={16} /></span>
        </button>
        <div className="editor-section-actions">
          {onToggle && <IconButton label={visible ? '在预览中隐藏' : '在预览中显示'} icon={visible ? 'eye' : 'eyeOff'} onClick={onToggle} />}
          {onRemove && expanded && <IconButton label="移除模块（内容可恢复）" icon="trash" onClick={onRemove} tone="danger" />}
        </div>
      </div>
      {expanded && <div className="editor-section-content" id={`section-content-${id}`}>{children}</div>}
    </section>
  )
}

type ItemCardProps<T extends { id: string }> = {
  item: T
  index: number
  total: number
  title: string
  subtitle: string
  onChange: (item: T) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  children: (update: (patch: Partial<T>) => void) => ReactNode
}

function ItemCard<T extends { id: string }>({ item, index, total, title, subtitle, onChange, onMove, onDelete, children }: ItemCardProps<T>) {
  return (
    <article className="item-card">
      <div className="item-card-heading">
        <div className="item-card-title"><strong>{title || '新条目'}</strong><span>{subtitle}</span></div>
        <div className="item-card-actions">
          <IconButton label="上移" icon="up" onClick={() => onMove(-1)} disabled={index === 0} />
          <IconButton label="下移" icon="down" onClick={() => onMove(1)} disabled={index === total - 1} />
          <IconButton label="删除条目" icon="trash" onClick={onDelete} tone="danger" />
        </div>
      </div>
      <div className="item-card-fields">{children((patch) => onChange({ ...item, ...patch }))}</div>
    </article>
  )
}

function RepeatableSection<T extends { id: string }>({
  title, items, onChange, onAdd, getTitle, getSubtitle, addLabel, children,
}: {
  title: string
  items: T[]
  onChange: (items: T[]) => void
  onAdd: () => T
  getTitle: (item: T) => string
  getSubtitle: (item: T) => string
  addLabel?: string
  children: (item: T, update: (patch: Partial<T>) => void) => ReactNode
}) {
  const updateItem = (nextItem: T) => onChange(items.map((item) => item.id === nextItem.id ? nextItem : item))
  const moveItem = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= items.length) return
    const next = [...items]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    onChange(next)
  }
  return (
    <>
      <div className="repeater-list">
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} index={index} total={items.length} title={getTitle(item)} subtitle={getSubtitle(item)} onChange={updateItem} onMove={(direction) => moveItem(index, direction)} onDelete={() => onChange(items.filter((current) => current.id !== item.id))}>
            {(update) => children(item, update)}
          </ItemCard>
        ))}
      </div>
      <button type="button" className="add-item-button" onClick={() => onChange([...items, onAdd()])}><Icon name="plus" size={15} />{addLabel ?? `添加${title.replace('经历', '').replace('背景', '')}`}</button>
    </>
  )
}

function highlightsToText(highlights: string[]) {
  return highlights.join('\n')
}

function textToHighlights(text: string) {
  return text.split('\n')
}

function dateFields(start: string, end: string, update: (patch: { startDate: string; endDate: string }) => void) {
  return <div className="field-grid date-grid"><Field label="开始时间" value={start} placeholder="2022.06" onChange={(startDate) => update({ startDate, endDate: end })} /><Field label="结束时间" value={end} placeholder="至今" onChange={(endDate) => update({ startDate: start, endDate })} /></div>
}

const sectionTitles: Record<CoreResumeSection, string> = {
  summary: '个人简介',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育背景',
  skills: '专业技能',
}

const moduleItemLabels: Record<ResumeModuleKind, { title: string; subtitle: string; description: string }> = {
  competition: { title: '竞赛名称', subtitle: '奖项 / 名次', description: '竞赛成果与个人贡献' },
  award: { title: '奖项名称', subtitle: '颁发机构', description: '补充说明' },
  certification: { title: '证书名称', subtitle: '颁发机构', description: '补充说明' },
  campus: { title: '组织 / 活动', subtitle: '担任职务', description: '主要经历与成果' },
  language: { title: '语言', subtitle: '熟练程度', description: '补充说明' },
  volunteering: { title: '服务项目', subtitle: '服务组织', description: '服务内容与成果' },
  custom: { title: '条目名称', subtitle: '副标题 / 组织', description: '内容描述' },
}

type AiOptimizationSource = { id: string; name: string; updatedAt: string; data: ResumeData }
type AiOptimizationReview = { data: ResumeData; changeSummary: string[]; claimsToVerify: string[] }
type ResumeImportPayload = { name: string; data: ResumeData }

const aiWizardStepTitles = ['岗位信息', '复制提示词', '粘贴结果', '核对并导入']
const mobileResumeHintStorageKey = 'resume-studio:mobile-resume-hint-dismissed'
const documentUpdatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
const documentPickerUpdatedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
const documentPickerTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function parseResumeImport(raw: string, fallbackName = '导入的简历'): ResumeImportPayload {
  const parsed: unknown = JSON.parse(raw)
  const candidate = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed
  if (!isResumeData(candidate)) throw new Error('JSON 中没有有效的简历数据。')
  const sourceName = isRecord(parsed) && typeof parsed.name === 'string' ? parsed.name.trim() : ''
  return { name: sourceName || fallbackName, data: normalizeResumeData(candidate) }
}

function formatDocumentUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt)
  return Number.isNaN(date.getTime()) ? '更新时间暂无记录' : `更新于 ${documentUpdatedAtFormatter.format(date)}`
}

function getDocumentPickerLabel(document: { id: string; name: string; updatedAt: string }, documents: Array<{ id: string; name: string; updatedAt: string }>) {
  const name = document.name || '未命名简历'
  const sameName = documents.filter((candidate) => (candidate.name || '未命名简历') === name)
  if (sameName.length < 2) return name

  const date = new Date(document.updatedAt)
  const calendarDay = Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  const sameCalendarDay = sameName.every((candidate) => {
    const candidateDate = new Date(candidate.updatedAt)
    return !Number.isNaN(candidateDate.getTime())
      && `${candidateDate.getFullYear()}-${candidateDate.getMonth()}-${candidateDate.getDate()}` === calendarDay
  })
  const timestamp = Number.isNaN(date.getTime())
    ? ''
    : sameCalendarDay ? documentPickerTimeFormatter.format(date) : documentPickerUpdatedAtFormatter.format(date)
  const sameTimestamp = sameName.filter((candidate) => {
    const candidateDate = new Date(candidate.updatedAt)
    const candidateTimestamp = Number.isNaN(candidateDate.getTime())
      ? ''
      : sameCalendarDay ? documentPickerTimeFormatter.format(candidateDate) : documentPickerUpdatedAtFormatter.format(candidateDate)
    return candidateTimestamp === timestamp
  })
  const duplicateNumber = sameTimestamp.findIndex((candidate) => candidate.id === document.id) + 1
  const suffix = timestamp || `副本 ${sameName.findIndex((candidate) => candidate.id === document.id) + 1}`
  return `${name} · ${suffix}${sameTimestamp.length > 1 ? ` ${duplicateNumber}` : ''}`
}

function assertAiItemList(value: unknown, label: string, textFields: string[], listFields: string[] = []) {
  if (!Array.isArray(value)) throw new Error(`${label}格式不正确，必须是数组。`)
  const ids = new Set<string>()
  value.forEach((item, index) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) throw new Error(`${label}第 ${index + 1} 条缺少有效 ID，请让 AI 保留原始 ID 后重新生成。`)
    if (ids.has(item.id)) throw new Error(`${label}中存在重复 ID，请让 AI 保留原始 ID 后重新生成。`)
    ids.add(item.id)
    textFields.forEach((field) => {
      if (typeof item[field] !== 'string') throw new Error(`${label}第 ${index + 1} 条的「${field}」不是文本。`)
    })
    listFields.forEach((field) => {
      if (!Array.isArray(item[field]) || !(item[field] as unknown[]).every((entry) => typeof entry === 'string')) {
        throw new Error(`${label}第 ${index + 1} 条的「${field}」格式不正确。`)
      }
    })
  })
}

function validateAiResumeData(value: unknown): asserts value is ResumeData {
  if (!isResumeData(value) || !isRecord(value)) throw new Error('没有找到有效的简历数据。')
  if (!isRecord(value.profile)) throw new Error('简历基本信息格式不正确。')
  const profile = value.profile as unknown as Record<string, unknown>
  for (const field of ['fullName', 'headline', 'email', 'phone', 'location', 'website', 'avatarDataUrl']) {
    if (typeof profile[field] !== 'string') throw new Error(`基本信息「${field}」必须是文本。`)
  }
  if (typeof value.profile.showAvatar !== 'boolean') throw new Error('基本信息「showAvatar」必须是布尔值。')
  if (typeof value.summary !== 'string') throw new Error('个人简介必须是文本。')
  assertAiItemList(value.experience, '工作经历', ['role', 'company', 'location', 'startDate', 'endDate'], ['highlights'])
  assertAiItemList(value.projects, '项目经历', ['name', 'role', 'link', 'startDate', 'endDate'], ['highlights'])
  assertAiItemList(value.education, '教育经历', ['school', 'degree', 'major', 'startDate', 'endDate', 'details'])
  if (!Array.isArray(value.skills) || !value.skills.every((skill) => typeof skill === 'string')) throw new Error('专业技能必须是文本数组。')
  if (value.modules !== undefined) {
    if (!Array.isArray(value.modules)) throw new Error('其他模块格式不正确。')
    assertAiItemList(value.modules, '其他模块', ['kind', 'title'], [])
    const validKinds = new Set<string>([...optionalResumeModuleCatalog.map(({ kind }) => kind), 'custom'])
    value.modules.forEach((module, moduleIndex) => {
      if (!isRecord(module) || !Array.isArray(module.items)) throw new Error(`其他模块第 ${moduleIndex + 1} 项内容格式不正确。`)
      if (!validKinds.has(String(module.kind))) throw new Error(`其他模块第 ${moduleIndex + 1} 项类型不受支持。`)
      assertAiItemList(module.items, `「${String(module.title)}」`, ['title', 'subtitle', 'time', 'description'])
    })
  }
}

function buildAiOptimizationPrompt(source: AiOptimizationSource, jobTitle: string, company: string, jobDescription: string) {
  const promptResume: ResumeData = {
    ...source.data,
    profile: {
      ...source.data.profile,
      fullName: '[姓名由本地恢复]',
      email: '[联系方式由本地恢复]',
      phone: '[联系方式由本地恢复]',
      location: '[所在地由本地恢复]',
      website: '[个人网站由本地恢复]',
      avatarDataUrl: '',
      showAvatar: false,
    },
  }
  const resumeJson = JSON.stringify(promptResume, null, 2)
  return [
    '你是一名严谨的简历优化顾问。请基于求职者提供的真实简历，针对目标岗位 JD 优化简历内容。',
    '要求：',
    '1. 只能使用原简历中明确提供的事实，不得编造公司、项目、职责、时间、数字、成果、证书或技能。',
    '2. 可以调整表达、突出与岗位相关的经验、优化技能顺序；保留所有真实经历，不要擅自删除条目。',
    '3. 保留每条经历和模块的 id；保留原有数据结构，不增加原简历没有的经历。',
    '4. 姓名、联系方式、所在地、个人网站已脱敏占位，请原样保留；网站会在导入时从本地原简历恢复。',
    '5. 如果 JD 要求的能力无法从原简历证实，请不要补写，列入 claimsToVerify。',
    '6. 只返回一个合法 JSON 对象，不要 Markdown 代码围栏、解释文字或注释。',
    '',
    '岗位信息：',
    `岗位名称：${jobTitle.trim() || '未填写'}`,
    `公司：${company.trim() || '未填写'}`,
    '',
    '岗位 JD：',
    jobDescription.trim(),
    '',
    '原始简历 JSON：',
    resumeJson,
    '',
    '返回对象必须严格采用以下外层结构；以下只是结构示意，resume 必须替换为完整简历对象：',
    '{',
    '  "format": "resume-studio-ai-result",',
    '  "schemaVersion": 1,',
    '  "resume": {},',
    '  "changeSummary": [],',
    '  "claimsToVerify": []',
    '}',
  ].join('\n')
}

function parseAiOptimizationResult(raw: string, source: ResumeData): AiOptimizationReview {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const parsed: unknown = JSON.parse(fenced?.[1] ?? trimmed)
  if (!isRecord(parsed) || parsed.format !== 'resume-studio-ai-result' || parsed.schemaVersion !== 1) {
    throw new Error('结果格式或版本不正确，请使用本流程生成的提示词重新生成 JSON。')
  }
  validateAiResumeData(parsed.resume)

  const optimized = normalizeResumeData({
    ...parsed.resume,
    profile: {
      ...parsed.resume.profile,
      fullName: source.profile.fullName,
      email: source.profile.email,
      phone: source.profile.phone,
      location: source.profile.location,
      website: source.profile.website,
      avatarDataUrl: source.profile.avatarDataUrl,
      showAvatar: source.profile.showAvatar,
    },
    modules: parsed.resume.modules ?? source.modules,
    visibility: source.visibility,
    sectionOrder: source.sectionOrder,
    typographyScale: source.typographyScale,
    templateId: source.templateId,
  })

  const changedSections = [
    source.profile.headline !== optimized.profile.headline && '求职目标',
    source.summary !== optimized.summary && '个人简介',
    JSON.stringify(source.experience) !== JSON.stringify(optimized.experience) && '工作经历',
    JSON.stringify(source.projects) !== JSON.stringify(optimized.projects) && '项目经历',
    JSON.stringify(source.education) !== JSON.stringify(optimized.education) && '教育背景',
    JSON.stringify(source.skills) !== JSON.stringify(optimized.skills) && '专业技能',
    JSON.stringify(source.modules) !== JSON.stringify(optimized.modules) && '其他模块',
  ].filter((label): label is string => Boolean(label))
  const changeSummary = Array.isArray(parsed.changeSummary)
    ? parsed.changeSummary.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 12)
    : []
  const claimsToVerify = Array.isArray(parsed.claimsToVerify)
    ? parsed.claimsToVerify.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 12)
    : []

  return {
    data: optimized,
    changeSummary: changeSummary.length ? changeSummary : changedSections.length ? changedSections.map((section) => `${section}已调整`) : ['未检测到内容变化，请确认这份结果是否正确。'],
    claimsToVerify,
  }
}

function moveArrayItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function SortableOrderRow({ section, title, index, summary, visible }: { section: string; title: string; index: number; summary: string; visible: boolean }) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: section,
    index,
    transition: { duration: 190, easing: 'cubic-bezier(0.2, 0, 0, 1)', idle: true },
  })

  return (
    <div ref={ref} className={`section-order-row ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}>
      <button ref={handleRef} type="button" className="section-order-handle" aria-label={`拖动${title}排序。按空格开始，使用方向键移动，空格确认，Escape 取消。`} title="拖动排序">
        <Icon name="grip" size={18} />
      </button>
      <span className="section-order-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="section-order-name">{title}</span>
      <span className="section-order-summary">{summary}</span>
      {!visible && <span className="section-order-hidden">预览隐藏</span>}
    </div>
  )
}

function App() {
  const [workspace, setWorkspace] = useState<ResumeWorkspace>(loadWorkspace)
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const [showMobileResumeHint, setShowMobileResumeHint] = useState(() => {
    try {
      return window.localStorage.getItem(mobileResumeHintStorageKey) !== 'true'
    } catch {
      return true
    }
  })
  const [pngBusy, setPngBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [documentManagerOpen, setDocumentManagerOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [sectionOrderOpen, setSectionOrderOpen] = useState(false)
  const [modulePickerOpen, setModulePickerOpen] = useState(false)
  const [customModuleTitleDraft, setCustomModuleTitleDraft] = useState('')
  const [avatarHoverActive, setAvatarHoverActive] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['profile'])
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [aiWizardOpen, setAiWizardOpen] = useState(false)
  const [aiWizardStep, setAiWizardStep] = useState(0)
  const [aiSource, setAiSource] = useState<AiOptimizationSource | null>(null)
  const [aiJobTitle, setAiJobTitle] = useState('')
  const [aiCompany, setAiCompany] = useState('')
  const [aiJobDescription, setAiJobDescription] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPromptCopied, setAiPromptCopied] = useState(false)
  const [aiResultText, setAiResultText] = useState('')
  const [aiReview, setAiReview] = useState<AiOptimizationReview | null>(null)
  const [aiWizardError, setAiWizardError] = useState('')
  const [importExportOpen, setImportExportOpen] = useState(false)
  const [clipboardImportOpen, setClipboardImportOpen] = useState(false)
  const [clipboardImportText, setClipboardImportText] = useState('')
  const [clipboardImportError, setClipboardImportError] = useState('')
  const [clipboardImportCandidate, setClipboardImportCandidate] = useState<ResumeImportPayload | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const importExportRef = useRef<HTMLDivElement>(null)
  const importExportTriggerRef = useRef<HTMLButtonElement>(null)
  const clipboardImportTextareaRef = useRef<HTMLTextAreaElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!themePickerOpen) return
    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [themePickerOpen])
  const aiResultInputRef = useRef<HTMLInputElement>(null)
  const aiWizardTriggerRef = useRef<HTMLButtonElement>(null)
  const aiStepHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousAiWizardOpenRef = useRef(false)
  const pendingModuleFocusRef = useRef<string | null>(null)
  const activeDocumentRowRef = useRef<HTMLElement>(null)
  const activeDocument = workspace.documents.find((document) => document.id === workspace.activeId) ?? workspace.documents[0]
  const data = activeDocument?.data ?? createBlankResume()
  const hasResumeContent = Object.values(data.profile).some((value) => typeof value === 'string' && value.trim())
    || Boolean(data.summary.trim())
    || data.experience.length > 0
    || data.projects.length > 0
    || data.education.length > 0
    || data.skills.some((skill) => skill.trim())

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        saveWorkspace(workspace)
      } catch {
        setNotice('浏览器本地存储不可用，请先导出 JSON 备份。')
      }
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [workspace])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!documentManagerOpen || !activeDocument) return
    const frame = window.requestAnimationFrame(() => activeDocumentRowRef.current?.scrollIntoView({ block: 'nearest' }))
    return () => window.cancelAnimationFrame(frame)
  }, [documentManagerOpen, activeDocument?.id])

  useEffect(() => {
    if (!documentManagerOpen && !themePickerOpen && !sectionOrderOpen && !modulePickerOpen && !aiWizardOpen && !clipboardImportOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDocumentManagerOpen(false)
        setThemePickerOpen(false)
        setSectionOrderOpen(false)
        setModulePickerOpen(false)
        setAiWizardOpen(false)
        setClipboardImportOpen(false)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [documentManagerOpen, themePickerOpen, sectionOrderOpen, modulePickerOpen, aiWizardOpen, clipboardImportOpen])

  useEffect(() => {
    if (!importExportOpen) return
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !importExportRef.current?.contains(event.target)) setImportExportOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImportExportOpen(false)
        importExportTriggerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [importExportOpen])

  useEffect(() => {
    if (!clipboardImportOpen) return
    const frame = window.requestAnimationFrame(() => clipboardImportTextareaRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [clipboardImportOpen])

  useEffect(() => {
    if (aiWizardOpen) {
      const frame = window.requestAnimationFrame(() => aiStepHeadingRef.current?.focus({ preventScroll: true }))
      previousAiWizardOpenRef.current = true
      return () => window.cancelAnimationFrame(frame)
    }
    if (previousAiWizardOpenRef.current) aiWizardTriggerRef.current?.focus({ preventScroll: true })
    previousAiWizardOpenRef.current = false
  }, [aiWizardOpen, aiWizardStep])

  useEffect(() => {
    if (modulePickerOpen || !pendingModuleFocusRef.current) return
    const sectionId = pendingModuleFocusRef.current
    const frame = window.requestAnimationFrame(() => {
      const section = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-section]')).find((element) => element.dataset.editorSection === sectionId)
      if (!section) return
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const field = section.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="file"]), textarea')
      if (field) field.focus({ preventScroll: true })
      else section.querySelector<HTMLButtonElement>('.add-item-button')?.focus({ preventScroll: true })
      pendingModuleFocusRef.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [modulePickerOpen, activeDocument?.id, data.sectionOrder])

  function updateData(updater: (current: ResumeData) => ResumeData) {
    setWorkspace((current) => ({
      ...current,
      documents: current.documents.map((document) => document.id === current.activeId
        ? { ...document, data: updater(document.data), updatedAt: new Date().toISOString() }
        : document),
    }))
  }

  function updateModule(moduleId: string, updater: (module: ResumeModule) => ResumeModule) {
    updateData((current) => ({ ...current, modules: current.modules.map((module) => module.id === moduleId ? updater(module) : module) }))
  }

  function updateProfile<K extends keyof ResumeProfile>(field: K, value: ResumeProfile[K]) {
    updateData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }))
  }

  async function uploadAvatar(file?: File) {
    if (!file || !activeDocument) return
    const documentId = activeDocument.id
    try {
      const avatarDataUrl = await compressAvatar(file)
      setWorkspace((current) => ({
        ...current,
        documents: current.documents.map((document) => document.id === documentId
          ? { ...document, data: { ...document.data, profile: { ...document.data.profile, avatarDataUrl, showAvatar: true } }, updatedAt: new Date().toISOString() }
          : document),
      }))
      setNotice('头像已保存在此设备。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '头像处理失败，请换一张图片。')
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      setAvatarHoverActive(false)
    }
  }

  function toggleSection(section: string) {
    updateData((current) => ({ ...current, visibility: { ...current.visibility, [section]: !current.visibility[section] } }))
  }

  function toggleEditorSection(sectionId: string) {
    setExpandedSections((current) => current.includes(sectionId)
      ? current.filter((id) => id !== sectionId)
      : [...current, sectionId])
  }

  function updateTypographyScale(typographyScale: ResumeTypographyScale) {
    updateData((current) => ({ ...current, typographyScale }))
  }

  function handleSectionOrderDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const { source } = event.operation
    if (!isSortable(source) || source.initialIndex === source.index) return
    updateData((current) => ({ ...current, sectionOrder: moveArrayItem(current.sectionOrder, source.initialIndex, source.index) }))
  }

  function resetSectionOrder() {
    updateData((current) => ({
      ...current,
      sectionOrder: [...resumeSectionOrder, ...current.sectionOrder.filter((section) => !resumeSectionOrder.includes(section as CoreResumeSection))],
    }))
  }

  function activateModule(module: ResumeModule) {
    pendingModuleFocusRef.current = module.id
    setExpandedSections((current) => current.includes(module.id) ? current : [...current, module.id])
    updateData((current) => ({
      ...current,
      sectionOrder: current.sectionOrder.includes(module.id) ? current.sectionOrder : [...current.sectionOrder, module.id],
      visibility: { ...current.visibility, [module.id]: true },
    }))
  }

  function addBuiltInModule(kind: BuiltInModuleKind) {
    const existing = data.modules.find((module) => module.kind === kind)
    if (existing) {
      if (!data.sectionOrder.includes(existing.id)) activateModule(existing)
      return
    }
    const definition = optionalResumeModuleCatalog.find((module) => module.kind === kind)
    if (!definition) return
    const module: ResumeModule = { id: createId(), kind, title: definition.title, items: [] }
    pendingModuleFocusRef.current = module.id
    setExpandedSections((current) => [...current, module.id])
    updateData((current) => ({
      ...current,
      modules: [...current.modules, module],
      sectionOrder: [...current.sectionOrder, module.id],
      visibility: { ...current.visibility, [module.id]: true },
    }))
  }

  function addCustomModule() {
    const title = customModuleTitleDraft.trim()
    if (!title) return
    const module: ResumeModule = { id: createId(), kind: 'custom', title: title.slice(0, 60), items: [] }
    pendingModuleFocusRef.current = module.id
    setExpandedSections((current) => [...current, module.id])
    updateData((current) => ({
      ...current,
      modules: [...current.modules, module],
      sectionOrder: [...current.sectionOrder, module.id],
      visibility: { ...current.visibility, [module.id]: true },
    }))
    setCustomModuleTitleDraft('')
  }

  function removeModule(moduleId: string) {
    updateData((current) => ({ ...current, sectionOrder: current.sectionOrder.filter((section) => section !== moduleId) }))
    setNotice('模块已移除，之后可从“添加模块”中恢复。')
  }

  function renameDocument(documentId: string, value: string) {
    setWorkspace((current) => ({
      ...current,
      documents: current.documents.map((document) => document.id === documentId ? { ...document, name: value, updatedAt: new Date().toISOString() } : document),
    }))
  }

  function createNewDocumentName() {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const baseName = `新建简历 · ${date} ${time}`
    const existingNames = new Set(workspace.documents.map((document) => document.name))
    if (!existingNames.has(baseName)) return baseName
    let suffix = 2
    while (existingNames.has(`${baseName} (${suffix})`)) suffix += 1
    return `${baseName} (${suffix})`
  }

  function newDocument() {
    const document = createDocument(createNewDocumentName())
    setWorkspace((current) => ({ documents: [...current.documents, document], activeId: document.id }))
  }

  function duplicateDocument(documentId = activeDocument?.id) {
    const source = workspace.documents.find((document) => document.id === documentId)
    if (!source) return
    const duplicate = createDocument(`${source.name}（副本）`, JSON.parse(JSON.stringify(source.data)) as ResumeData)
    setWorkspace((current) => ({ documents: [...current.documents, duplicate], activeId: duplicate.id }))
  }

  function deleteDocument(documentId = activeDocument?.id) {
    const target = workspace.documents.find((document) => document.id === documentId)
    if (!target || !window.confirm(`确定删除“${target.name || '未命名简历'}”吗？此操作无法撤销。`)) return
    setWorkspace((current) => {
      const remaining = current.documents.filter((document) => document.id !== documentId)
      if (!remaining.length) {
        const blank = createDocument('未命名简历')
        return { documents: [blank], activeId: blank.id }
      }
      return { documents: remaining, activeId: current.activeId === documentId ? remaining[0].id : current.activeId }
    })
    if (renamingDocumentId === documentId) setRenamingDocumentId(null)
  }

  function startRename(documentId: string, name: string) {
    setRenamingDocumentId(documentId)
    setRenameDraft(name)
  }

  function saveRename() {
    if (!renamingDocumentId) return
    renameDocument(renamingDocumentId, renameDraft.trim() || '未命名简历')
    setRenamingDocumentId(null)
  }

  function dismissMobileResumeHint() {
    setShowMobileResumeHint(false)
    try {
      window.localStorage.setItem(mobileResumeHintStorageKey, 'true')
    } catch {
      // The hint still dismisses for this session when storage is unavailable.
    }
  }

  function selectDocument(documentId: string) {
    dismissMobileResumeHint()
    setWorkspace((current) => ({ ...current, activeId: documentId }))
    setDocumentManagerOpen(false)
    setRenamingDocumentId(null)
  }

  function serializeActiveResume() {
    if (!activeDocument) return ''
    return JSON.stringify({ schemaVersion: 1, name: activeDocument.name, data: activeDocument.data }, null, 2)
  }

  function downloadJson() {
    if (!activeDocument) return
    const content = serializeActiveResume()
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeDocument.name || 'resume'}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setImportExportOpen(false)
    setNotice('已导出简历 JSON。')
  }

  async function copyResumeJson() {
    if (!activeDocument) return
    try {
      await navigator.clipboard.writeText(serializeActiveResume())
      setImportExportOpen(false)
      setNotice('简历 JSON 已复制到剪切板。')
    } catch {
      setNotice('复制失败，请检查剪切板权限，或改为导出 JSON 文件。')
    }
  }

  async function importJson(file?: File) {
    if (!file) return
    try {
      const importedPayload = parseResumeImport(await file.text(), file.name.replace(/\.json$/i, '') || '导入的简历')
      const imported = createDocument(importedPayload.name, importedPayload.data)
      setWorkspace((current) => ({ documents: [...current.documents, imported], activeId: imported.id }))
      setImportExportOpen(false)
      setNotice('简历已导入。')
    } catch (error) {
      setNotice(error instanceof SyntaxError ? '无法解析这个 JSON 文件，请检查文件内容。' : error instanceof Error ? error.message : '无法读取这个 JSON 文件。')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function openClipboardImport() {
    setImportExportOpen(false)
    setClipboardImportText('')
    setClipboardImportError('')
    setClipboardImportCandidate(null)
    setClipboardImportOpen(true)
  }

  async function pasteResumeJsonFromClipboard() {
    try {
      if (!navigator.clipboard?.readText) throw new Error('浏览器不支持读取剪切板，请在文本框中手动粘贴。')
      const text = await navigator.clipboard.readText()
      if (!text.trim()) throw new Error('剪切板没有可导入的内容。')
      setClipboardImportText(text)
      setClipboardImportCandidate(null)
      setClipboardImportError('')
    } catch (error) {
      setClipboardImportError(error instanceof Error && !error.message.includes('permission') && !error.message.includes('denied')
        ? error.message
        : '浏览器未允许读取剪切板，请在文本框中手动粘贴。')
    }
  }

  function validateClipboardImport() {
    try {
      const payload = parseResumeImport(clipboardImportText, '剪切板导入简历')
      setClipboardImportCandidate(payload)
      setClipboardImportError('')
    } catch (error) {
      setClipboardImportCandidate(null)
      setClipboardImportError(error instanceof SyntaxError ? '无法解析 JSON，请检查粘贴内容。' : error instanceof Error ? error.message : '无法读取这份简历数据。')
    }
  }

  function confirmClipboardImport() {
    if (!clipboardImportCandidate) return
    const imported = createDocument(clipboardImportCandidate.name, clipboardImportCandidate.data)
    setWorkspace((current) => ({ documents: [...current.documents, imported], activeId: imported.id }))
    setClipboardImportOpen(false)
    setClipboardImportCandidate(null)
    setNotice('已将剪切板中的简历导入为新简历。')
  }

  function openAiWizard() {
    if (!activeDocument) return
    const sourceChanged = aiSource?.id !== activeDocument.id || aiSource.updatedAt !== activeDocument.updatedAt
    if (sourceChanged) {
      const snapshot = JSON.parse(JSON.stringify(activeDocument.data)) as ResumeData
      setAiSource({ id: activeDocument.id, name: activeDocument.name, updatedAt: activeDocument.updatedAt, data: snapshot })
      setAiJobTitle(activeDocument.data.profile.headline)
      setAiCompany('')
      setAiJobDescription('')
      setAiPrompt('')
      setAiPromptCopied(false)
      setAiResultText('')
      setAiReview(null)
      setAiWizardError('')
      setAiWizardStep(0)
    }
    setAiWizardOpen(true)
  }

  function toggleImportExport() {
    dismissMobileResumeHint()
    setImportExportOpen((open) => !open)
  }

  function updateAiJobField(setter: (value: string) => void, value: string) {
    setter(value)
    setAiPrompt('')
    setAiPromptCopied(false)
    setAiReview(null)
    setAiWizardError('')
    setAiWizardStep(0)
  }

  function nextAiWizardStep() {
    setAiWizardError('')
    if (aiWizardStep === 0) {
      if (!aiJobDescription.trim()) {
        setAiWizardError('请先填写岗位 JD。')
        return
      }
      if (!aiSource) {
        setAiWizardError('找不到当前简历，请关闭向导后重试。')
        return
      }
      setAiPrompt(buildAiOptimizationPrompt(aiSource, aiJobTitle, aiCompany, aiJobDescription))
      setAiPromptCopied(false)
      setAiWizardStep(1)
      return
    }
    if (aiWizardStep === 1) {
      setAiWizardStep(2)
      return
    }
    if (aiWizardStep === 2) {
      if (!aiSource) {
        setAiWizardError('找不到原始简历，请关闭向导后重试。')
        return
      }
      try {
        setAiReview(parseAiOptimizationResult(aiResultText, aiSource.data))
        setAiWizardStep(3)
      } catch (error) {
        setAiWizardError(error instanceof Error ? error.message : '无法读取 AI 返回的 JSON。')
      }
    }
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt)
      setAiPromptCopied(true)
      setAiWizardError('')
    } catch {
      setAiPromptCopied(false)
      setAiWizardError('无法访问剪贴板。你可以在提示词框中全选并手动复制。')
    }
  }

  async function loadAiResultFile(file?: File) {
    if (!file) return
    try {
      const content = await file.text()
      setAiResultText(content)
      setAiReview(null)
      setAiWizardError('')
    } catch {
      setAiWizardError('无法读取这个 JSON 文件。')
    } finally {
      if (aiResultInputRef.current) aiResultInputRef.current.value = ''
    }
  }

  function createAiOptimizedCopy() {
    if (!aiSource || !aiReview) return
    const matchName = aiCompany.trim() || aiJobTitle.trim() || '岗位匹配'
    const name = `${aiSource.name || '简历'} · ${matchName}版`.slice(0, 60)
    const optimized = createDocument(name, JSON.parse(JSON.stringify(aiReview.data)) as ResumeData)
    setWorkspace((current) => ({ documents: [...current.documents, optimized], activeId: optimized.id }))
    setAiWizardOpen(false)
    setAiWizardStep(0)
    setAiSource(null)
    setNotice('已创建 AI 优化副本，原简历保持不变。')
  }

  async function downloadPng() {
    setPngBusy(true)
    try {
      const pages = Array.from(document.querySelectorAll<HTMLElement>('#print-area .resume-page'))
      const name = (activeDocument?.name || 'resume').replace(/[\\/:*?"<>|]/g, '-').trim()
      await downloadResumePng(pages, name)
      setNotice('PNG 图片已导出。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'PNG 导出失败，请重试。')
    } finally {
      setPngBusy(false)
    }
  }

  const profileFields: Array<{ key: Exclude<keyof ResumeProfile, 'avatarDataUrl' | 'showAvatar'>; label: string; placeholder: string; type?: string }> = [
    { key: 'fullName', label: '姓名', placeholder: '你的姓名' },
    { key: 'headline', label: '求职目标 / 职位', placeholder: '例如：产品设计师' },
    { key: 'email', label: '电子邮箱', placeholder: 'name@email.com', type: 'email' },
    { key: 'phone', label: '联系电话', placeholder: '+86 138 0000 0000' },
    { key: 'location', label: '所在地', placeholder: '城市 · 国家' },
    { key: 'website', label: '个人网站', placeholder: 'portfolio.com' },
  ]
  const sectionSummaries: Record<CoreResumeSection, string> = {
    summary: data.summary.trim() ? '已填写' : '未填写',
    experience: `${data.experience.length} 段`,
    projects: `${data.projects.length} 个`,
    education: `${data.education.length} 条`,
    skills: `${data.skills.filter((skill) => skill.trim()).length} 项`,
  }
  const sectionEditorProps = (section: CoreResumeSection) => ({
    id: section,
    number: String(data.sectionOrder.indexOf(section) + 2).padStart(2, '0'),
    title: sectionTitles[section],
    summary: sectionSummaries[section],
    expanded: expandedSections.includes(section),
    onExpandToggle: () => toggleEditorSection(section),
    visible: data.visibility[section],
    onToggle: () => toggleSection(section),
  })
  const sectionEditors: Record<CoreResumeSection, ReactNode> = {
    summary: (
      <EditorSection key="summary" {...sectionEditorProps('summary')}>
        <TextArea label="简介" value={data.summary} onChange={(summary) => updateData((current) => ({ ...current, summary }))} rows={5} placeholder="描述你的经验、专长和想解决的问题…" hint="建议 2–4 句话，突出与你的目标职位相关的能力。" />
      </EditorSection>
    ),
    experience: (
      <EditorSection key="experience" {...sectionEditorProps('experience')}>
        <RepeatableSection<ExperienceItem>
          title="工作经历" items={data.experience}
          onChange={(experience) => updateData((current) => ({ ...current, experience }))}
          onAdd={() => ({ id: createId(), role: '', company: '', location: '', startDate: '', endDate: '', highlights: [''] })}
          getTitle={(item) => item.role} getSubtitle={(item) => item.company}
        >
          {(item, update) => <>
            <div className="field-grid"><Field label="职位" value={item.role} placeholder="产品设计师" onChange={(role) => update({ role })} /><Field label="公司" value={item.company} placeholder="公司名称" onChange={(company) => update({ company })} /><Field label="地点" value={item.location} placeholder="上海" onChange={(location) => update({ location })} /></div>
            {dateFields(item.startDate, item.endDate, update)}
            <TextArea label="主要成果" value={highlightsToText(item.highlights)} onChange={(value) => update({ highlights: textToHighlights(value) })} rows={4} placeholder={'一条成果或职责占一行\n尽量用行动与结果说明影响'} hint="每行会作为一条简历要点。" />
          </>}
        </RepeatableSection>
      </EditorSection>
    ),
    projects: (
      <EditorSection key="projects" {...sectionEditorProps('projects')}>
        <RepeatableSection<ProjectItem>
          title="项目经历" items={data.projects}
          onChange={(projects) => updateData((current) => ({ ...current, projects }))}
          onAdd={() => ({ id: createId(), name: '', role: '', link: '', startDate: '', endDate: '', highlights: [''] })}
          getTitle={(item) => item.name} getSubtitle={(item) => item.role}
        >
          {(item, update) => <>
            <div className="field-grid"><Field label="项目名称" value={item.name} placeholder="项目名称" onChange={(name) => update({ name })} /><Field label="担任角色" value={item.role} placeholder="项目负责人" onChange={(role) => update({ role })} /><Field label="项目链接" value={item.link} placeholder="可选" onChange={(link) => update({ link })} /></div>
            {dateFields(item.startDate, item.endDate, update)}
            <TextArea label="项目成果" value={highlightsToText(item.highlights)} onChange={(value) => update({ highlights: textToHighlights(value) })} rows={4} placeholder="描述项目目标、你的贡献和结果" />
          </>}
        </RepeatableSection>
      </EditorSection>
    ),
    education: (
      <EditorSection key="education" {...sectionEditorProps('education')}>
        <RepeatableSection<EducationItem>
          title="教育背景" items={data.education}
          onChange={(education) => updateData((current) => ({ ...current, education }))}
          onAdd={() => ({ id: createId(), school: '', degree: '', major: '', startDate: '', endDate: '', details: '' })}
          getTitle={(item) => item.school} getSubtitle={(item) => [item.degree, item.major].filter(Boolean).join(' · ')}
        >
          {(item, update) => <>
            <div className="field-grid"><Field label="学校" value={item.school} placeholder="院校名称" onChange={(school) => update({ school })} /><Field label="学位" value={item.degree} placeholder="本科" onChange={(degree) => update({ degree })} /><Field label="专业" value={item.major} placeholder="专业名称" onChange={(major) => update({ major })} /></div>
            {dateFields(item.startDate, item.endDate, update)}
            <Field label="补充信息" value={item.details} placeholder="荣誉、课程或成就（可选）" onChange={(details) => update({ details })} />
          </>}
        </RepeatableSection>
      </EditorSection>
    ),
    skills: (
      <EditorSection key="skills" {...sectionEditorProps('skills')}>
        <TextArea label="技能列表" value={data.skills.join('\n')} onChange={(value) => updateData((current) => ({ ...current, skills: value.split('\n') }))} rows={4} placeholder={'用户研究\n产品策略\nFigma'} hint="每行填写一项技能，预览中会显示为标签。" />
      </EditorSection>
    ),
  }
  const getSectionTitle = (section: string) => sectionTitles[section as CoreResumeSection] ?? data.modules.find((module) => module.id === section)?.title ?? '简历模块'
  const getSectionSummary = (section: string) => section in sectionSummaries
    ? sectionSummaries[section as CoreResumeSection]
    : `${data.modules.find((module) => module.id === section)?.items.length ?? 0} 项`

  function renderOrderedSection(section: string, index: number) {
    const coreEditor = sectionEditors[section as CoreResumeSection]
    if (coreEditor) return coreEditor
    const module = data.modules.find((item) => item.id === section)
    if (!module) return null
    const labels = moduleItemLabels[module.kind]

    return (
      <EditorSection
        key={module.id}
        id={module.id}
        number={String(index + 2).padStart(2, '0')}
        title={module.title}
        summary={`${module.items.length} 项`}
        expanded={expandedSections.includes(module.id)}
        onExpandToggle={() => toggleEditorSection(module.id)}
        visible={data.visibility[module.id] !== false}
        onToggle={() => toggleSection(module.id)}
        onRemove={() => removeModule(module.id)}
      >
        {module.kind === 'custom' && <Field label="模块名称" value={module.title} placeholder="例如：作品发表" onChange={(title) => updateModule(module.id, (current) => ({ ...current, title }))} />}
        <RepeatableSection<ResumeModuleItem>
          title={module.title}
          addLabel="添加一条内容"
          items={module.items}
          onChange={(items) => updateModule(module.id, (current) => ({ ...current, items }))}
          onAdd={() => ({ id: createId(), title: '', subtitle: '', time: '', description: '' })}
          getTitle={(item) => item.title}
          getSubtitle={(item) => item.subtitle}
        >
          {(item, update) => <>
            <div className="field-grid">
              <Field label={labels.title} value={item.title} placeholder={labels.title} onChange={(title) => update({ title })} />
              <Field label={labels.subtitle} value={item.subtitle} placeholder={labels.subtitle} onChange={(subtitle) => update({ subtitle })} />
            </div>
            <Field label="时间" value={item.time} placeholder="例如：2024.05 或 2022.09 — 2023.06" onChange={(time) => update({ time })} />
            <TextArea label={labels.description} value={item.description} onChange={(description) => update({ description })} rows={3} placeholder="可填写主要内容、个人贡献或成果" />
          </>}
        </RepeatableSection>
      </EditorSection>
    )
  }

  function closeModulePicker() {
    setModulePickerOpen(false)
  }

  return (
    <div className="app-shell">
      <header className={`topbar${showMobileResumeHint ? ' has-mobile-resume-hint' : ''}`}>
        <a className="brand" href="#top" aria-label="纸间简历 Studio">
          <span className="brand-mark"><i /><i /><i /></span>
          <span className="brand-text">纸间 <small>RESUME STUDIO</small></span>
        </a>
        <div className="topbar-document-context">
          <span className="topbar-current-resume-label">当前简历</span>
          <label className="topbar-document-select" title="切换简历">
            <Icon name="documents" size={15} />
            <select aria-label="当前简历" value={activeDocument?.id ?? ''} onChange={(event) => selectDocument(event.target.value)}>
              {workspace.documents.map((document) => <option key={document.id} value={document.id}>{getDocumentPickerLabel(document, workspace.documents)}</option>)}
            </select>
            <Icon name="down" size={14} />
          </label>
          <button type="button" className="button button-secondary topbar-manage-button" aria-label="管理简历" title="管理简历" onClick={() => { dismissMobileResumeHint(); setDocumentManagerOpen(true) }}><Icon name="documents" size={15} /><span>管理简历</span></button>
        </div>
        <div className="topbar-actions">
          <div className="import-export-menu" ref={importExportRef}>
            <button
              ref={importExportTriggerRef}
              type="button"
              className="import-export-trigger"
              aria-label="导入 / 导出"
              title="导入 / 导出"
              aria-haspopup="true"
              aria-expanded={importExportOpen}
              onClick={toggleImportExport}
            >
              <Icon name="file" size={15} /><span className="import-export-label">导入 / 导出</span><Icon name="down" size={13} />
            </button>
            {importExportOpen && <div className="import-export-popover">
              <div className="import-export-group" aria-label="导入简历">
                <span className="import-export-group-title">导入</span>
                <button type="button" onClick={openClipboardImport}><Icon name="copy" size={15} />从剪切板导入</button>
                <button type="button" onClick={() => { setImportExportOpen(false); importInputRef.current?.click() }}><Icon name="file" size={15} />从 JSON 文件导入</button>
              </div>
              <div className="import-export-divider" />
              <div className="import-export-group" aria-label="导出简历">
                <span className="import-export-group-title">导出</span>
                <button type="button" onClick={() => void copyResumeJson()}><Icon name="copy" size={15} />复制简历 JSON</button>
                <button type="button" onClick={downloadJson}><Icon name="download" size={15} />导出 JSON 文件</button>
                <button type="button" disabled={pngBusy} onClick={() => { setImportExportOpen(false); void downloadPng() }}><Icon name="download" size={15} />{pngBusy ? '正在生成 PNG…' : '导出 PNG 图片'}</button>
                <button type="button" className="import-export-pdf-action" onClick={() => { setImportExportOpen(false); window.print() }}><Icon name="file" size={15} />导出 PDF</button>
              </div>
            </div>}
          </div>
          <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importJson(event.target.files?.[0])} />
        </div>
        {showMobileResumeHint && <div className="topbar-mobile-resume-hint" role="note">
          <span>切换简历；「管理简历」中可新建、整理。</span>
          <button type="button" aria-label="关闭简历提示" onClick={dismissMobileResumeHint}><Icon name="close" size={13} /></button>
        </div>}
      </header>

      <main className="workspace-layout" data-mobile-view={mobileView}>
        <div className="mobile-view-switch" role="group" aria-label="切换工作区视图">
          <button type="button" aria-controls="editor-pane" aria-pressed={mobileView === 'editor'} onClick={() => setMobileView('editor')}>编辑内容</button>
          <button type="button" aria-controls="preview-pane" aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>简历预览</button>
        </div>
        <aside id="editor-pane" className="editor-sidebar">
          <div className="editor-title-row">
            <h1>编辑内容</h1>
            <div className="editor-title-actions">
              <button ref={aiWizardTriggerRef} type="button" className="button button-primary" aria-label="AI 优化" title="AI 优化" onClick={openAiWizard}><Icon name="spark" size={14} /><span>AI 优化</span></button>
              <button type="button" className="button button-secondary" aria-label="调整简历顺序" title="调整简历顺序" onClick={() => setSectionOrderOpen(true)}><Icon name="grip" size={14} /><span>排序</span></button>
            </div>
          </div>

          <div className="editor-scroll">
            {!hasResumeContent && <p className="empty-resume-hint">从姓名和求职目标开始填写，右侧会同步预览。</p>}
            <EditorSection id="profile" number="01" title="基本信息" expanded={expandedSections.includes('profile')} onExpandToggle={() => toggleEditorSection('profile')}>
              <div className="field-grid">
                {profileFields.map(({ key, label, placeholder, type }) => <Field key={key} label={label} value={data.profile[key]} placeholder={placeholder} type={type} onChange={(value) => updateProfile(key, value)} />)}
              </div>
              <div className="avatar-field">
                <div className="avatar-field-label"><span className="field-label">头像</span><span>5:7证件照</span></div>
                <div className="avatar-field-actions">
                  <label
                    className={`avatar-upload-tile ${data.profile.avatarDataUrl ? 'has-avatar' : ''} ${avatarHoverActive ? 'avatar-hover-active' : ''}`}
                    title={data.profile.avatarDataUrl ? '更换头像' : '上传头像'}
                    onPointerMove={() => setAvatarHoverActive(true)}
                    onPointerLeave={() => setAvatarHoverActive(false)}
                    onClick={() => setAvatarHoverActive(false)}
                  >
                    {data.profile.avatarDataUrl
                      ? <><img className="avatar-thumbnail" src={data.profile.avatarDataUrl} alt="" /><span className="avatar-change-overlay"><Icon name="camera" size={17} /></span></>
                      : <span className="avatar-upload-placeholder"><Icon name="camera" size={17} /><span>上传</span></span>}
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" title={data.profile.avatarDataUrl ? '更换头像' : '上传头像'} aria-label={data.profile.avatarDataUrl ? '更换简历头像' : '上传简历头像'} onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                  </label>
                  <IconButton
                    label={data.profile.showAvatar ? '在简历中隐藏照片' : '在简历中显示照片'}
                    icon={data.profile.showAvatar ? 'eye' : 'eyeOff'}
                    onClick={() => updateProfile('showAvatar', !data.profile.showAvatar)}
                    disabled={!data.profile.avatarDataUrl}
                  />
                  {data.profile.avatarDataUrl && <IconButton label="删除头像" icon="trash" onClick={() => updateData((current) => ({ ...current, profile: { ...current.profile, avatarDataUrl: '', showAvatar: false } }))} tone="danger" />}
                </div>
              </div>
            </EditorSection>

            {data.sectionOrder.map((section, index) => renderOrderedSection(section, index))}

            <button type="button" className="add-module-button" onClick={() => setModulePickerOpen(true)}><Icon name="plus" size={16} />添加模块</button>

            <div className="sidebar-footer"><span>纸间 Studio · V1</span></div>
          </div>
        </aside>

        <section id="preview-pane" className="preview-panel" aria-label="简历预览">
          <ResumePreview data={data} onTypographyScaleChange={updateTypographyScale} onOpenThemePicker={() => setThemePickerOpen(true)} />
        </section>
      </main>
      {themePickerOpen && (
        <div className="modal-backdrop template-gallery-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setThemePickerOpen(false) }}>
          <section className="template-gallery-modal" role="dialog" aria-modal="true" aria-labelledby="template-gallery-title" aria-describedby="template-gallery-description">
            <header className="template-gallery-header">
              <div>
                <h2 id="template-gallery-title">选择简历主题</h2>
                <p id="template-gallery-description">只更换样式，简历内容、模块顺序和可见性保持不变。</p>
              </div>
              <button type="button" className="modal-close" aria-label="关闭主题库" onClick={() => setThemePickerOpen(false)}><Icon name="close" size={19} /></button>
            </header>
            <div className="template-gallery-grid" tabIndex={0} aria-label="简历主题列表，可滚动浏览">
              {resumeTemplatePresets.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={`template-card${data.templateId === template.id ? ' is-selected' : ''}`}
                  aria-pressed={data.templateId === template.id}
                  onClick={() => {
                    updateData((current) => ({ ...current, templateId: template.id }))
                    setThemePickerOpen(false)
                  }}
                >
                  <div className="template-preview-stage" aria-hidden="true">
                    <ResumeTemplateThumbnail templateId={template.id} />
                  </div>
                  <span className="template-card-copy">
                    <span className="template-card-title"><strong>{template.name}</strong>{data.templateId === template.id && <span className="template-card-current"><Icon name="check" size={12} />当前</span>}</span>
                    <span className="template-card-description">{template.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {clipboardImportOpen && (
        <div className="modal-backdrop clipboard-import-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClipboardImportOpen(false) }}>
          <section className="clipboard-import-modal" role="dialog" aria-modal="true" aria-labelledby="clipboard-import-title" aria-describedby="clipboard-import-description">
            <header className="clipboard-import-header">
              <div>
                <h2 id="clipboard-import-title">从剪切板导入</h2>
                <p id="clipboard-import-description">粘贴简历 JSON，确认后会新增一份简历，不会覆盖当前内容。</p>
              </div>
              <button type="button" className="modal-close" aria-label="关闭导入" onClick={() => setClipboardImportOpen(false)}><Icon name="close" size={19} /></button>
            </header>
            <div className="clipboard-import-toolbar">
              <span>简历 JSON</span>
              <button type="button" className="button button-secondary" onClick={() => void pasteResumeJsonFromClipboard()}><Icon name="copy" size={14} />粘贴剪切板内容</button>
            </div>
            <textarea
              ref={clipboardImportTextareaRef}
              className="clipboard-import-textarea"
              aria-label="粘贴简历 JSON"
              value={clipboardImportText}
              placeholder="在这里粘贴简历 JSON…"
              onChange={(event) => { setClipboardImportText(event.target.value); setClipboardImportCandidate(null); setClipboardImportError('') }}
            />
            {clipboardImportCandidate && <div className="clipboard-import-success" role="status"><Icon name="check" size={15} /><span>已识别「{clipboardImportCandidate.name}」，可以导入为新简历。</span></div>}
            {clipboardImportError && <p className="clipboard-import-error" role="alert">{clipboardImportError}</p>}
            <footer className="clipboard-import-footer">
              <button type="button" className="button button-secondary" onClick={() => setClipboardImportOpen(false)}>取消</button>
              {clipboardImportCandidate
                ? <button type="button" className="button button-primary" onClick={confirmClipboardImport}>导入为新简历</button>
                : <button type="button" className="button button-primary clipboard-import-primary" disabled={!clipboardImportText.trim()} onClick={validateClipboardImport}>校验 JSON</button>}
            </footer>
          </section>
        </div>
      )}
      {aiWizardOpen && (
        <div className="modal-backdrop ai-wizard-backdrop" role="presentation">
          <section className="ai-wizard-modal" role="dialog" aria-modal="true" aria-labelledby="ai-wizard-title" aria-describedby="ai-wizard-description">
            <header className="ai-wizard-header">
              <div>
                <h2 id="ai-wizard-title"><Icon name="spark" size={19} />AI 优化简历</h2>
                <p id="ai-wizard-description">复制提示词到你常用的 AI 平台，再把生成的 JSON 带回这里。</p>
              </div>
              <button type="button" className="modal-close" aria-label="关闭向导，草稿会保留" title="关闭向导，草稿会保留" onClick={() => setAiWizardOpen(false)}><Icon name="close" size={19} /></button>
            </header>

            <div className="ai-wizard-body">
              <nav className="ai-wizard-steps" aria-label="AI 优化步骤">
                {aiWizardStepTitles.map((title, index) => {
                  const completed = index === 0 ? Boolean(aiPrompt) : index === 1 ? aiPromptCopied : index === 2 ? Boolean(aiReview) : false
                  const available = index === 0 || (index === 1 && Boolean(aiPrompt)) || (index === 2 && Boolean(aiPrompt)) || (index === 3 && Boolean(aiReview))
                  return (
                    <button
                      type="button"
                      key={title}
                      className={`ai-wizard-step ${aiWizardStep === index ? 'is-active' : ''} ${completed ? 'is-complete' : ''}`}
                      aria-current={aiWizardStep === index ? 'step' : undefined}
                      disabled={!available}
                      onClick={() => setAiWizardStep(index)}
                    >
                      <span className="ai-wizard-step-number">{completed ? <Icon name="check" size={14} /> : String(index + 1).padStart(2, '0')}</span>
                      <span>{title}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="ai-wizard-content" role="tabpanel" aria-labelledby={`ai-step-title-${aiWizardStep}`}>
                {aiWizardStep === 0 && (
                  <section className="ai-wizard-panel">
                    <div className="ai-wizard-panel-heading">
                      <span>步骤 01</span>
                      <h3 ref={aiStepHeadingRef} tabIndex={-1} id="ai-step-title-0">准备岗位信息</h3>
                      <p>网站会把这份简历和岗位 JD 组合成提示词，不会直接连接 AI 平台。</p>
                    </div>
                    <div className="ai-wizard-source-card">
                      <span>当前简历</span>
                      <strong>{aiSource?.name || '未命名简历'}</strong>
                    </div>
                    <div className="ai-wizard-grid">
                      <label className="ai-wizard-field">
                        <span>目标岗位</span>
                        <input value={aiJobTitle} maxLength={100} placeholder="例如：高级产品设计师" onChange={(event) => updateAiJobField(setAiJobTitle, event.target.value)} />
                      </label>
                      <label className="ai-wizard-field">
                        <span>公司 <small>可选</small></span>
                        <input value={aiCompany} maxLength={100} placeholder="例如：某某科技" onChange={(event) => updateAiJobField(setAiCompany, event.target.value)} />
                      </label>
                    </div>
                    <label className="ai-wizard-field ai-jd-field">
                      <span>岗位 JD</span>
                      <textarea value={aiJobDescription} maxLength={30000} rows={10} placeholder="粘贴完整的岗位职责和任职要求…" onChange={(event) => updateAiJobField(setAiJobDescription, event.target.value)} />
                      <small>{aiJobDescription.length.toLocaleString()} / 30,000</small>
                    </label>
                    <p className="ai-wizard-privacy-note">提示词会包含简历经历和 JD，但会排除姓名、联系方式、所在地、个人网站和头像；导入时由本地原简历恢复。</p>
                  </section>
                )}

                {aiWizardStep === 1 && (
                  <section className="ai-wizard-panel">
                    <div className="ai-wizard-panel-heading">
                      <span>步骤 02</span>
                      <h3 ref={aiStepHeadingRef} tabIndex={-1} id="ai-step-title-1">复制优化提示词</h3>
                      <p>打开任意 AI 平台，将提示词粘贴到对话中，并要求它按指定格式返回 JSON。</p>
                    </div>
                    <div className="ai-prompt-toolbar">
                      <span>{aiPromptCopied ? '提示词已复制' : '提示词已根据当前简历和 JD 生成'}</span>
                      <button type="button" className="ai-copy-prompt" onClick={() => void copyAiPrompt()}><Icon name={aiPromptCopied ? 'check' : 'copy'} size={14} />{aiPromptCopied ? '再次复制' : '复制提示词'}</button>
                    </div>
                    <textarea className="ai-prompt-preview" aria-label="生成的 AI 优化提示词" readOnly value={aiPrompt} onFocus={(event) => event.currentTarget.select()} />
                    <p className="ai-wizard-privacy-note">复制后请切换到你选择的 AI 平台生成结果，再回到此向导继续。简历内容只会在你手动提交时发送给该平台。</p>
                    {aiWizardError && <p className="ai-wizard-error" role="alert">{aiWizardError}</p>}
                  </section>
                )}

                {aiWizardStep === 2 && (
                  <section className="ai-wizard-panel">
                    <div className="ai-wizard-panel-heading">
                      <span>步骤 03</span>
                      <h3 ref={aiStepHeadingRef} tabIndex={-1} id="ai-step-title-2">粘贴 AI 返回的 JSON</h3>
                      <p>粘贴 AI 返回的完整 JSON，也可以直接选择 .json 文件。</p>
                    </div>
                    <div className="ai-result-toolbar">
                      <span>AI 优化结果</span>
                      <button type="button" className="ai-file-button" onClick={() => aiResultInputRef.current?.click()}><Icon name="file" size={14} />选择 JSON 文件</button>
                      <input ref={aiResultInputRef} className="ai-result-file-input" type="file" accept="application/json,.json" aria-label="选择 AI 结果 JSON 文件" onChange={(event) => void loadAiResultFile(event.target.files?.[0])} />
                    </div>
                    <textarea className="ai-json-input" aria-label="粘贴 AI 结果 JSON" value={aiResultText} placeholder={'在这里粘贴 AI 返回的 JSON…\n\n请确认结果包含 resume-studio-ai-result 格式标记。'} onChange={(event) => { setAiResultText(event.target.value); setAiReview(null); setAiWizardError('') }} />
                    {aiWizardError && <p className="ai-wizard-error" role="alert">{aiWizardError}</p>}
                  </section>
                )}

                {aiWizardStep === 3 && aiReview && (
                  <section className="ai-wizard-panel">
                    <div className="ai-wizard-panel-heading">
                      <span>步骤 04</span>
                      <h3 ref={aiStepHeadingRef} tabIndex={-1} id="ai-step-title-3">核对优化结果</h3>
                      <p>确认后会新增一份优化简历，原简历和版式设置都会保留。</p>
                    </div>
                    <div className="ai-review-status"><span><Icon name="check" size={15} /></span><div><strong>JSON 校验通过</strong><small>将创建「{aiSource?.name || '简历'} · {aiCompany.trim() || aiJobTitle.trim() || '岗位匹配'}版」</small></div></div>
                    <section className="ai-review-section">
                      <h4>修改摘要</h4>
                      <ul>{aiReview.changeSummary.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                    </section>
                    <section className={`ai-review-section ${aiReview.claimsToVerify.length ? 'needs-verification' : ''}`}>
                      <h4>{aiReview.claimsToVerify.length ? '需要你核实' : '事实核对'}</h4>
                      {aiReview.claimsToVerify.length
                        ? <ul>{aiReview.claimsToVerify.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                        : <p>AI 未标记待核实内容。导入前仍建议检查经历、时间和成果数据是否准确。</p>}
                    </section>
                    <p className="ai-wizard-privacy-note">导入会保留原简历不变，并恢复本地的姓名、联系方式、头像、模块顺序和字号设置。</p>
                  </section>
                )}
              </div>
            </div>

            <footer className="ai-wizard-footer">
              <button type="button" className="ai-wizard-secondary" onClick={() => setAiWizardOpen(false)}>取消</button>
              <div>
                {aiWizardStep > 0 && <button type="button" className="ai-wizard-secondary" onClick={() => { setAiWizardError(''); setAiWizardStep((step) => Math.max(0, step - 1)) }}>上一步</button>}
                {aiWizardStep < 3
                  ? <button
                    type="button"
                    className="ai-wizard-primary"
                    disabled={(aiWizardStep === 1 && !aiPrompt) || (aiWizardStep === 2 && !aiResultText.trim())}
                    onClick={nextAiWizardStep}
                  >{aiWizardStep === 0 ? '生成提示词' : aiWizardStep === 2 ? '校验并预览' : '下一步'}</button>
                  : <button type="button" className="ai-wizard-primary" disabled={!aiReview} onClick={createAiOptimizedCopy}>导入为新简历</button>}
              </div>
            </footer>
          </section>
        </div>
      )}
      {documentManagerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDocumentManagerOpen(false) }}>
          <section className="document-modal" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
            <header className="document-modal-header">
              <h2 id="document-modal-title">管理简历</h2>
              <button type="button" className="modal-close" aria-label="关闭" onClick={() => setDocumentManagerOpen(false)}><Icon name="close" size={19} /></button>
            </header>
            <button type="button" className="document-new-button" onClick={newDocument}><Icon name="plus" size={16} />新建简历</button>
            <div className="document-list">
              {workspace.documents.map((document) => (
                <article ref={document.id === activeDocument?.id ? activeDocumentRowRef : null} className={`document-row ${document.id === activeDocument?.id ? 'is-active' : ''}`} key={document.id}>
                  {renamingDocumentId === document.id ? (
                    <form className="document-rename-form" onSubmit={(event) => { event.preventDefault(); saveRename() }}>
                      <input aria-label="简历名称" autoFocus maxLength={60} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} />
                      <button type="submit">保存</button>
                      <button type="button" onClick={() => setRenamingDocumentId(null)}>取消</button>
                    </form>
                  ) : (
                    <>
                      <button type="button" className="document-row-select" onClick={() => selectDocument(document.id)}>
                        <span className="document-row-content">
                          <span className="document-row-title-line">
                            <span className="document-row-name">{document.name || '未命名简历'}</span>
                            {document.id === activeDocument?.id && <span className="document-current-badge">当前</span>}
                          </span>
                          <span className="document-row-updated">{formatDocumentUpdatedAt(document.updatedAt)}</span>
                        </span>
                      </button>
                      <div className="document-row-actions">
                        <button type="button" onClick={() => startRename(document.id, document.name)}>重命名</button>
                        <button type="button" onClick={() => duplicateDocument(document.id)}>复制</button>
                        <button type="button" className="document-row-delete" onClick={() => deleteDocument(document.id)}>删除</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
            <div className="document-modal-footer">保存在此设备</div>
          </section>
        </div>
      )}
      {sectionOrderOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSectionOrderOpen(false) }}>
          <section className="section-order-modal" role="dialog" aria-modal="true" aria-labelledby="section-order-title" aria-describedby="section-order-help">
            <header className="document-modal-header">
              <h2 id="section-order-title">调整简历顺序</h2>
              <button type="button" className="modal-close" aria-label="关闭" onClick={() => setSectionOrderOpen(false)}><Icon name="close" size={19} /></button>
            </header>
            <p className="section-order-help" id="section-order-help">拖动左侧手柄调整，编辑区和预览会同步更新。</p>
            <DragDropProvider onDragEnd={handleSectionOrderDragEnd}>
              <div className="section-order-list">
                {data.sectionOrder.map((section, index) => (
                  <SortableOrderRow key={section} section={section} title={getSectionTitle(section)} index={index} summary={getSectionSummary(section)} visible={data.visibility[section] !== false} />
                ))}
              </div>
            </DragDropProvider>
            <footer className="section-order-footer">
              <button type="button" className="section-order-reset" onClick={resetSectionOrder}>恢复默认</button>
              <button type="button" className="section-order-done" onClick={() => setSectionOrderOpen(false)}>完成</button>
            </footer>
          </section>
        </div>
      )}
      {modulePickerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModulePicker() }}>
          <section className="module-picker-modal" role="dialog" aria-modal="true" aria-labelledby="module-picker-title" aria-describedby="module-picker-help">
            <header className="document-modal-header">
              <h2 id="module-picker-title">添加模块</h2>
              <button type="button" className="modal-close" aria-label="关闭" onClick={closeModulePicker}><Icon name="close" size={19} /></button>
            </header>
            <p className="module-picker-help" id="module-picker-help">只添加需要的内容，新增模块会放到编辑区末尾。</p>
            <div className="module-picker-scroll">
              {(['经历与活动', '资质与补充'] as const).map((group) => (
                <section className="module-catalog-group" key={group}>
                  <h3>{group}</h3>
                  <div className="module-catalog-list">
                    {optionalResumeModuleCatalog.filter((module) => module.group === group).map((definition) => {
                      const existing = data.modules.find((module) => module.kind === definition.kind)
                      const active = Boolean(existing && data.sectionOrder.includes(existing.id))
                      return (
                        <article className="module-option" key={definition.kind}>
                          <div className="module-option-copy"><strong>{definition.title}</strong><span>{definition.description}</span></div>
                          <button type="button" disabled={active} onClick={() => addBuiltInModule(definition.kind)}>{active ? '已添加' : existing ? '恢复' : '添加'}</button>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
              {data.modules.some((module) => module.kind === 'custom' && !data.sectionOrder.includes(module.id)) && (
                <section className="module-catalog-group">
                  <h3>已移除的自定义模块</h3>
                  <div className="module-catalog-list">
                    {data.modules.filter((module) => module.kind === 'custom' && !data.sectionOrder.includes(module.id)).map((module) => (
                      <article className="module-option" key={module.id}>
                        <div className="module-option-copy"><strong>{module.title}</strong><span>{module.items.length ? `${module.items.length} 条内容已保留` : '内容已保留'}</span></div>
                        <button type="button" onClick={() => activateModule(module)}>恢复</button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <form className="custom-module-form" onSubmit={(event) => { event.preventDefault(); addCustomModule() }}>
                <label htmlFor="custom-module-title">自定义模块</label>
                <div>
                  <input id="custom-module-title" maxLength={60} value={customModuleTitleDraft} onChange={(event) => setCustomModuleTitleDraft(event.target.value)} placeholder="例如：作品发表、培训经历" />
                  <button type="submit" disabled={!customModuleTitleDraft.trim()}><Icon name="plus" size={14} />创建</button>
                </div>
              </form>
            </div>
            <footer className="module-picker-footer"><button type="button" className="section-order-done" onClick={closeModulePicker}>完成</button></footer>
          </section>
        </div>
      )}
      {notice && <div className="toast" role="status"><span className="toast-dot" />{notice}</div>}
    </div>
  )
}

export default App
