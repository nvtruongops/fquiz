import { cookies } from 'next/headers'
import type { Metadata } from 'next'

type MetadataPage = 'root' | 'home' | 'community' | 'explore' | 'privacy' | 'terms' | 'teacher'

const metadataCopy: Record<MetadataPage, Record<'vi' | 'en', { pageTitle: string; pageDescription?: string }>> = {
  root: {
    vi: { pageTitle: 'FQuiz — Nền tảng luyện tập và kiểm tra thông minh', pageDescription: 'Nền tảng trắc nghiệm trực tuyến với 3 chế độ học: Kiểm tra nhanh, Luyện tập và Thẻ ghi nhớ. Tạo bài kiểm tra, ôn tập và theo dõi tiến độ học.' },
    en: { pageTitle: 'FQuiz — Smart Practice & Quiz Platform', pageDescription: 'Online quiz platform with 3 learning modes: Instant Quiz, Practice, and Flashcards. Create quizzes, practice, and track mastery progress.' },
  },
  home: {
    vi: { pageTitle: 'FQuiz — Nền tảng trắc nghiệm và lớp học trực tuyến', pageDescription: 'Luyện thi trắc nghiệm, ôn tập bằng thẻ ghi nhớ và quản lý lớp học trực tuyến dễ dàng.' },
    en: { pageTitle: 'FQuiz — Online Quiz Platform & Virtual Classrooms', pageDescription: 'Practice multiple-choice exams, review flashcards, and manage online classrooms with ease.' },
  },
  community: {
    vi: { pageTitle: 'Cộng đồng | FQuiz', pageDescription: 'Thảo luận về ôn thi, đặt câu hỏi bài tập và chia sẻ tài liệu học tập cùng cộng đồng FQuiz.' },
    en: { pageTitle: 'Community Forum | FQuiz', pageDescription: 'Discuss exam preparation, ask homework questions, and share study materials with the FQuiz community.' },
  },
  explore: {
    vi: { pageTitle: 'Khám phá môn học và bài kiểm tra | FQuiz', pageDescription: 'Duyệt các môn học và khám phá bài kiểm tra thuộc nhiều lĩnh vực trên FQuiz.' },
    en: { pageTitle: 'Explore Study Categories & Quizzes | FQuiz', pageDescription: 'Browse study categories and discover quizzes across disciplines on FQuiz.' },
  },
  privacy: {
    vi: { pageTitle: 'Chính sách quyền riêng tư — FQuiz', pageDescription: 'Chính sách quyền riêng tư và cam kết bảo vệ dữ liệu cá nhân tại FQuiz.' },
    en: { pageTitle: 'Privacy Policy — FQuiz', pageDescription: 'Privacy policy and personal data protection commitments on FQuiz.' },
  },
  terms: {
    vi: { pageTitle: 'Điều khoản dịch vụ — FQuiz', pageDescription: 'Điều khoản và quy định khi sử dụng FQuiz.' },
    en: { pageTitle: 'Terms of Service — FQuiz', pageDescription: 'Terms of Service and regulations for using FQuiz.' },
  },
  teacher: {
    vi: { pageTitle: 'Bảng điều khiển giáo viên — FQuiz' },
    en: { pageTitle: 'Teacher Panel — FQuiz' },
  },
}

export async function getLocalizedMetadata(page: MetadataPage): Promise<Metadata> {
  const locale = (await cookies()).get('fquiz-locale')?.value === 'en' ? 'en' : 'vi'
  const copy = metadataCopy[page][locale]
  return { title: copy.pageTitle, ...(copy.pageDescription ? { description: copy.pageDescription } : {}) }
}
