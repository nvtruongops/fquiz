'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useForgotPasswordForm } from '@/hooks/auth/useForgotPasswordForm'
import { ForgotPasswordSuccessView } from '@/components/auth/ForgotPasswordSuccessView'
import { ForgotPasswordFormFields } from '@/components/auth/ForgotPasswordFormFields'

export default function ForgotPasswordPage() {
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    email,
    setEmail,
    code,
    setCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    codeSent,
    verified,
    done,
    devCode,
    retryAfterSec,
    sendingCode,
    verifyingCode,
    resetting,
    handleSendCode,
    handleVerifyCode,
    handleResetPassword,
  } = useForgotPasswordForm()

  useGSAP(
    () => {
      if (!cardRef.current) return
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          cardRef.current,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
        )
      })
    },
    { scope: cardRef }
  )

  if (done) {
    return <ForgotPasswordSuccessView email={email} />
  }

  return (
    <div ref={cardRef} className="w-full relative group opacity-0">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      <ForgotPasswordFormFields
        email={email}
        onSetEmail={setEmail}
        code={code}
        onSetCode={setCode}
        newPassword={newPassword}
        onSetNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        onSetConfirmPassword={setConfirmPassword}
        showNewPassword={showNewPassword}
        onSetShowNewPassword={setShowNewPassword}
        showConfirmPassword={showConfirmPassword}
        onSetShowConfirmPassword={setShowConfirmPassword}
        codeSent={codeSent}
        verified={verified}
        devCode={devCode}
        retryAfterSec={retryAfterSec}
        sendingCode={sendingCode}
        verifyingCode={verifyingCode}
        resetting={resetting}
        onSendCode={handleSendCode}
        onVerifyCode={handleVerifyCode}
        onResetPassword={handleResetPassword}
      />
    </div>
  )
}
