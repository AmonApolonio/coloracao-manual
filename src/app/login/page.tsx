'use client'

import { useState } from 'react'
import { Card, Input, Button, Typography, Space, App as AntdApp } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

const { Title, Paragraph } = Typography

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { message } = AntdApp.useApp()

  const handleLogin = async () => {
    if (!username || !password) {
      message.error('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)
    try {
      const success = await login(username, password)
      if (success) {
        message.success('Login realizado com sucesso!')
        router.push('/')
      } else {
        message.error('Usuário ou senha inválidos')
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg border-0">
        <div className="text-center mb-8">
          <Title level={2} className="mb-2">
            Coloração Manual
          </Title>
          <Paragraph type="secondary">
            Faça login para acessar a plataforma
          </Paragraph>
        </div>

        <Space vertical className="w-full gap-4">
          <Input
            prefix={<UserOutlined />}
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            size="large"
          />
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            size="large"
          />

          <Button
            className='mt-2'
            type="primary"
            size="large"
            block
            onClick={handleLogin}
            loading={loading}
          >
            Entrar
          </Button>
        </Space>
      </Card>
    </div>
  )
}
