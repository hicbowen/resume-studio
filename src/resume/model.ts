export type CoreResumeSection = 'summary' | 'experience' | 'projects' | 'education' | 'skills'
export type ResumeTypographyScale = 1 | 2 | 3 | 4 | 5
export const resumeTemplateIds = ['classic', 'gray-band', 'editorial', 'navy-ribbon', 'blue-dotted', 'ice-band', 'emerald-line', 'ledger', 'swiss-grid', 'executive-signature', 'data-impact'] as const
export type ResumeTemplateId = (typeof resumeTemplateIds)[number]
export const resumeSectionOrder: CoreResumeSection[] = ['summary', 'experience', 'projects', 'education', 'skills']

export const optionalResumeModuleCatalog = [
  { kind: 'competition', title: '竞赛经历', description: '竞赛名称、获奖情况与个人贡献', group: '经历与活动' },
  { kind: 'award', title: '荣誉奖项', description: '奖项名称、颁发机构与获奖时间', group: '资质与补充' },
  { kind: 'certification', title: '资格证书', description: '证书、资格与专业认证', group: '资质与补充' },
  { kind: 'campus', title: '校园经历', description: '学生组织、社团与校园活动', group: '经历与活动' },
  { kind: 'language', title: '语言能力', description: '语言种类与熟练程度', group: '资质与补充' },
  { kind: 'volunteering', title: '志愿服务', description: '志愿服务与社会实践经历', group: '经历与活动' },
] as const

export type BuiltInModuleKind = (typeof optionalResumeModuleCatalog)[number]['kind']
export type ResumeModuleKind = BuiltInModuleKind | 'custom'
export type ResumeModuleItem = {
  id: string
  title: string
  subtitle: string
  time: string
  description: string
}
export type ResumeModule = {
  id: string
  kind: ResumeModuleKind
  title: string
  items: ResumeModuleItem[]
}

export type ResumeProfile = {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  avatarDataUrl: string
  showAvatar: boolean
}

export type ExperienceItem = {
  id: string
  role: string
  company: string
  location: string
  startDate: string
  endDate: string
  highlights: string[]
}

export type ProjectItem = {
  id: string
  name: string
  role: string
  link: string
  startDate: string
  endDate: string
  highlights: string[]
}

export type EducationItem = {
  id: string
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
  details: string
}

export type ResumeData = {
  profile: ResumeProfile
  summary: string
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  skills: string[]
  modules: ResumeModule[]
  visibility: Record<string, boolean>
  sectionOrder: string[]
  typographyScale: ResumeTypographyScale
  templateId: ResumeTemplateId
}

export type ResumeDocument = {
  id: string
  name: string
  updatedAt: string
  data: ResumeData
}

export type ResumeWorkspace = {
  documents: ResumeDocument[]
  activeId: string
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createBlankResume(): ResumeData {
  return {
    profile: {
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      avatarDataUrl: '',
      showAvatar: false,
    },
    summary: '',
    experience: [],
    projects: [],
    education: [],
    skills: [],
    modules: [],
    visibility: {
      summary: true,
      experience: true,
      projects: true,
      education: true,
      skills: true,
    },
    sectionOrder: [...resumeSectionOrder],
    typographyScale: 3,
    templateId: 'classic',
  }
}
