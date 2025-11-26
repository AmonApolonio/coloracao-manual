'use client'

import { RefObject, useState, useEffect } from 'react'
import { Badge, Button, Space, Steps, Tooltip } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { App as AntdApp } from 'antd'
import { User, Analysis } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from '@/lib/types-db'
import { type InteractiveColorExtractionStepHandle } from '../../steps/color-extraction/InteractiveColorExtractionStep'
import { MAIN_ANALYSIS_STEPS, PIGMENT_SUB_STEPS, TOTAL_STEPS } from '../constants'
import {
  getStepMapping,
  isNextButtonDisabled,
  getNextButtonTooltip,
} from '../utils'

interface AnalysisHeaderProps {
  user: User
  analysis: Analysis
  currentStep: number
  setCurrentStep: (step: number) => void
  saving: boolean
  allColorsExtracted: boolean
  extractedColorsCount: number
  extractedColors: { [key: string]: string }
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
  selectedColorSeason?: ColorSeason | null
  colorExtractionRef: RefObject<InteractiveColorExtractionStepHandle | null>
  onSaveColorExtraction: (svgVectorData: any) => Promise<void>
  onSaveOtherStep: () => Promise<void>
  onSaveAndExit: (svgVectorData: any) => Promise<void>
  onCompleteAnalysis: (colorSeason?: ColorSeason | null) => Promise<void>
}

