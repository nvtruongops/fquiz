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
  requiresAuth?: boolean
  description?: string
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
      {
        label: 'Khám phá đề thi',
        href: '/explore',
        icon: Compass,
        requiresAuth: false,
        description: 'Khám phá kho đề thi công khai và danh mục môn học',
      },
      {
        label: 'Bộ đề của tôi',
        href: '/my-quizzes',
        icon: FileText,
        requiresAuth: true,
        description: 'Lưu trữ, quản lý các bộ đề yêu thích và tự tạo đề thi cá nhân',
      },
      {
        label: 'Lịch sử làm bài',
        href: '/history',
        icon: Clock,
        requiresAuth: true,
        description: 'Theo dõi tiến độ, xem lại kết quả và làm lại các câu sai',
      },
    ],
  },
  {
    id: 'classroom-section',
    title: 'LỚP HỌC',
    items: [
      {
        label: 'Lớp học của tôi',
        href: '/student/classrooms',
        icon: GraduationCap,
        requiresAuth: true,
        description: 'Tham gia lớp học của giáo viên, làm bài tập và xem bảng điểm',
      },
    ],
  },
  {
    id: 'community',
    title: 'CỘNG ĐỒNG',
    items: [
      {
        label: 'Diễn đàn cộng đồng',
        href: '/community',
        icon: MessageSquare,
        requiresAuth: false,
        description: 'Trao đổi học thuật, thảo luận câu hỏi và kết nối bạn học',
      },
    ],
  },
]
