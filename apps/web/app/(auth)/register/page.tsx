'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/store/shared/toast-store'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useRegisterForm } from '@/hooks/auth/useRegisterForm'
import { RegisterSuccessView } from '@/components/auth/RegisterSuccessView'
import { RegisterFormFields } from '@/components/auth/RegisterFormFields'

export default function RegisterPage() {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    form,
    showPassword,
    setShowPassword,
    errors,
    success,
    loading,
    sendingCode,
    codeSent,
    devCode,
    retryAfterSec,
    handleChange,
    handleSendCode,
    handleSubmit,
    passwordStrength,
    sendCodeLabel,
  } = useRegisterForm()

  useGSAP(
    () => {
      if (!cardRef.current) return
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          cardRef.current,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
        )
      })
      return () => media.revert()
    },
    { scope: cardRef }
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      toast.error(decodeURIComponent(error))
    }
  }, [toast])

  if (success) {
    return <RegisterSuccessView />
  }

  return (
    <div ref={cardRef} className="w-full relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2rem] sm:rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      <RegisterFormFields
        form={form}
        showPassword={showPassword}
        onSetShowPassword={setShowPassword}
        errors={errors}
        loading={loading}
        sendingCode={sendingCode}
        codeSent={codeSent}
        devCode={devCode}
        retryAfterSec={retryAfterSec}
        passwordStrength={passwordStrength}
        sendCodeLabel={sendCodeLabel}
        onChange={handleChange}
        onSendCode={handleSendCode}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
