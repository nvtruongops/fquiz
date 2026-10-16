'use client'

import React from 'react'
import { Sparkles, CheckCircle2, Shield, Zap, GraduationCap } from 'lucide-react'

export function LoginHeroPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-border text-card-foreground flex-1 self-stretch">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FQuiz Platform</span>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight text-card-foreground">
            Master Exam Prep with Confidence
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">
            Practice course codes, simulate real exam conditions, and track your topic mastery in real time.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">Adaptive Quiz Practice</h4>
              <p className="text-xs text-muted-foreground font-medium">Instant answer explanations and question retries.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">EOS-Grade Exam Integrity</h4>
              <p className="text-xs text-muted-foreground font-medium">Single-tab authority and offline session preservation.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground">Comprehensive Analytics</h4>
              <p className="text-xs text-muted-foreground font-medium">Visual score breakdown by syllabus category.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border mt-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>Trusted by 5,000+ university learners</span>
        </div>
      </div>
    </div>
  )
}
