'use client'

import { Layout, Button, Result } from 'antd'
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Content } = Layout

export default function NotFound() {
  const router = useRouter()

  return (
    <Layout className="min-h-screen bg-background">
      <Content className="flex items-center justify-center p-8">
        <Result
          status="404"
          title="404"
          subTitle="Desculpe, a página que você está procurando não existe."
          extra={
            <div className="flex gap-4 justify-center">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
              >
                Voltar
              </Button>
              <Button
                type="primary"
                icon={<HomeOutlined />}
                onClick={() => router.push('/')}
              >
                Ir para Início
              </Button>
            </div>
          }
        />
      </Content>
    </Layout>
  )
}