export function AnalysisHeader({
  user,
  analysis,
  currentStep,
  setCurrentStep,
  saving,
  allColorsExtracted,
  extractedColorsCount,
  extractedColors,
  pigmentAnalysisData,
  maskAnalysisData,
  selectedColorSeason,
  colorExtractionRef,
  onSaveColorExtraction,
  onSaveOtherStep,
  onSaveAndExit,
  onCompleteAnalysis,
}: AnalysisHeaderProps) {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  const { mainStep, subStep } = getStepMapping(currentStep)
  const [isScrolled, setIsScrolled] = useState(false)

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isDisabled = isNextButtonDisabled(
    currentStep,
    allColorsExtracted,
    maskAnalysisData,
    pigmentAnalysisData,
    extractedColorsCount
  )

  const disabledTooltip = isDisabled
    ? getNextButtonTooltip(currentStep, maskAnalysisData, pigmentAnalysisData, extractedColorsCount, extractedColors)
    : null

  const handleNextClick = () => {
    if (currentStep === 0) {
      let svgVectorData = {}
      if (colorExtractionRef.current) {
        svgVectorData = colorExtractionRef.current.getSVGVectorData()
      }
      onSaveColorExtraction(svgVectorData)
    } else {
      onSaveOtherStep()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveAndExitClick = async () => {
    try {
      let svgVectorData = {}
      if (currentStep === 0 && colorExtractionRef.current) {
        svgVectorData = colorExtractionRef.current.getSVGVectorData()
      }
      await onSaveAndExit(svgVectorData)
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/')
    } catch (error) {
      console.error('Error during save and exit:', error)
      message.error('Erro ao salvar antes de sair')
    }
  }

  // Get current step title with sub-step for Pigmentos
  const getFullStepTitle = () => {
    const mainTitle = MAIN_ANALYSIS_STEPS[mainStep]?.title || ''
    if (mainStep === 2 && subStep >= 0 && subStep < PIGMENT_SUB_STEPS.length) {
      return `${mainTitle} - ${PIGMENT_SUB_STEPS[subStep].title}`
    }
    return mainTitle
  }
  const currentStepTitle = getFullStepTitle()

  return (
    <header
      className={`
        sticky top-0 z-50 transition-all duration-300 ease-in-out w-full
        ${isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm py-2'
          : 'bg-transparent py-4'
        }
      `}
    >
      <div className={`
        flex items-center justify-between gap-4 transition-all duration-300 w-full
        ${isScrolled ? 'px-4' : 'px-0'}
      `}>
        {/* Left: User Info */}
        <div className="flex items-center gap-3 min-w-0">
          {user.face_photo_url && (
            <img
              src={user.face_photo_url}
              alt={user.name}
              className={`
                rounded-full object-cover border-2 border-white shadow-md
                transition-all duration-300
                ${isScrolled ? 'w-8 h-8' : 'w-12 h-12'}
              `}
            />
          )}
          <div className={`min-w-0 transition-all duration-300 ${isScrolled ? 'hidden sm:block' : ''}`}>
            <h1 className={`
              font-fraunces font-bold text-secondary truncate transition-all duration-300
              ${isScrolled ? 'text-sm' : 'text-lg'}
            `}>
              {user.name}
            </h1>
            {!isScrolled && (
              <Badge
                status={
                  analysis.status === 'completed'
                    ? 'success'
                    : analysis.status === 'in_process'
                      ? 'processing'
                      : 'default'
                }
                text={
                  <span className="text-xs text-gray-500">
                    {analysis.status === 'completed'
                      ? 'Concluída'
                      : analysis.status === 'in_process'
                        ? 'Em Progresso'
                        : 'Não Iniciada'}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Center: Steps (compact when scrolled) */}
        <div className={`
          flex-1 max-w-2xl transition-all duration-300
          ${isScrolled ? 'hidden md:block' : ''}
        `}>
          {isScrolled ? (
            <div className="flex items-center justify-center gap-3">
              {MAIN_ANALYSIS_STEPS.map((step, index) => (
                <div
                  key={step.key}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      index < mainStep
                        ? '#22c55e'
                        : index === mainStep
                          ? '#947B62'
                          : '#d1d5db',
                  }}
                  className="transition-all duration-200"
                  title={step.title}
                />
              ))}
              <span className="ml-1 text-xs text-gray-600 font-medium">
                {currentStepTitle}
              </span>
            </div>
          ) : (
            <Steps
              current={mainStep}
              size="small"
              items={MAIN_ANALYSIS_STEPS.map((step) => ({
                title: <span className="text-xs">{step.title}</span>,
                status:
                  mainStep > MAIN_ANALYSIS_STEPS.indexOf(step)
                    ? 'finish'
                    : mainStep === MAIN_ANALYSIS_STEPS.indexOf(step)
                      ? 'process'
                      : 'wait',
              }))}
            />
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center">
          <Space size={isScrolled ? 'small' : 'middle'}>
            {currentStep > 0 && (
              <Button
                type="text"
                size={isScrolled ? 'small' : 'middle'}
                icon={<ArrowLeftOutlined />}
                onClick={() => setCurrentStep(currentStep - 1)}
                className={isScrolled ? '' : 'hidden sm:inline-flex'}
              >
                {!isScrolled && <span className="hidden md:inline">Anterior</span>}
              </Button>
            )}
            
            <Button
              type="text"
              size={isScrolled ? 'small' : 'middle'}
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSaveAndExitClick}
            >
              {!isScrolled && <span className="hidden md:inline">Salvar</span>}
            </Button>

            {currentStep === TOTAL_STEPS - 1 ? (
              <Button
                type="primary"
                size={isScrolled ? 'small' : 'middle'}
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => onCompleteAnalysis(selectedColorSeason)}
              >
                {isScrolled ? '' : 'Concluir'}
              </Button>
            ) : (
              <Tooltip title={disabledTooltip} color="#ff4d4f">
                <Button
                  type="primary"
                  size={isScrolled ? 'small' : 'middle'}
                  loading={saving}
                  disabled={isDisabled}
                  onClick={handleNextClick}
                  icon={isScrolled ? <ArrowRightOutlined /> : undefined}
                >
                  {isScrolled ? '' : 'Próximo'}
                  {!isScrolled && <ArrowRightOutlined />}
                </Button>
              </Tooltip>
            )}
          </Space>
        </div>
      </div>
    </header>
  )
}
