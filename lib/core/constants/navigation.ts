import { 
  Sparkles, 
  Bot, 
  Map, 
  Layers, 
  TrendingUp, 
  BrainCircuit,
  BookCheck, 
  Compass, 
  FileText, 
  Clock,
  School, 
  GraduationCap,
  Users,
  MessageSquare
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  soon?: boolean
  accentColor?: string
}

export interface Section {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  activeBg: string
  activeText: string
  activeBorder: string
  items: NavItem[]
}

export const NAV_SECTIONS: Section[] = [
  {
    id: 'ai-learning',
    title: 'HỌC NGÔN NGỮ (AI)',
    icon: Sparkles,
    color: 'text-accentRole-memory',
    activeBg: 'bg-accentRole-memory-subtle',
    activeText: 'text-accentRole-memory-fg font-black',
    activeBorder: 'border-accentRole-memory-border',
    items: [
      { label: 'Trợ lý AI', href: '/ai', icon: Bot, accentColor: 'text-accentRole-discovery' },
      { label: 'Lộ trình bài học', href: '/roadmap', icon: Map, accentColor: 'text-accentRole-progress' },
      { label: 'Ôn tập Flashcards', href: '/flashcards', icon: Layers, accentColor: 'text-accentRole-memory' },
      { label: 'Phân tích tiến độ', href: '/analytics', icon: TrendingUp, accentColor: 'text-accentRole-achievement' },
      { label: 'Lịch sử học AI', href: '/ai/history', icon: BrainCircuit, accentColor: 'text-accentRole-focus' },
    ],
  },
  {
    id: 'quiz-exam',
    title: 'ÔN THI TRẮC NGHIỆM',
    icon: BookCheck,
    color: 'text-accentRole-learning',
    activeBg: 'bg-accentRole-learning-subtle',
    activeText: 'text-accentRole-learning-fg font-black',
    activeBorder: 'border-accentRole-learning-border',
    items: [
      { label: 'Khám phá khóa học', href: '/explore', icon: Compass, accentColor: 'text-accentRole-discovery' },
      { label: 'Bộ đề của tôi', href: '/my-quizzes', icon: FileText, accentColor: 'text-accentRole-learning' },
      { label: 'Lịch sử làm bài', href: '/history', icon: Clock, accentColor: 'text-text-tertiary' },
    ],
  },
  {
    id: 'classroom-section',
    title: 'LỚP HỌC & GIẢNG DẠY',
    icon: School,
    color: 'text-accentRole-classroom',
    activeBg: 'bg-accentRole-classroom-subtle',
    activeText: 'text-accentRole-classroom-fg font-black',
    activeBorder: 'border-accentRole-classroom-border',
    items: [
      { label: 'Lớp học & Bài tập', href: '/student/classrooms', icon: GraduationCap, accentColor: 'text-accentRole-classroom' },
    ],
  },
  {
    id: 'community',
    title: 'CỘNG ĐỒNG HỌC TẬP',
    icon: Users,
    color: 'text-accentRole-community',
    activeBg: 'bg-accentRole-community-subtle',
    activeText: 'text-accentRole-community-fg font-black',
    activeBorder: 'border-accentRole-community-border',
    items: [
      { label: 'Diễn đàn học tập', href: '/community', icon: MessageSquare, accentColor: 'text-accentRole-community' },
    ],
  },
]
