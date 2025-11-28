'use client'

import { Layout, Button, Result } from 'antd'
import { HomeOutlined, SearchOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Content } = Layout

export default function AnalysisNotFound() {
  const router = useRouter()

  return (
    <Layout className="min-h-screen bg-background">
      <Content className="flex items-center justify-center p-8">
        <Result
          status="404"
          title="Análise Não Encontrada"
          subTitle="A análise que você está procurando não existe ou foi removida."
          extra={
            <div className="flex gap-4 justify-center">
              <Button
                type="primary"
                icon={<HomeOutlined />}
                onClick={() => router.push('/')}
              >
                Ver Todas as Análises
              </Button>
            </div>
          }
        />
      </Content>
    </Layout>
  )
}
