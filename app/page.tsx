import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  CheckCircle,
  Search,
  HelpCircle,
} from "lucide-react";
import { getServerUser } from "@/lib/get-server-user";
import { StepItem, FAQItem } from "@/components/landing/LandingItems";

export default async function LandingPage() {
  const initialUser = await getServerUser()
  
  return (
    <div className="min-h-screen bg-[#EAE7D6] flex flex-col font-sans selection:bg-[#A4C3A2] selection:text-[#5D7B6F]">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #5D7B6F 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#A4C3A2]/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#5D7B6F]/10 blur-[150px] rounded-full" />
      </div>

      <Navbar initialUser={initialUser} />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40 gap-8">
        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md text-[#5D7B6F] text-[13px] font-bold px-4 py-2 rounded-full border border-[#A4C3A2]/30 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A4C3A2] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5D7B6F]"></span>
          </span>
          Nền tảng ôn luyện thông minh thế hệ mới
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
          Nâng tầm tri thức,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5D7B6F] to-[#4a6358]">Chinh phục mọi kì thi</span>
        </h1>

        <p className="text-gray-600 text-lg md:text-xl max-w-2xl leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          Trải nghiệm học tập cá nhân hóa với hàng ngàn câu hỏi trắc nghiệm chuẩn xác.
          Số hóa quy trình ôn tập của bạn một cách khoa học và hiệu quả nhất.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-3 bg-[#5D7B6F] text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-xl shadow-[#5D7B6F]/25 hover:scale-[1.02] active:scale-95"
          >
            Bắt đầu ngay miễn phí
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-3 bg-white/80 backdrop-blur-sm text-[#5D7B6F] font-bold px-10 py-4 rounded-2xl transition-all border border-[#A4C3A2]/30 shadow-sm hover:bg-white hover:border-[#A4C3A2]/50 active:scale-95"
          >
            <Search className="w-4 h-4" />
            Khám phá đề thi
          </Link>
        </div>

        <div className="flex items-center gap-6 text-gray-400 animate-in fade-in duration-1000 delay-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#5D7B6F]" />
            <span className="text-sm font-semibold">Miễn phí hoàn toàn</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#5D7B6F]" />
            <span className="text-sm font-semibold">Không cần thẻ tín dụng</span>
          </div>
        </div>
      </section>


      {/* How it Works Section */}
      <section className="relative z-10 w-full bg-white/40 backdrop-blur-sm py-24 px-6 border-y border-[#A4C3A2]/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center text-gray-900 mb-16 leading-tight">Bắt đầu học tập chỉ trong 3 bước</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepItem 
              number="01" 
              title="Tìm kiếm đề thi" 
              desc="Sử dụng thanh tìm kiếm thông minh để chọn bộ đề thi phù hợp." 
            />
            <StepItem 
              number="02" 
              title="Luyện tập & Kiểm tra" 
              desc="Chọn chế độ học tập hoặc thi tính giờ để bắt đầu." 
            />
            <StepItem 
              number="03" 
              title="Phân tích & Cải thiện" 
              desc="Xem lại câu hỏi sai và nâng cao điểm số của bạn." 
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 w-full py-24 px-6 bg-gradient-to-b from-transparent to-[#B0D4B8]/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <HelpCircle className="w-12 h-12 text-[#5D7B6F] mx-auto mb-4" />
            <h2 className="text-4xl font-black text-gray-900">Câu hỏi thường gặp</h2>
          </div>

          <div className="space-y-4">
            <FAQItem question="FQuiz có hoàn toàn miễn phí không?" answer="FQuiz cung cấp nhiều bộ đề thi miễn phí cho người dùng. Ngoài ra, chúng tôi có các gói Premium với các tính năng nâng cao và bộ đề chuyên sâu hơn." />
            <FAQItem question="Tôi có thể tự tạo bộ đề thi của riêng mình không?" answer="Hoàn toàn được! FQuiz cho phép người dùng tự tạo và quản lý thư viện đề thi cá nhân để luyện tập hoặc chia sẻ với cộng đồng." />
            <FAQItem question="Kết quả thi của tôi có được lưu lại không?" answer="Mọi kết quả và tiến trình của bạn đều được đồng bộ hóa và lưu trữ an toàn trên tài khoản của bạn, cho phép bạn truy cập từ bất kỳ thiết bị nào." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 w-full py-32 px-6">
        <div className="max-w-5xl mx-auto text-center bg-white/60 backdrop-blur-xl border-2 border-[#A4C3A2]/20 rounded-[60px] p-12 md:p-24 shadow-2xl overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#5D7B6F]/5 blur-[100px] rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#A4C3A2]/10 blur-[100px] rounded-full" />
          
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 leading-tight">
            Sẵn sàng để chinh phục<br />điểm số cao nhất?
          </h2>
          <p className="text-gray-500 text-lg mb-12 max-w-2xl mx-auto font-medium">
            Gia nhập cộng đồng sinh viên đang học tập hiệu quả mỗi ngày trên FQuiz.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/register"
              className="bg-[#5D7B6F] text-white font-bold px-12 py-5 rounded-3xl hover:bg-[#4a6358] transition-all shadow-xl shadow-[#5D7B6F]/30 hover:scale-105"
            >
              Tạo tài khoản ngay
            </Link>
            <Link
              href="/explore"
              className="bg-white text-[#5D7B6F] font-bold px-12 py-5 rounded-3xl border-2 border-[#5D7B6F]/10 hover:border-[#5D7B6F]/30 transition-all hover:scale-105 shadow-sm"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/40 backdrop-blur-sm border-t border-[#A4C3A2]/20 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/20">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-[#5D7B6F] text-2xl tracking-tighter">FQuiz</span>
              </Link>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
                Nền tảng học tập và ôn luyện trắc nghiệm hàng đầu dành cho sinh viên Việt Nam.
              </p>
            </div>

            <div>
              <h4 className="font-black text-gray-900 mb-6 uppercase text-xs tracking-widest">Pháp lý</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><Link href="/terms" className="hover:text-[#5D7B6F] transition-colors">Điều khoản</Link></li>
                <li><Link href="/privacy" className="hover:text-[#5D7B6F] transition-colors">Bảo mật</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-10 border-t border-[#A4C3A2]/20 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold text-gray-400">
              © {new Date().getFullYear()} FQuiz Inc. Made with ❤️ for Education.
            </p>
            <div className="flex gap-6">
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

