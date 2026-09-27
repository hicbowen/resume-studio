import { createBlankResume, createId, optionalResumeModuleCatalog, resumeSectionOrder, resumeTemplateIds, type ResumeData, type ResumeDocument, type ResumeModule, type ResumeModuleItem, type ResumeModuleKind, type ResumeTemplateId, type ResumeTypographyScale, type ResumeWorkspace } from './model'
import { sampleResume } from './sample'

const STORAGE_KEY = 'resume-studio.workspace.v1'

function isWorkspace(value: unknown): value is ResumeWorkspace {
  if (!value || typeof value !== 'object') return false
  const workspace = value as Partial<ResumeWorkspace>
  return Array.isArray(workspace.documents) && typeof workspace.activeId === 'string'
}

export function createDocument(name: string, data = createBlankResume()): ResumeDocument {
  return { id: createId(), name, updatedAt: new Date().toISOString(), data }
}

export function loadWorkspace(): ResumeWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isWorkspace(parsed) && parsed.documents.length > 0 && parsed.documents.every((document) => document && typeof document.id === 'string' && typeof document.name === 'string' && isResumeData(document.data))) {
        const documents = parsed.documents.map((document) => ({
          ...document,
          updatedAt: typeof document.updatedAt === 'string' && !Number.isNaN(Date.parse(document.updatedAt)) ? document.updatedAt : '',
          data: normalizeResumeData(document.data),
        }))
        const activeId = documents.some((document) => document.id === parsed.activeId)
          ? parsed.activeId
          : documents[0].id
        return { documents, activeId }
      }
    }
  } catch {
    // A damaged or unavailable local record falls back to a usable sample document.
  }

  const sample = createDocument('产品设计师 · 示例简历', sampleResume)
  return { documents: [sample], activeId: sample.id }
}

export function saveWorkspace(workspace: ResumeWorkspace) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

export function isResumeData(value: unknown): value is ResumeDocument['data'] {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<ResumeDocument['data']>
  return Boolean(
    data.profile &&
      Array.isArray(data.experience) &&
      Array.isArray(data.projects) &&
      Array.isArray(data.education) &&
      Array.isArray(data.skills) &&
      data.visibility && typeof data.visibility === 'object',
  )
}

function normalizeModule(value: unknown): ResumeModule | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ResumeModule>
  const validKinds: ResumeModuleKind[] = [...optionalResumeModuleCatalog.map(({ kind }) => kind), 'custom']
  if (typeof candidate.id !== 'string' || !candidate.id || typeof candidate.kind !== 'string' || !validKinds.includes(candidate.kind as ResumeModuleKind)) return null
  const items: ResumeModuleItem[] = Array.isArray(candidate.items)
    ? candidate.items.filter((item): item is ResumeModuleItem => Boolean(item && typeof item === 'object' && typeof item.id === 'string')).map((item) => ({
      id: item.id,
      title: typeof item.title === 'string' ? item.title : '',
      subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
      time: typeof item.time === 'string' ? item.time : '',
      description: typeof item.description === 'string' ? item.description : '',
    }))
    : []
  const defaultTitle = optionalResumeModuleCatalog.find(({ kind }) => kind === candidate.kind)?.title ?? '自定义模块'
  return {
    id: candidate.id,
    kind: candidate.kind as ResumeModuleKind,
    title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim().slice(0, 60) : defaultTitle,
    items,
  }
}

export function normalizeResumeData(value: unknown): ResumeData {
  if (!isResumeData(value)) throw new Error('文件中没有有效的简历数据。')
  const defaults = createBlankResume()
  const candidate = value as ResumeData & { sectionOrder?: unknown; modules?: unknown }
  const modules = Array.isArray(candidate.modules)
    ? candidate.modules.map(normalizeModule).filter((module): module is ResumeModule => module !== null).filter((module, index, all) => all.findIndex((item) => item.id === module.id) === index)
    : []
  const validSections = new Set<string>([...resumeSectionOrder, ...modules.map((module) => module.id)])
  const savedOrder = Array.isArray(candidate.sectionOrder)
    ? candidate.sectionOrder.filter((section, index, order): section is string => typeof section === 'string' && validSections.has(section) && order.indexOf(section) === index)
    : []
  const savedTypographyScale = candidate.typographyScale
  const typographyScale: ResumeTypographyScale = savedTypographyScale === 1 || savedTypographyScale === 2 || savedTypographyScale === 3 || savedTypographyScale === 4 || savedTypographyScale === 5
    ? savedTypographyScale
    : defaults.typographyScale
  const savedTemplateId = candidate.templateId
  const templateId: ResumeTemplateId = typeof savedTemplateId === 'string' && resumeTemplateIds.includes(savedTemplateId as ResumeTemplateId)
    ? savedTemplateId as ResumeTemplateId
    : defaults.templateId
  const avatarDataUrl = typeof candidate.profile.avatarDataUrl === 'string' && candidate.profile.avatarDataUrl.length <= 900_000 && /^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/]+=*$/i.test(candidate.profile.avatarDataUrl)
    ? candidate.profile.avatarDataUrl
    : ''
  const showAvatar = Boolean(avatarDataUrl) && (typeof candidate.profile.showAvatar === 'boolean' ? candidate.profile.showAvatar : true)
  const visibility = { ...defaults.visibility, ...candidate.visibility }
  modules.forEach((module) => {
    if (typeof visibility[module.id] !== 'boolean') visibility[module.id] = true
  })
  return {
    ...defaults,
    ...candidate,
    profile: { ...defaults.profile, ...candidate.profile, avatarDataUrl, showAvatar },
    modules,
    visibility,
    sectionOrder: [...savedOrder, ...resumeSectionOrder.filter((section) => !savedOrder.includes(section))],
    typographyScale,
    templateId,
  }
}
