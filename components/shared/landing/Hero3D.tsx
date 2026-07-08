"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Search, CheckCircle } from "lucide-react";
import Link from "next/link";
import React from "react";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
});

export default function Hero3D() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.33, 1, 0.68, 1] as const },
    },
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#EAE7D6]">
      {/* 3D Background */}
      <Scene3D />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center flex flex-col items-center gap-10"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-xl text-[#5D7B6F] text-[13px] font-bold px-5 py-2.5 rounded-full border border-white/40 shadow-xl"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A4C3A2] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5D7B6F]"></span>
          </span>
          <span>Nền tảng ôn luyện thông minh thế hệ mới</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight drop-shadow-2xl"
        >
          Nâng tầm tri thức,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5D7B6F] via-[#7DAF9C] to-[#4a6358] animate-gradient-x drop-shadow-sm">
            Chinh phục mọi kì thi
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 text-xl md:text-3xl max-w-3xl leading-relaxed font-semibold opacity-80"
        >
          Trải nghiệm học tập cá nhân hóa với hàng ngàn câu hỏi trắc nghiệm chuẩn xác.
          Số hóa quy trình ôn tập của bạn một cách khoa học.
        </motion.p>

        {/* Actions */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-8 mt-6"
        >
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center gap-4 bg-[#5D7B6F] text-white font-black px-12 py-6 rounded-2xl transition-all shadow-[0_20px_50px_rgba(93,123,111,0.3)] hover:shadow-[0_25px_60px_rgba(93,123,111,0.4)] hover:-translate-y-2 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 text-lg">Bắt đầu ngay miễn phí</span>
            <ArrowRight className="relative z-10 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-4 bg-white/50 backdrop-blur-xl text-[#5D7B6F] font-black px-12 py-6 rounded-2xl transition-all border-2 border-white/40 shadow-2xl hover:bg-white/80 hover:-translate-y-2 active:scale-95 text-lg"
          >
            <Search className="w-6 h-6" />
            Khám phá đề thi
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-10 text-gray-500 mt-10"
        >
          <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[#5D7B6F]/10 flex items-center justify-center group-hover:bg-[#5D7B6F]/20 transition-colors">
              <CheckCircle className="w-5 h-5 text-[#5D7B6F]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider">Miễn phí hoàn toàn</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[#5D7B6F]/10 flex items-center justify-center group-hover:bg-[#5D7B6F]/20 transition-colors">
              <CheckCircle className="w-5 h-5 text-[#5D7B6F]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider">Không cần thẻ tín dụng</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative Blur Elements */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#A4C3A2]/20 blur-[150px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#5D7B6F]/15 blur-[150px] rounded-full pointer-events-none" />
    </section>
  );
}
