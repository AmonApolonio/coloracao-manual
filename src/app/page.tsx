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
import { UserOutlined, PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { 
  loadAllUsersAndAnalyses, 
  getOrCreateAnalysisForUser, 
  createNewAnalysis 
} from '@/lib/supabase'
import { User } from '@/lib/types'

const { Content } = Layout

interface UserWithAllAnalyses extends User {
  analyses: any[];
}

export default function Home() {
  const router = useRouter()
  const [usersPending, setUsersPending] = useState<User[]>([])
  const [usersInAnalysis, setUsersInAnalysis] = useState<UserWithAllAnalyses[]>([])
  const [usersCompleted, setUsersCompleted] = useState<UserWithAllAnalyses[]>([])
  const [analysesInAnalysisCount, setAnalysesInAnalysisCount] = useState(0)
  const [analysesCompletedCount, setAnalysesCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { allUsers, analyses } = await loadAllUsersAndAnalyses()

      // Group analyses by user_id
      const analysesByUser = new Map<string, any[]>()
      analyses?.forEach(a => {
        const existing = analysesByUser.get(a.user_id) || []
        existing.push(a)
        analysesByUser.set(a.user_id, existing)
      })

      // Users with no analysis at all
      const pending = allUsers?.filter(u => !analysesByUser.has(u.id)) || []

      // Users with at least one in_process analysis
      const inAnalysis = (allUsers || [])
        .filter(u => {
          const userAnalyses = analysesByUser.get(u.id) || []
          return userAnalyses.some(a => a.status === 'in_process')
        })
        .map(u => {
          const userAnalyses = analysesByUser.get(u.id) || []
          // Sort by created_at ascending to get chronological order (1st, 2nd, 3rd, etc.)
          const sortedAnalyses = userAnalyses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          // Add index to each analysis
          const analysesWithIndex = sortedAnalyses.map((analysis, idx) => ({
            ...analysis,
            analysisIndex: idx + 1,
          }))
          return {
            ...u,
            analyses: analysesWithIndex,
          }
        })

      // Users who have completed analyses
      const completed = (allUsers || [])
        .filter(u => {
          const userAnalyses = analysesByUser.get(u.id) || []
          return userAnalyses.some(a => a.status === 'completed')
        })
        .map(u => {
          const userAnalyses = analysesByUser.get(u.id) || []
          // Sort by created_at ascending to get chronological order (1st, 2nd, 3rd, etc.)
          const sortedAnalyses = userAnalyses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          // Add index to each analysis
          const analysesWithIndex = sortedAnalyses.map((analysis, idx) => ({
            ...analysis,
            analysisIndex: idx + 1,
          }))
          return {
            ...u,
            analyses: analysesWithIndex,
          }
        })

      const inProcessAnalyses = (analyses || []).filter(a => a.status === 'in_process')
      const completedAnalyses = (analyses || []).filter(a => a.status === 'completed')

      setUsersPending(pending)
      setUsersInAnalysis(inAnalysis)
      setUsersCompleted(completed)
      setAnalysesInAnalysisCount(inProcessAnalyses.length || 0)
      setAnalysesCompletedCount(completedAnalyses.length || 0)
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeUser = async (user: User, analysisId?: string) => {
    try {
      // If an analysis ID is provided, navigate directly to it
      if (analysisId) {
        router.push(`/analysis/${analysisId}`)
        return
      }

      const targetAnalysisId = await getOrCreateAnalysisForUser(user.id)
      router.push(`/analysis/${targetAnalysisId}`)
    } catch (error) {
      console.error('Error navigating to analysis:', error)
      message.error('Erro ao abrir análise')
    }
  }

  // Navigate to view an existing analysis (read-only mode)
  const handleViewAnalysis = (analysisId: string) => {
    router.push(`/analysis/${analysisId}`)
  }

  // Create a new analysis for a user who already has completed analyses
  const handleCreateNewAnalysis = async (user: User) => {
    try {
      await createNewAnalysis(user.id)

      // Refresh the list to show the new analysis
      await loadData()
      
      // Navigate to the new analysis
      const targetAnalysisId = await getOrCreateAnalysisForUser(user.id)
      router.push(`/analysis/${targetAnalysisId}`)
    } catch (error) {
      console.error('Error creating new analysis:', error)
      message.error('Erro ao criar nova análise')
    }
  }

  const UserListItem = ({ user, analyses, isCompleted }: { user: User; analyses?: any[]; isCompleted?: boolean }) => {
    // Filter analyses by status
    const visibleAnalyses = analyses?.filter(a => 
      isCompleted ? a.status === 'completed' : a.status === 'in_process'
    ) || []

    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return (
      <div>
        {visibleAnalyses.length === 0 ? (
          <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <Avatar
                size={48}
                icon={<UserOutlined />}
                src={user.face_photo_url || undefined}
              />
              <div className="flex-1">
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-gray-400">Sem análise</div>
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAnalyzeUser(user)}
            >
              Iniciar
            </Button>
          </div>
        ) : (
          visibleAnalyses.map((analysis) => (
            <div key={analysis.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <Avatar
                  size={48}
                  icon={<UserOutlined />}
                  src={user.face_photo_url || undefined}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{user.name}</div>
                    {analysis.analysisIndex >= 2 && (
                      <div className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {analysis.analysisIndex}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <div><strong>Tipo:</strong> {analysis.color_season || 'Pendente'}</div>
                    <div><strong>Data:</strong> {formatDate(analysis.analyzed_at)}</div>
                    {analysis.status === 'in_process' && (
                      <div className="text-xs text-blue-600">Em progresso - Etapa {analysis.current_step}</div>
                    )}
                    {analysis.status === 'completed' && (
                      <div className="text-xs text-green-600">✓ Concluída</div>
                    )}
                  </div>
                </div>
              </div>
              {/* Buttons for completed analyses */}
              {isCompleted && analysis ? (
                <div className="flex gap-2">
                  <Button
                    type="default"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewAnalysis(analysis.id)}
                  >
                    Visualizar
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleCreateNewAnalysis(user)}
                  >
                    Nova Análise
                  </Button>
                </div>
              ) : (
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleAnalyzeUser(user, analysis.id)}
                >
                  Continuar
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

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
          Em Análise <span className="text-secondary">({analysesInAnalysisCount})</span>
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
                  analyses={item.analyses}
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
          Analisados <span className="text-secondary">({analysesCompletedCount})</span>
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
                  analyses={item.analyses}
                  isCompleted={true}
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
          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <Spin size="large" />
            </div>
          ) : (
            <Tabs items={items} onChange={() => {}} />
          )}
        </div>
      </Content>
    </Layout>
  )
}
