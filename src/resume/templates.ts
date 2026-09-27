import type { ResumeTemplateId } from './model'

export type ResumeTemplatePreset = {
  id: ResumeTemplateId
  name: string
  description: string
  layout: 'single-column' | 'section-columns'
}

export const resumeTemplatePresets: ResumeTemplatePreset[] = [
  { id: 'classic', name: '经典蓝线', description: '开放式页头与蓝色通栏标题，清晰利落。', layout: 'single-column' },
  { id: 'gray-band', name: '雾灰档案', description: '左侧照片、档案式信息与灰阶分区。', layout: 'single-column' },
  { id: 'editorial', name: '墨色书刊', description: '居中衬线姓名与黑白排版，沉静正式。', layout: 'single-column' },
  { id: 'navy-ribbon', name: '海军旗标', description: '深蓝名片式页头与章节旗标，层级鲜明。', layout: 'single-column' },
  { id: 'blue-dotted', name: '蓝点时间线', description: '编号圆标串联经历，阅读路径清晰。', layout: 'single-column' },
  { id: 'ice-band', name: '冰蓝卡片', description: '浅蓝信息卡与留白分区，轻盈有序。', layout: 'single-column' },
  { id: 'emerald-line', name: '青绿雅致', description: '左侧照片与青绿标题，简洁舒展。', layout: 'single-column' },
  { id: 'ledger', name: '极简分栏', description: '左侧章节索引、右侧正文，编辑式布局。', layout: 'section-columns' },
  { id: 'swiss-grid', name: '瑞士网格', description: '黑白网格、朱红标记与严谨的文字对齐。', layout: 'single-column' },
  { id: 'executive-signature', name: '高管履历', description: '墨色标题与克制金调，突出资历和领导成果。', layout: 'single-column' },
  { id: 'data-impact', name: '数据成果', description: '清晰强调经历中的数字、规模与业务结果。', layout: 'single-column' },
]

export function getResumeTemplate(id: ResumeTemplateId) {
  return resumeTemplatePresets.find((template) => template.id === id) ?? resumeTemplatePresets[0]
}
