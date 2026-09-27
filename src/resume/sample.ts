import { resumeSectionOrder, type ResumeData } from './model'

export const sampleResume: ResumeData = {
  profile: {
    fullName: '林乔',
    headline: '高级产品设计师',
    email: 'qiao.lin@email.com',
    phone: '+86 138 0012 3456',
    location: '上海 · 中国',
    website: 'linqiao.design',
    avatarDataUrl: '',
    showAvatar: false,
  },
  summary:
    '专注于复杂产品体验与设计系统，拥有 6 年 B2B SaaS 和消费产品经验。擅长从用户研究与业务目标中找到清晰的问题定义，并与产品、研发团队协作，将策略转化为易用且可持续的产品体验。',
  experience: [
    {
      id: 'exp-1',
      role: '高级产品设计师',
      company: '澄海科技',
      location: '上海',
      startDate: '2022.06',
      endDate: '至今',
      highlights: [
        '负责企业数据平台核心体验，重新梳理信息架构与关键分析流程，任务完成率提升 28%。',
        '牵头建立跨产品设计系统，沉淀 80+ 组件，推动 4 个业务团队统一交付标准。',
        '通过客户访谈与可用性测试识别高频问题，推动路线图优先级调整并缩短上线周期。',
      ],
    },
    {
      id: 'exp-2',
      role: '产品设计师',
      company: '一页互联',
      location: '杭州',
      startDate: '2019.08',
      endDate: '2022.05',
      highlights: [
        '参与从 0 到 1 的协作工具设计，覆盖 Web 与移动端，产品上线首年服务 300+ 企业客户。',
        '与产品经理共同搭建设计验证流程，推动团队从功能交付转向围绕用户任务持续迭代。',
      ],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: '澄海 Insight 数据工作台',
      role: '体验负责人',
      link: '',
      startDate: '2023.02',
      endDate: '2023.11',
      highlights: [
        '将分散在 5 个页面的分析流程整合为可配置工作台，减少用户重复操作并提升留存。',
        '设计面向新手的渐进式引导，首份报告创建时间由 20 分钟缩短至 8 分钟。',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      school: '中国美术学院',
      degree: '本科',
      major: '视觉传达设计',
      startDate: '2015.09',
      endDate: '2019.06',
      details: '优秀毕业设计 · 校级奖学金',
    },
  ],
  skills: ['产品策略', '用户研究', '交互设计', '设计系统', 'Figma', '原型验证', '跨团队协作'],
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
