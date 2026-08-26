import { 
  Compass, 
  FileText, 
  Clock,
  GraduationCap,
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
  items: NavItem[]
}

export const NAV_SECTIONS: Section[] = [
  {
    id: 'quiz-exam',
    title: 'ÔN THI TRẮC NGHIỆM',
    items: [
      { label: 'Khám phá đề thi', href: '/explore', icon: Compass },
      { label: 'Bộ đề của tôi', href: '/my-quizzes', icon: FileText },
      { label: 'Lịch sử làm bài', href: '/history', icon: Clock },
    ],
  },
  {
    id: 'classroom-section',
    title: 'LỚP HỌC',
    items: [
      { label: 'Lớp học của tôi', href: '/student/classrooms', icon: GraduationCap },
    ],
  },
  {
    id: 'community',
    title: 'CỘNG ĐỒNG',
    items: [
      { label: 'Diễn đàn cộng đồng', href: '/community', icon: MessageSquare },
    ],
  },
]
