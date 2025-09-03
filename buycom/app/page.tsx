'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import API_URL from '@/config'

export default function LoginPage() {
  const [isMakerLogin, setIsMakerLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      alert("All fields are required.");
      return;
    }
    setLoading(true) // Start loading

    const encodedCredentials = btoa(`${username}:${password}`)
    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ username, password, loginAsMaker: isMakerLogin }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth_tokens', data.token)
        localStorage.setItem('user_role', data.role)
        const getrole = localStorage.getItem("user_role")

        if (data.role === 'admin') {
          if (isMakerLogin && getrole === "admin") {
            router.push('/maker')
          } else {
            router.push('/checker')
          }
        } else {
          router.push('/checker')
        }
      } else {
        alert(data.non_field_errors || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Error logging in:', error)
      alert('An error occurred. Please try again later.')
    } finally {
      setLoading(false) // Stop loading
    }
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className='text-center'>BuyCommodity</CardTitle>
          <CardTitle className='text-center'>{isMakerLogin ? 'Maker Login' : 'Checker Login'}</CardTitle>
          <CardDescription>Enter your credentials to access the GST Search Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="id" className="text-sm font-medium">User ID</label>
              <Input
                id="id"
                type="text"
                placeholder="Enter your ID"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsMakerLogin(!isMakerLogin)}
            disabled={loading}
          >
            {isMakerLogin ? 'Switch to Checker Login' : 'Login as Maker'}
          </Button>
        </CardFooter>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <img
            src="/gif/loading.gif"
            alt="Loading..."
            className="w-26 h-26"
          />
        </div>
      )}
    </div>
  )
}
