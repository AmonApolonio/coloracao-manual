'use client'

import { RefObject, useState, useEffect } from 'react'
import { Badge, Button, Space, Steps, Tooltip, Modal } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette, faFlagCheckered } from '@fortawesome/free-solid-svg-icons'
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
import { PictureInPicture } from './PictureInPicture'
import { ColorPaletteInPicture } from './ColorPaletteInPicture'

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
  isReadOnly?: boolean
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
  isReadOnly,
}: AnalysisHeaderProps) {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  const { mainStep, subStep } = getStepMapping(currentStep)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [exitLoading, setExitLoading] = useState(false)
  const [showPictureInPicture, setShowPictureInPicture] = useState(false)
  const [showColorPalette, setShowColorPalette] = useState(false)

  // Track scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting)
      },
      {
        threshold: 0,
        rootMargin: '-50px 0px 0px 0px'
      }
    )

    const sentinel = document.createElement('div')
    sentinel.style.height = '1px'
    document.body.insertBefore(sentinel, document.body.firstChild)

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      document.body.removeChild(sentinel)
    }
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

  // Handle save button click (save only, no exit)
  const handleSaveClick = async () => {
    try {
      let svgVectorData = {}
      if (currentStep === 0 && colorExtractionRef.current) {
        svgVectorData = colorExtractionRef.current.getSVGVectorData()
      }
      await onSaveAndExit(svgVectorData)
      message.success('Progresso salvo!')
    } catch (error) {
      console.error('Error saving:', error)
      message.error('Erro ao salvar')
    }
  }

  // Handle exit button click
  const handleExitClick = () => {
    if (isReadOnly) {
      // In read-only mode, just leave without asking
      router.push('/')
    } else {
      // Show confirmation modal
      setShowExitModal(true)
    }
  }

  // Handle save and exit from modal
  const handleSaveAndExit = async () => {
    try {
      setExitLoading(true)
      let svgVectorData = {}
      if (currentStep === 0 && colorExtractionRef.current) {
        svgVectorData = colorExtractionRef.current.getSVGVectorData()
      }
      await onSaveAndExit(svgVectorData)
      message.success('Progresso salvo!')
      router.push('/')
    } catch (error) {
      console.error('Error during save and exit:', error)
      message.error('Erro ao salvar antes de sair')
    } finally {
      setExitLoading(false)
      setShowExitModal(false)
    }
  }

  // Handle exit without saving from modal
  const handleExitWithoutSaving = () => {
    setShowExitModal(false)
    router.push('/')
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
    <>
      {/* Picture-in-Picture floating window */}
      {showPictureInPicture && user.face_photo_url && (
        <PictureInPicture
          imageUrl={user.face_photo_url}
          alt={user.name}
          onClose={() => setShowPictureInPicture(false)}
        />
      )}

      {/* Color Palette Picture-in-Picture floating window */}
      {showColorPalette && analysis.extracao && (
        <ColorPaletteInPicture
          extractedColors={analysis.extracao}
          onClose={() => setShowColorPalette(false)}
        />
      )}

      <header
        className={`
          sticky top-0 z-50 transition-all duration-300 ease-in-out w-full
          px-4 py-3
          ${isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
          }
        `}
      >
      {/* Exit Confirmation Modal */}
      <Modal
        title="Sair da Análise"
        open={showExitModal}
        onCancel={() => setShowExitModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowExitModal(false)}>
            Cancelar
          </Button>,
          <Button key="exitWithoutSave" danger onClick={handleExitWithoutSaving}>
            Sair sem Salvar
          </Button>,
          <Button key="saveAndExit" type="primary" loading={exitLoading} onClick={handleSaveAndExit}>
            Salvar e Sair
          </Button>,
        ]}
      >
        <p>Você tem alterações não salvas. O que deseja fazer?</p>
      </Modal>

      <div className={`
        flex items-center justify-between gap-4 transition-all duration-300 w-full
      `}>
        {/* Left: Exit Button + User Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Exit Button */}
          <Button
            type="text"
            size={isScrolled ? 'small' : 'middle'}
            icon={<CloseOutlined />}
            onClick={handleExitClick}
            className="text-gray-500 hover:text-gray-700"
          />
          
          {/* Photo and Tones Button Container */}
          <div className="flex items-center gap-1">
            {user.face_photo_url && (
              <Tooltip title="Clique para abrir foto como referência" placement="bottom">
                <img
                  src={user.face_photo_url}
                  alt={user.name}
                  onClick={() => setShowPictureInPicture(true)}
                  className={`
                    w-10 h-10 rounded-full object-cover border-2 border-white shadow-md
                    transition-all duration-300 cursor-pointer
                    hover:ring-2 hover:ring-primary/50 hover:scale-105
                    ${isScrolled ? 'scale-80' : 'scale-100'}
                  `}
                />
              </Tooltip>
            )}

            {/* Tones Button */}
            {analysis.extracao && Object.keys(analysis.extracao).length > 0 && (
              <Tooltip title="Clique para abrir paleta de cores" placement="bottom">
                <button
                  onClick={() => setShowColorPalette(true)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    bg-gradient-to-br from-[#c9a88a] via-[#d4b89c] to-[#b39e87]
                    border-2 border-white shadow-md
                    transition-all duration-300 cursor-pointer
                    hover:ring-2 hover:ring-[#947B62]/50 hover:scale-105
                    ${isScrolled ? 'scale-80' : 'scale-100'}
                  `}
                  title="Paleta de Cores"
                >
                  <FontAwesomeIcon icon={faPalette} className="text-white text-lg" />
                </button>
              </Tooltip>
            )}
          </div>

          <div className={`min-w-0 transition-all duration-300`}>
            <h1 className={`
              font-fraunces font-bold text-secondary truncate transition-all duration-300
              ${isScrolled ? 'text-sm' : 'text-lg'}
            `}>
              {user.name}
            </h1>
            <Badge
              status={
                analysis.status === 'completed'
                  ? 'success'
                  : analysis.status === 'in_process'
                    ? 'processing'
                    : 'default'
              }
              text={
                <span className={`text-xs text-gray-500 transition-all duration-300 opacity-100`}>
                  {analysis.status === 'completed'
                    ? 'Concluída'
                    : analysis.status === 'in_process'
                      ? 'Em Progresso'
                      : 'Não Iniciada'}
                </span>
              }
            />
          </div>
        </div>

        {/* Center: Steps (compact when scrolled) */}
        <div className={`
          flex-1 max-w-2xl transition-all duration-300
          ${isScrolled ? 'hidden md:block' : 'block'}
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
            
            {/* Save button - only show when not in read-only mode */}
            {!isReadOnly && (
              <Button
                type="text"
                size={isScrolled ? 'small' : 'middle'}
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveClick}
              >
                {!isScrolled && <span className="hidden md:inline">Salvar</span>}
              </Button>
            )}

            {/* Hide next/complete buttons in read-only mode */}
            {!isReadOnly && (
              currentStep === TOTAL_STEPS - 1 ? (
                <Tooltip 
                  title={!selectedColorSeason ? 'Selecione a Classificação Final da Estação' : null} 
                  color="#ff4d4f"
                >
                  <Button
                    type="primary"
                    size={isScrolled ? 'small' : 'middle'}
                    icon={<FontAwesomeIcon icon={faFlagCheckered} />}
                    loading={saving}
                    disabled={!selectedColorSeason}
                    onClick={() => onCompleteAnalysis(selectedColorSeason)}
                  >
                    {isScrolled ? 'Concluir' : 'Concluir'}
                  </Button>
                </Tooltip>
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
              )
            )}

            {/* Show next button for navigation only in read-only mode */}
            {isReadOnly && currentStep < TOTAL_STEPS - 1 && (
              <Button
                type="primary"
                size={isScrolled ? 'small' : 'middle'}
                onClick={() => setCurrentStep(currentStep + 1)}
                icon={isScrolled ? <ArrowRightOutlined /> : undefined}
              >
                {isScrolled ? '' : 'Próximo'}
                {!isScrolled && <ArrowRightOutlined />}
              </Button>
            )}
          </Space>
        </div>
      </div>
      </header>
    </>
  )
}
