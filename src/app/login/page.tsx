'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'
import Cookies from 'js-cookie'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      toast.loading('Logging in...')
      
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/user/login`, values)
      
      // Store auth info in both localStorage and cookies
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('appUserId', res.data.appUserId)
      localStorage.setItem('userEmail', values.email)
      Cookies.set('token', res.data.token, { path: '/', sameSite: 'Lax' })
      Cookies.set('appUserId', res.data.appUserId, { path: '/', sameSite: 'Lax' })
      
      toast.dismiss()
      toast.success('Welcome back!')
      
      router.push('/dashboard')
    } catch (err) {
      toast.dismiss()
      const error = err as AxiosError<{ error: string }>
      const message = error.response?.data?.error || 'Invalid credentials'
      toast.error(message)
      console.error('Login error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px] shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
