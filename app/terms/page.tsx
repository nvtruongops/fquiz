import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Điều khoản sử dụng - FQuiz',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#EAE7D6] text-gray-900 selection:bg-[#B0D4B8] selection:text-[#5D7B6F]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#EAE7D6]/80 backdrop-blur-md border-b border-[#A4C3A2]/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] flex items-center justify-center transition-transform group-hover:scale-105">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#5D7B6F] text-xl tracking-tight">FQuiz</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-[#5D7B6F] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 sm:py-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="text-sm font-bold tracking-widest text-[#5D7B6F] uppercase mb-4">Pháp lý</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-8">Điều khoản sử dụng</h1>
        
        <div className="prose prose-gray prose-headings:text-[#5D7B6F] max-w-none space-y-6">
          <p className="text-gray-600 text-lg font-medium leading-relaxed">
            Cập nhật lần cuối: Tháng 4, 2026.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Chào mừng bạn đến với FQuiz. Bằng việc truy cập và sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các quy định được nêu trong Điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản, vui lòng ngừng sử dụng dịch vụ.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">1. Đăng ký & Bảo mật tài khoản</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Bạn có trách nhiệm bảo vệ thông tin đăng nhập cá nhân (Tên đăng nhập, Mật khẩu).</li>
            <li>Không chia sẻ hoặc sử dụng chung tài khoản với người khác. Mọi hoạt động phát sinh từ tài khoản của bạn sẽ do bạn hoàn toàn chịu trách nhiệm.</li>
            <li>FQuiz có quyền tạm khóa hoặc vô hiệu hóa tài khoản vĩnh viễn nếu phát hiện có hành vi gian lận, phá hoại hoặc sử dụng sai mục đích cấp phép.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">2. Bản quyền nội dung</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Toàn bộ bộ câu hỏi, tài liệu ôn tập, thuật toán xử lý và giao diện hiển thị trên FQuiz thuộc quyền sở hữu trí tuệ của FQuiz.</li>
            <li>Nghiêm cấm mọi hành vi sao chép, phát tán, cào dữ liệu (scraping), hoặc thương mại hóa nội dung từ hệ thống khi chưa có sự cho phép bằng văn bản.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">3. Quy định học tập & Miễn trừ trách nhiệm</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>FQuiz là một nền tảng công nghệ giáo dục (EdTech) cung cấp môi trường luyện thi giả lập. Chúng tôi không đảm bảo các câu hỏi trên hệ thống sẽ xuất hiện chính xác trong các kỳ thi thực tế của bạn.</li>
            <li>FQuiz không chịu trách nhiệm đánh giá tư cách đạo đức hay kết quả học tập cuối cùng của bất kỳ cá nhân nào. Mọi nỗ lực gian lận trong thi cử thật thông qua ứng dụng công nghệ không thuộc phạm vi trách nhiệm của chúng tôi.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">4. Thay đổi điều khoản</h2>
          <p className="text-gray-600 leading-relaxed">
            FQuiz bảo lưu quyền cập nhật Điều khoản sử dụng bất cứ lúc nào để phù hợp với sự phát triển của hệ thống và tuân thủ pháp luật. Phiên bản mới sẽ có hiệu lực ngay khi được đăng tải trên trang này.
          </p>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-[#A4C3A2]/20 bg-white/20 py-8 px-6 text-center">
        <p className="text-gray-500 text-sm font-medium">© {new Date().getFullYear()} FQuiz. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  )
}
