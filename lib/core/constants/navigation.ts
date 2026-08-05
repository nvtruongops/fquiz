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
    color: 'text-[#5D7B6F]',
    activeBg: 'bg-[#5D7B6F]/10',
    activeText: 'text-[#5D7B6F]',
    activeBorder: 'border-[#5D7B6F]/20',
    items: [
      { label: 'Trợ lý AI', href: '/ai', icon: Bot },
      { label: 'Lộ trình bài học', href: '/roadmap', icon: Map },
      { label: 'Ôn tập Flashcards', href: '/flashcards', icon: Layers },
      { label: 'Phân tích tiến độ', href: '/analytics', icon: TrendingUp },
      { label: 'Lịch sử học AI', href: '/ai/history', icon: BrainCircuit },
    ],
  },
  {
    id: 'quiz-exam',
    title: 'ÔN THI TRẮC NGHIỆM',
    icon: BookCheck,
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-600',
    activeBorder: 'border-blue-200',
    items: [
      { label: 'Khám phá khóa học', href: '/explore', icon: Compass },
      { label: 'Bộ đề của tôi', href: '/my-quizzes', icon: FileText },
      { label: 'Lịch sử làm bài', href: '/history', icon: Clock },
    ],
  },
  {
    id: 'classroom-section',
    title: 'LỚP HỌC & GIẢNG DẠY',
    icon: School,
    color: 'text-indigo-600',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-600',
    activeBorder: 'border-indigo-200',
    items: [
      { label: 'Lớp học & Bài tập', href: '/student/classrooms', icon: GraduationCap },
    ],
  },
  {
    id: 'community',
    title: 'CỘNG ĐỒNG HỌC TẬP',
    icon: Users,
    color: 'text-purple-600',
    activeBg: 'bg-purple-50',
    activeText: 'text-purple-600',
    activeBorder: 'border-purple-200',
    items: [
      { label: 'Diễn đàn học tập', href: '/community', icon: MessageSquare },
    ],
  },
]
