import { redirect } from 'next/navigation'

export default function LoginPage() {
  // Server-side redirect - never renders
  redirect('/dashboard')
}
