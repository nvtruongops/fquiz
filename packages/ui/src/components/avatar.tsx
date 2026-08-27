'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

interface AvatarContextValue {
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
  imageError: boolean
  setImageError: (error: boolean) => void
  hasImage: boolean
  setHasImage: (has: boolean) => void
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null)

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)
  const [hasImage, setHasImage] = React.useState(false)

  return (
    <AvatarContext.Provider
      value={{
        imageLoaded,
        setImageLoaded,
        imageError,
        setImageError,
        hasImage,
        setHasImage,
      }}
    >
      <div
        ref={ref}
        className={cn(
          'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full select-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  )
})
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, onError, onLoad, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext)

  React.useEffect(() => {
    if (ctx) {
      ctx.setHasImage(!!src)
      ctx.setImageError(false)
      ctx.setImageLoaded(false)
    }
  }, [src, ctx])

  if (!src || (ctx && ctx.imageError)) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={props.alt || 'Avatar'}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onLoad={(e) => {
        if (ctx) ctx.setImageLoaded(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        if (ctx) ctx.setImageError(true)
        onError?.(e)
      }}
      className={cn(
        'aspect-square h-full w-full object-cover',
        ctx && !ctx.imageLoaded ? 'hidden' : 'block',
        className
      )}
      {...props}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(AvatarContext)

  if (ctx && ctx.hasImage && ctx.imageLoaded && !ctx.imageError) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
