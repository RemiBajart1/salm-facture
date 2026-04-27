import { useState } from 'react'
import styles from './Pages.module.css'
import { AccueilGardien } from '../components/gardien/AccueilGardien'
import { SaisiePersonnes } from '../components/gardien/SaisiePersonnes'
import { SaisieSupplements } from '../components/gardien/SaisieSupplements'
import { Recapitulatif } from '../components/gardien/Recapitulatif'
import { Encaissement } from '../components/gardien/Encaissement'
import { SuccesPage } from '../components/gardien/SuccesPage'

export type GardienStep =
  | 'accueil'
  | 'personnes'
  | 'supplements'
  | 'recapitulatif'
  | 'encaissement'
  | 'succes'

const STEPS_WITH_STEPPER: GardienStep[] = ['personnes', 'supplements', 'recapitulatif']
const STEP_ORDER: GardienStep[]         = ['personnes', 'supplements', 'recapitulatif']

const STEP_TITLES: Record<GardienStep, string> = {
  accueil:       'Accueil',
  personnes:     'Personnes',
  supplements:   'Suppléments',
  recapitulatif: 'Récapitulatif',
  encaissement:  'Encaissement',
  succes:        'Succès',
}

const STEP_BACK: Partial<Record<GardienStep, GardienStep>> = {
  personnes:     'accueil',
  supplements:   'personnes',
  recapitulatif: 'supplements',
  encaissement:  'recapitulatif',
}

/** Layout mobile-first du gardien avec navigation par étapes */
export function GardienPage() {
  const [step, setStep] = useState<GardienStep>('accueil')

  const showSubHeader = step !== 'accueil' && step !== 'succes'
  const showStepper   = STEPS_WITH_STEPPER.includes(step)
  const stepIdx       = STEP_ORDER.indexOf(step)
  const backStep      = STEP_BACK[step]
  const stepLabel     = STEPS_WITH_STEPPER.includes(step) ? `${stepIdx + 1}/${STEP_ORDER.length}` : undefined

  return (
    <div className={styles.phone}>
      {/* Navigation entre étapes */}
      {showSubHeader && (
        <div className={styles.subHeader}>
          {backStep && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setStep(backStep)}
            >
              ← {STEP_TITLES[backStep]}
            </button>
          )}
          <div className={styles.subHeaderTitle}>{STEP_TITLES[step]}</div>
          {stepLabel && <div className={styles.stepLbl}>{stepLabel}</div>}
        </div>
      )}

      {/* Barre de progression */}
      {showStepper && (
        <div className={styles.stepper}>
          {STEP_ORDER.map((s, idx) => (
            <div
              key={s}
              className={`${styles.stepDot} ${idx <= stepIdx ? styles.stepDotActive : ''}`}
            />
          ))}
        </div>
      )}

      {/* Contenu */}
      <div className={styles.screenContent}>
        {step === 'accueil'       && <AccueilGardien     onNavigate={setStep} />}
        {step === 'personnes'     && <SaisiePersonnes    onNavigate={setStep} />}
        {step === 'supplements'   && <SaisieSupplements  onNavigate={setStep} />}
        {step === 'recapitulatif' && <Recapitulatif      onNavigate={setStep} />}
        {step === 'encaissement'  && <Encaissement       onNavigate={setStep} />}
        {step === 'succes'        && <SuccesPage         onNavigate={setStep} />}
      </div>
    </div>
  )
}
