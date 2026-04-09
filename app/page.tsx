import Navbar from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, BarChart2, Layers, ArrowRight, CheckCircle, GraduationCap, Users, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EAE7D6] flex flex-col font-sans selection:bg-[#A4C3A2] selection:text-[#5D7B6F] pb-28 md:pb-0">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #5D7B6F 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#A4C3A2]/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#5D7B6F]/10 blur-[120px] rounded-full" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-20 pb-28 md:pb-20">
        {/* Subtle Glow Behind Hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#D7F9FA]/30 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md text-[#5D7B6F] text-[13px] font-bold px-4 py-2 rounded-full mb-8 border border-[#A4C3A2]/40 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
          <SparkleIcon className="w-4 h-4 text-[#A4C3A2]" />
          Nền tảng ôn luyện thông minh
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-gray-900 max-w-4xl leading-[1.1] mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          Nâng tầm tri thức,{" "}
          <span className="text-[#5D7B6F]">chinh phục mọi kì thi</span>
        </h1>

        <p className="text-gray-600 text-base md:text-lg max-w-2xl mb-10 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          Trải nghiệm học tập cá nhân hóa với hàng ngàn câu hỏi trắc nghiệm, 
          số hóa quy trình ôn tập của bạn một cách khoa học nhất.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 bg-[#5D7B6F] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#4a6358] transition-all shadow-xl shadow-[#5D7B6F]/20 hover:-translate-y-1"
          >
            Đăng ký miễn phí
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#5D7B6F] font-bold px-8 py-4 rounded-2xl hover:bg-white/80 transition-all border-2 border-[#A4C3A2]/30 shadow-sm hover:-translate-y-1"
          >
            Khám phá ngay
          </Link>
        </div>

        {/* Floating Badges - Removed as requested */}
      </main>

      {/* Features Section - Color Arrangement Update: Subtle transition to secondary-bg */}
      <section className="relative z-10 w-full bg-gradient-to-b from-transparent via-[#B0D4B8]/20 to-transparent py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Tại sao chọn FQuiz?</h2>
            <div className="w-20 h-1.5 bg-[#5D7B6F] mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Layers className="w-6 h-6 text-[#5D7B6F]" />}
              title="Thư viện Quiz đa dạng"
              desc="Bộ câu hỏi được chọn lọc kỹ lưỡng, phân loại theo mã môn học và chuyên ngành cụ thể."
              color="#5D7B6F"
            />
            <FeatureCard
              icon={<GraduationCap className="w-6 h-6 text-[#5D7B6F]" />}
              title="Học tập không giới hạn"
              desc="Hai chế độ luyện tập thông minh: Xem đáp án ngay hoặc giả lập kỳ thi thực tế."
              color="#A4C3A2"
            />
            <FeatureCard
              icon={<BarChart2 className="w-6 h-6 text-[#5D7B6F]" />}
              title="Báo cáo tiến độ"
              desc="Phân tích chi tiết kết quả, ghi chú highlight và theo dõi sự tiến bộ qua từng ngày."
              color="#B0D4B8"
            />
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-[#A4C3A2]/20 bg-white/20 backdrop-blur-sm py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5D7B6F] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#5D7B6F] text-lg tracking-tight">FQuiz</span>
          </div>
          
          <div className="flex gap-8 text-sm font-bold text-gray-500">
            <Link href="/terms" className="hover:text-[#5D7B6F] transition-colors">Điều khoản</Link>
            <Link href="/privacy" className="hover:text-[#5D7B6F] transition-colors">Bảo mật</Link>
          </div>

          <p className="text-xs font-medium text-gray-400">
            Build with passion for education © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="group bg-white/60 backdrop-blur-md rounded-[32px] p-8 shadow-sm border border-[#A4C3A2]/20 flex flex-col gap-6 hover:shadow-2xl hover:shadow-[#5D7B6F]/10 hover:-translate-y-2 transition-all duration-500">
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12"
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-xl mb-3">{title}</h3>
        <p className="text-gray-500 text-[15px] leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 3c1.7 6.3 7.7 8.3 7.7 8.3s-6 2-7.7 8.3C10.3 13.3 4.3 11.3 4.3 11.3s6-2 7.7-8.3z" />
      <path d="M19 3v2" />
      <path d="M20 4h-2" />
      <path d="M5 19v2" />
      <path d="M6 20H4" />
    </svg>
  );
}

