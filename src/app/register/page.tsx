'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp, supabaseConfigured } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signUp(email, password, displayName)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setIsLoading(false)
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-sm p-6 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('login.authNotConfigured')}</h1>
          <p className="text-muted-foreground mb-4">
            {t('login.supabaseNotSet')}
          </p>
          <Link href="/">
            <Button className="w-full">{t('login.continueWithoutAuth')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-lg p-6 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('reg.checkEmail')}</h1>
          <p className="text-muted-foreground mb-4">
            {t('reg.sentConfirmation')} <strong>{email}</strong>
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">{t('reg.backToLogin')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          <div className="text-center mb-6">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold">{t('reg.createAccount')}</h1>
            <p className="text-sm text-muted-foreground">{t('reg.getStarted')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div>
              <Input
                type="text"
                placeholder={t('reg.displayName')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder={t('reg.passwordMin')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('reg.creatingAccount') : t('reg.createAccountBtn')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('reg.haveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('reg.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
