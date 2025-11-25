'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layout,
  Tabs,
  Card,
  Button,
  Avatar,
  Empty,
  Spin,
  message,
} from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { supabase } from '@/lib/supabase'
import { User, UserWithAnalysis } from '@/lib/types'

const { Content } = Layout

export default function Home() {
  const router = useRouter()
  const [usersPending, setUsersPending] = useState<User[]>([])
  const [usersInAnalysis, setUsersInAnalysis] = useState<UserWithAnalysis[]>([])
  const [usersCompleted, setUsersCompleted] = useState<UserWithAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch all users and analyses
      const { data: allUsers, error: errorAll } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (errorAll) throw errorAll

      const { data: analyses, error: errorAnalyses } = await supabase
        .from('analyses')
        .select('*')

      if (errorAnalyses) throw errorAnalyses

      const analyzedUserMap = new Map(analyses?.map(a => [a.user_id, a]) || [])

      const pending = allUsers?.filter(u => !analyzedUserMap.has(u.id)) || []
      const inAnalysis = (allUsers || [])
        .filter(u => analyzedUserMap.get(u.id)?.status === 'in_process')
        .map(u => ({
          ...u,
          analysis: analyzedUserMap.get(u.id) || null,
        }))
      const completed = (allUsers || [])
        .filter(u => analyzedUserMap.get(u.id)?.status === 'completed')
        .map(u => ({
          ...u,
          analysis: analyzedUserMap.get(u.id) || null,
        }))

      setUsersPending(pending)
      setUsersInAnalysis(inAnalysis)
      setUsersCompleted(completed)
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeUser = async (user: User) => {
    try {
      // Check if analysis exists
      const { data: existingAnalysis, error: checkError } = await supabase
        .from('analyses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      let analysisId: string

      if (existingAnalysis) {
        // Navigate to existing analysis
        analysisId = existingAnalysis.id
      } else {
        // Create new analysis
        const { data: newAnalysis, error: insertError } = await supabase
          .from('analyses')
          .insert({
            user_id: user.id,
            status: 'not_started',
            current_step: 1,
            extracao: {},
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        if (!newAnalysis) throw new Error('Failed to create analysis')

        analysisId = newAnalysis.id
      }

      router.push(`/analysis/${analysisId}`)
    } catch (error) {
      console.error('Error navigating to analysis:', error)
      message.error('Erro ao abrir análise')
    }
  }

  const UserListItem = ({ user, analysis }: { user: User; analysis?: any }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <Avatar
          size={48}
          icon={<UserOutlined />}
          src={user.face_photo_url || undefined}
        />
        <div className="flex-1">
          <div className="font-semibold">{user.name}</div>
          {analysis ? (
            <div className="text-sm text-gray-600">
              <div><strong>Tipo:</strong> {analysis.color_season || 'Pendente'}</div>
              {analysis.status === 'in_process' && (
                <div className="text-xs text-blue-600">Em progresso - Etapa {analysis.current_step}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">Sem análise</div>
          )}
        </div>
      </div>
      <Button
        type="primary"
        size="small"
        icon={analysis ? <EditOutlined /> : <PlusOutlined />}
        onClick={() => handleAnalyzeUser(user)}
      >
        {analysis ? 'Continuar' : 'Iniciar'}
      </Button>
    </div>
  )

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <span>
          Pendentes <span className="text-secondary">({usersPending.length})</span>
        </span>
      ),
      children: (
        <Card className="border-secondary border-2">
          {usersPending.length === 0 ? (
            <Empty description="Nenhum usuário pendente de análise" />
          ) : (
            <div>
              {usersPending.map(user => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          )}
        </Card>
      ),
    },
    {
      key: '2',
      label: (
        <span>
          Em Análise <span className="text-secondary">({usersInAnalysis.length})</span>
        </span>
      ),
      children: (
        <Card className="border-secondary border-2">
          {usersInAnalysis.length === 0 ? (
            <Empty description="Nenhum usuário em análise" />
          ) : (
            <div>
              {usersInAnalysis.map(item => (
                <UserListItem
                  key={item.id}
                  user={item}
                  analysis={item.analysis}
                />
              ))}
            </div>
          )}
        </Card>
      ),
    },
    {
      key: '3',
      label: (
        <span>
          Analisados <span className="text-secondary">({usersCompleted.length})</span>
        </span>
      ),
      children: (
        <Card className="border-secondary border-2">
          {usersCompleted.length === 0 ? (
            <Empty description="Nenhum usuário com análise completa" />
          ) : (
            <div>
              {usersCompleted.map(item => (
                <UserListItem
                  key={item.id}
                  user={item}
                  analysis={item.analysis}
                />
              ))}
            </div>
          )}
        </Card>
      ),
    },
  ]

  return (
    <Layout className="min-h-screen bg-background">
      <Content className="p-8">
        <div className="max-w-4xl mx-auto">
          <Spin spinning={loading} tip="Carregando...">
            <Tabs items={items} onChange={() => {}} />
          </Spin>
        </div>
      </Content>
    </Layout>
  )
}
