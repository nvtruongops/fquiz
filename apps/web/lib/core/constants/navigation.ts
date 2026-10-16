import { 
  Compass, 
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
    title: 'QUIZZES & EXAMS',
    items: [
      {
        label: 'Explore Quizzes',
        href: '/explore',
        icon: Compass,
        requiresAuth: false,
        description: 'Explore public quiz repository and subject categories',
      },
      {
        label: 'Exam History',
        href: '/history',
        icon: Clock,
        requiresAuth: true,
        description: 'Track progress, review results, and retry incorrect questions',
      },
    ],
  },
  {
    id: 'classroom-section',
    title: 'CLASSROOMS',
    items: [
      {
        label: 'My Classrooms',
        href: '/student/classrooms',
        icon: GraduationCap,
        requiresAuth: true,
        description: 'Join teacher classrooms, submit assignments, and view grades',
      },
    ],
  },
  {
    id: 'community',
    title: 'COMMUNITY',
    items: [
      {
        label: 'Community Forum',
        href: '/community',
        icon: MessageSquare,
        requiresAuth: false,
        description: 'Academic exchange, question discussions, and student networking',
      },
    ],
  },
]
