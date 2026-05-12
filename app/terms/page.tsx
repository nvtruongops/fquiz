import { verifySession } from '@/lib/modules/auth/dal'
import BaseLayout from '@/components/layout/BaseLayout'

export const metadata = {
  title: 'Điều khoản sử dụng - FQuiz',
}

export default async function TermsPage() {
  const user = await verifySession()

  return (
    <BaseLayout user={user}>
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="text-sm font-bold tracking-widest text-[#5D7B6F] uppercase mb-4">Pháp lý</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-8">Điều khoản sử dụng</h1>
        
        <div className="prose prose-gray prose-headings:text-[#5D7B6F] max-w-none space-y-6">
          <p className="text-gray-600 text-lg font-medium leading-relaxed">
            Cập nhật lần cuối: Tháng 4, 2026.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Chào mừng bạn đến với FQuiz. Bằng việc truy cập và sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các quy định được nêu trong Điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản, vui lòng ngừng sử dụng dịch vụ.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">1. Đăng ký &amp; Bảo mật tài khoản</h2>
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

          <h2 className="text-2xl font-bold mt-12 mb-4">3. Quy định học tập &amp; Miễn trừ trách nhiệm</h2>
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
    </BaseLayout>
  )
}
