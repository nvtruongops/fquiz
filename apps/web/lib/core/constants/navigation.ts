import { 
  Compass, 
  Clock,
  GraduationCap,
  MessageSquare
} from 'lucide-react'

export interface NavItem {
  labelKey: 'nav.exploreQuizzes' | 'nav.examHistory' | 'nav.myClassrooms' | 'nav.communityForum'
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  soon?: boolean
  accentColor?: string
  requiresAuth?: boolean
  descriptionKey?: 'nav.exploreQuizzesDescription' | 'nav.examHistoryDescription' | 'nav.myClassroomsDescription' | 'nav.communityForumDescription'
}

export interface Section {
  id: string
  titleKey: 'nav.quizzesAndExams' | 'nav.classrooms' | 'nav.community'
  items: NavItem[]
}

export const NAV_SECTIONS: Section[] = [
  {
    id: 'quiz-exam',
    titleKey: 'nav.quizzesAndExams',
    items: [
      {
        labelKey: 'nav.exploreQuizzes',
        href: '/explore',
        icon: Compass,
        requiresAuth: false,
        descriptionKey: 'nav.exploreQuizzesDescription',
      },
      {
        labelKey: 'nav.examHistory',
        href: '/history',
        icon: Clock,
        requiresAuth: true,
        descriptionKey: 'nav.examHistoryDescription',
      },
    ],
  },
  {
    id: 'classroom-section',
    titleKey: 'nav.classrooms',
    items: [
      {
        labelKey: 'nav.myClassrooms',
        href: '/student/classrooms',
        icon: GraduationCap,
        requiresAuth: true,
        descriptionKey: 'nav.myClassroomsDescription',
      },
    ],
  },
  {
    id: 'community',
    titleKey: 'nav.community',
    items: [
      {
        labelKey: 'nav.communityForum',
        href: '/community',
        icon: MessageSquare,
        requiresAuth: false,
        descriptionKey: 'nav.communityForumDescription',
      },
    ],
  },
]
