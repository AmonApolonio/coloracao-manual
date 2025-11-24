'use client'

import { Button, Card, Space, Typography, Row, Col } from 'antd'

const { Title, Paragraph, Text } = Typography

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="font-fraunces text-5xl font-bold text-secondary mb-4">
            Coloração Manual
          </h1>
          <p className="text-lg text-gray-600">
            Next.js + Tailwind CSS + Ant Design with Custom Theme
          </p>
        </div>

        {/* Theme Colors Display */}
        <Row gutter={[16, 16]} className="mb-16">
          <Col xs={24} sm={8}>
            <Card className="h-full border-2 border-secondary">
              <div
                className="w-full h-32 rounded-lg mb-4"
                style={{ backgroundColor: '#947B62' }}
              ></div>
              <Title level={4} className="font-fraunces">
                Secondary
              </Title>
              <Text>#947B62</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="h-full border-2 border-secondary">
              <div
                className="w-full h-32 rounded-lg mb-4"
                style={{ backgroundColor: '#F5F0EA' }}
              ></div>
              <Title level={4} className="font-fraunces">
                Selected
              </Title>
              <Text>#F5F0EA</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="h-full border-2 border-secondary">
              <div
                className="w-full h-32 rounded-lg mb-4 border-2 border-gray-300"
                style={{ backgroundColor: '#ffffff' }}
              ></div>
              <Title level={4} className="font-fraunces">
                Background
              </Title>
              <Text>#ffffff</Text>
            </Card>
          </Col>
        </Row>

        {/* Typography Demo */}
        <Card className="mb-16" style={{ backgroundColor: '#F5F0EA' }}>
          <Title level={2} className="font-fraunces text-secondary">
            Typography with Fraunces Font
          </Title>
          <Paragraph>
            This application demonstrates the integration of Next.js, Tailwind CSS, and Ant Design
            with a custom theme featuring:
          </Paragraph>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Font:</strong> Fraunces - A elegant serif font for headings
            </li>
            <li>
              <strong>Primary Color:</strong> Secondary Brown (#947B62)
            </li>
            <li>
              <strong>Accent Color:</strong> Selected Beige (#F5F0EA)
            </li>
            <li>
              <strong>Background:</strong> Clean White (#ffffff)
            </li>
          </ul>
        </Card>

        {/* Components Demo */}
        <Card className="mb-16">
          <Title level={2} className="font-fraunces">
            Ant Design Components
          </Title>
          <Space orientation="vertical" size="large" className="w-full">
            <div>
              <Paragraph>Interactive buttons with custom theme:</Paragraph>
              <Space>
                <Button type="primary" size="large">
                  Primary Button
                </Button>
                <Button size="large">Default Button</Button>
                <Button type="dashed" size="large">
                  Dashed Button
                </Button>
              </Space>
            </div>
          </Space>
        </Card>

        {/* Tailwind Demo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-selected rounded-lg p-6 border-l-4 border-secondary">
            <h3 className="font-fraunces text-secondary text-xl font-bold mb-2">
              Tailwind CSS
            </h3>
            <p className="text-gray-700">
              Utility-first CSS framework for rapid UI development with your custom color palette.
            </p>
          </div>
          <div className="bg-background rounded-lg p-6 border-l-4 border-secondary shadow-md">
            <h3 className="font-fraunces text-secondary text-xl font-bold mb-2">
              Ant Design
            </h3>
            <p className="text-gray-700">
              Enterprise-class UI library providing quality components and design patterns.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
