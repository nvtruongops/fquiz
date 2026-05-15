import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'

export const metadata = {
  title: 'Chính sách bảo mật - FQuiz',
}

export default async function PrivacyPage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p className="text-sm font-bold tracking-widest text-[#5D7B6F] uppercase mb-4">Cam kết Data</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-8">Chính sách bảo mật</h1>
        
        <div className="prose prose-gray prose-headings:text-[#5D7B6F] max-w-none space-y-6">
          <p className="text-gray-600 text-lg font-medium leading-relaxed">
            FQuiz cam kết bảo vệ sự riêng tư và an toàn dữ liệu của bạn. Xin vui lòng đọc kỹ chính sách này để hiểu cách chúng tôi thu thập và bảo vệ thông tin.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">1. Thu thập tối giản (Data Minimization)</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Chúng tôi chỉ thu thập những thông tin cần thiết nhất để vận hành hệ thống: <strong>Tên đăng nhập (Username)</strong>, <strong>Email</strong> và <strong>Lịch sử làm bài (Kết quả quiz)</strong>.</li>
            <li>Chúng tôi không thu thập thông tin định danh cá nhân nhạy cảm, vị trí địa lý chính xác, hay dữ liệu thiết bị dư thừa.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">2. Mã hóa mật khẩu (Data Security)</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Mật khẩu của bạn được mã hóa một chiều (hashing) bằng chuẩn an toàn trước khi lưu vào cơ sở dữ liệu.</li>
            <li><strong>Không một ai</strong> (kể cả đội ngũ quản trị hay kỹ sư của FQuiz) có thể biết được mật khẩu dạng văn bản gốc của bạn.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">3. Cookie &amp; Phiên bản hệ thống (Sessions)</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>FQuiz sử dụng các token xác thực (JWT) được lưu trữ an toàn trong HTTP-only Cookies để duy trì trạng thái đăng nhập của bạn.</li>
            <li>Các cookies này chỉ dùng cho mục đích xác thực, không chạy các trình theo dõi quảng cáo chéo (cross-site tracking trackers).</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">4. Quyền của người dùng</h2>
          <p className="text-gray-600 leading-relaxed">
            Bạn có quyền yêu cầu trích xuất toàn bộ dữ liệu lịch sử làm bài hoặc xóa vĩnh viễn tài khoản khỏi hệ thống FQuiz vào bất cứ lúc nào. Khi có yêu cầu, mọi truy vết về kết quả thi của bạn sẽ được xóa sổ hoàn toàn khỏi cơ sở dữ liệu.
          </p>
        </div>
      </main>
    </AppLayout>
  )
}
