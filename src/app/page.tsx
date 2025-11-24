'use client'

import { useState, useEffect } from 'react'
import {
  Layout,
  Tabs,
  Card,
  Button,
  Modal,
  Form,
  Select,
  Input,
  Avatar,
  Space,
  Empty,
  Spin,
  message,
} from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { supabase } from '@/lib/supabase'
import { ColorSeason, User, UserWithAnalysis } from '@/lib/types'

const { Content } = Layout

const COLOR_SEASONS: ColorSeason[] = [
  'Verão Frio',
  'Verão Suave',
  'Verão Claro',
  'Inverno Frio',
  'Inverno Brilhante',
  'Inverno Escuro',
  'Outono Quente',
  'Outono Suave',
  'Outono Escuro',
  'Primavera Brilhante',
  'Primavera Clara',
  'Primavera Quente',
]

export default function Home() {
  const [usersWithoutAnalysis, setUsersWithoutAnalysis] = useState<User[]>([])
  const [usersWithAnalysis, setUsersWithAnalysis] = useState<UserWithAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form] = Form.useForm()

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

      const analyzedUserIds = new Set(analyses?.map(a => a.user_id) || [])

      const pending = allUsers?.filter(u => !analyzedUserIds.has(u.id)) || []
      const completed = (allUsers || [])
        .filter(u => analyzedUserIds.has(u.id))
        .map(u => ({
          ...u,
          analysis: analyses?.find(a => a.user_id === u.id) || null,
        }))

      setUsersWithoutAnalysis(pending)
      setUsersWithAnalysis(completed)
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeUser = (user: User) => {
    setSelectedUser(user)
    form.resetFields()
    setModalOpen(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()

      if (!selectedUser) return

      // Check if analysis already exists
      const { data: existingAnalysis, error: checkError } = await supabase
        .from('analyses')
        .select('id')
        .eq('user_id', selectedUser.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingAnalysis) {
        // Update existing analysis
        await supabase
          .from('analyses')
          .update({
            color_season: values.colorSeason,
            notes: values.notes || null,
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', selectedUser.id)
      } else {
        // Create new analysis
        await supabase.from('analyses').insert({
          user_id: selectedUser.id,
          color_season: values.colorSeason,
          notes: values.notes || null,
          analyzed_at: new Date().toISOString(),
        })
      }

      message.success('Análise salva com sucesso!')
      setModalOpen(false)
      setSelectedUser(null)
      form.resetFields()
      loadData()
    } catch (error) {
      console.error('Error saving analysis:', error)
      message.error('Erro ao salvar análise')
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
              <div><strong>Tipo:</strong> {analysis.color_season}</div>
              {analysis.notes && (
                <div><strong>Notas:</strong> {analysis.notes}</div>
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
        {analysis ? 'Editar' : 'Analisar'}
      </Button>
    </div>
  )

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <span>
          Pendentes <span className="text-secondary">({usersWithoutAnalysis.length})</span>
        </span>
      ),
      children: (
        <Card className="border-secondary border-2">
          {usersWithoutAnalysis.length === 0 ? (
            <Empty description="Nenhum usuário pendente de análise" />
          ) : (
            <div>
              {usersWithoutAnalysis.map(user => (
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
          Analisados <span className="text-secondary">({usersWithAnalysis.length})</span>
        </span>
      ),
      children: (
        <Card className="border-secondary border-2">
          {usersWithAnalysis.length === 0 ? (
            <Empty description="Nenhum usuário com análise" />
          ) : (
            <div>
              {usersWithAnalysis.map(item => (
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

      <Modal
        title={
          selectedUser
            ? `Analisar: ${selectedUser.name}`
            : 'Nova Análise'
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setModalOpen(false)
          setSelectedUser(null)
          form.resetFields()
        }}
        okText="Salvar"
        cancelText="Cancelar"
      >
        {selectedUser && (
          <div className="mb-4">
            <div className="flex items-center gap-4 pb-4 border-b-2 border-selected">
              <Avatar
                size={64}
                icon={<UserOutlined />}
                src={selectedUser.face_photo_url || undefined}
              />
              <div>
                <div className="font-semibold text-lg">{selectedUser.name}</div>
                {selectedUser.face_photo_url && (
                  <div className="text-sm text-gray-500">Foto de rosto</div>
                )}
              </div>
            </div>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            colorSeason: '',
            notes: '',
          }}
        >
          <Form.Item
            label="Tipo de Coloração"
            name="colorSeason"
            rules={[
              { required: true, message: 'Por favor selecione um tipo' },
            ]}
          >
            <Select
              placeholder="Selecione um tipo de coloração"
              options={COLOR_SEASONS.map(season => ({
                label: season,
                value: season,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Notas (opcional)"
            name="notes"
          >
            <Input.TextArea
              rows={3}
              placeholder="Adicione notas sobre a análise..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
