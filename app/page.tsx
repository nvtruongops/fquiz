import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { getServerUser } from "@/lib/modules/auth/get-server-user";
import { StepItem, FAQItem } from "@/components/shared/landing/LandingItems";
import { ClientOnly } from "@/components/shared/utils/ClientOnly";
import Hero3D from "@/components/shared/landing/Hero3D";
import * as motion from "framer-motion/client";

export default async function LandingPage() {
  const initialUser = await getServerUser()
  
  return (
    <ClientOnly>
      <div className="min-h-screen bg-[#EAE7D6] flex flex-col font-sans selection:bg-[#A4C3A2] selection:text-[#5D7B6F]">
        <Navbar initialUser={initialUser} />
        
        {/* Main 3D Hero Section */}
        <Hero3D />

      {/* How it Works Section */}
      <section className="relative z-10 w-full bg-white/40 backdrop-blur-sm py-32 px-6 border-y border-[#A4C3A2]/20">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl font-black text-center text-gray-900 mb-20 leading-tight"
          >
            Bắt đầu học tập chỉ trong 3 bước
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { number: "01", title: "Tìm kiếm đề thi", desc: "Sử dụng thanh tìm kiếm thông minh để chọn bộ đề thi phù hợp." },
              { number: "02", title: "Luyện tập & Kiểm tra", desc: "Chọn chế độ học tập hoặc thi tính giờ để bắt đầu." },
              { number: "03", title: "Phân tích & Cải thiện", desc: "Xem lại câu hỏi sai và nâng cao điểm số của bạn." }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                <StepItem 
                  number={step.number} 
                  title={step.title} 
                  desc={step.desc} 
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 w-full py-32 px-6 bg-gradient-to-b from-transparent to-[#B0D4B8]/20">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <div className="w-20 h-20 bg-[#5D7B6F]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-[#5D7B6F]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">Câu hỏi thường gặp</h2>
          </motion.div>

          <div className="space-y-6">
            {[
              { q: "FQuiz có hoàn toàn miễn phí không?", a: "FQuiz cung cấp nhiều bộ đề thi miễn phí cho người dùng. Ngoài ra, chúng tôi có các gói Premium với các tính năng nâng cao." },
              { q: "Tôi có thể tự tạo bộ đề thi của riêng mình không?", a: "Hoàn toàn được! FQuiz cho phép người dùng tự tạo và quản lý thư viện đề thi cá nhân." },
              { q: "Kết quả thi của tôi có được lưu lại không?", a: "Mọi kết quả và tiến trình của bạn đều được đồng bộ hóa và lưu trữ an toàn trên tài khoản của bạn." }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FAQItem question={faq.q} answer={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 w-full py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-5xl mx-auto text-center bg-white/60 backdrop-blur-2xl border-2 border-[#A4C3A2]/30 rounded-[60px] p-12 md:p-24 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#5D7B6F]/5 blur-[100px] rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#A4C3A2]/10 blur-[100px] rounded-full" />
          
          <h2 className="text-4xl md:text-7xl font-black text-gray-900 mb-8 leading-tight">
            Sẵn sàng để chinh phục<br />điểm số cao nhất?
          </h2>
          <p className="text-gray-500 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium">
            Gia nhập cộng đồng sinh viên đang học tập hiệu quả mỗi ngày trên FQuiz.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
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
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/40 backdrop-blur-sm border-t border-[#A4C3A2]/20 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#5D7B6F] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/20">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="font-black text-[#5D7B6F] text-3xl tracking-tighter">FQuiz</span>
              </Link>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8 max-w-sm">
                Nền tảng học tập và ôn luyện trắc nghiệm hàng đầu dành cho sinh viên Việt Nam.
              </p>
            </div>

            <div>
              <h4 className="font-black text-gray-900 mb-6 uppercase text-xs tracking-widest">Pháp lý</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><Link href="/terms" className="hover:text-[#5D7B6F] transition-colors">Điều khoản dịch vụ</Link></li>
                <li><Link href="/privacy" className="hover:text-[#5D7B6F] transition-colors">Chính sách bảo mật</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-10 border-t border-[#A4C3A2]/20 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-bold text-gray-400" suppressHydrationWarning>
              © {new Date().getFullYear()} FQuiz Inc. Made with ❤️ for Education.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </ClientOnly>
  );
}

