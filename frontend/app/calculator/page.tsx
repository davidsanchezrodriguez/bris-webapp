'use client'

import { useState } from 'react'
import { 
  Calculator, TrendingUp, Scale, ArrowRight, CheckCircle, XCircle,
  Droplets, Building2, Shield, TrendingDown, Info
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================================================
// Types
// ============================================================================

interface SecuritizationResult {
  approach: string
  p_parameter: number
  risk_weight: number
  risk_weight_percent: string
  rwa?:  number
  capital_requirement?:  number
  calculation_steps:  string[]
}

interface ComparisonResult {
  sec_irba: SecuritizationResult
  sec_sa:  SecuritizationResult
  optimal_approach: string
  rw_difference: number
  capital_savings?:  number
  recommendation: string
}

interface LeverageRatioResult {
  leverage_ratio: number
  leverage_ratio_percent: string
  total_exposure_measure: number
  compliant: boolean
  buffer_to_minimum: number
  breakdown: Record<string, number>
}

interface LCRResult {
  lcr: number
  lcr_percent: string
  compliant: boolean
  buffer_to_minimum: number
  hqla_total: number
  hqla_adjusted: number
  total_outflows: number
  total_inflows: number
  net_outflows: number
  hqla_breakdown: Record<string, number>
  outflow_breakdown: Record<string, number>
  inflow_breakdown: Record<string, number>
  caps_applied: Record<string, string>
}

interface NSFRResult {
  nsfr: number
  nsfr_percent: string
  compliant: boolean
  buffer_to_minimum: number
  total_asf: number
  total_rsf: number
  asf_breakdown: Record<string, number>
  rsf_breakdown: Record<string, number>
}

interface MRELResult {
  total_mrel: number
  mrel_ratio_rwa: number
  mrel_ratio_rwa_percent: string
  mrel_ratio_lem: number
  mrel_ratio_lem_percent: string
  subordination_ratio_percent: string
  compliant_rwa: boolean
  compliant_lem: boolean
  compliant_subordination: boolean
  overall_compliant: boolean
  buffer_rwa:  number
  buffer_lem:  number
  breakdown: Record<string, number>
}

interface IRRBBScenario {
  scenario_name: string
  delta_eve: number
  delta_eve_percent_tier1: string
  breaches_threshold: boolean
}

interface IRRBBResult {
  scenarios: IRRBBScenario[]
  worst_scenario: string
  worst_delta_eve: number
  worst_delta_eve_percent: string
  overall_compliant: boolean
  tier1_capital: number
  threshold_percent: number
}

type TabType = 'securitization' | 'leverage' | 'lcr' | 'nsfr' | 'mrel' | 'irrbb'

// ============================================================================
// Components
// ============================================================================

const ComplianceBadge = ({ compliant, label }: { compliant: boolean; label?:  string }) => (
  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
    compliant ?  'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }`}>
    {compliant ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
    {label || (compliant ? 'Cumple' : 'No Cumple')}
  </div>
)

const ProgressGauge = ({ 
  value, 
  min, 
  max, 
  threshold, 
  label 
}: { 
  value: number
  min: number
  max:  number
  threshold: number
  label: string
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const thresholdPosition = ((threshold - min) / (max - min)) * 100
  const isCompliant = value >= threshold

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
          {(value * 100).toFixed(2)}%
        </span>
      </div>
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${isCompliant ? 'bg-green-500' :  'bg-red-500'} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
        <div 
          className="absolute top-0 h-full w-0.5 bg-yellow-500"
          style={{ left: `${thresholdPosition}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">{(min * 100).toFixed(0)}%</span>
        <span className="text-xs text-yellow-600">Min: {(threshold * 100).toFixed(0)}%</span>
        <span className="text-xs text-gray-500">{(max * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('securitization')
  const [isLoading, setIsLoading] = useState(false)
  
  // Securitization state
  const [result, setResult] = useState<SecuritizationResult | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [kirb, setKirb] = useState('4. 0')
  const [lgd, setLgd] = useState('40')
  const [maturity, setMaturity] = useState('4')
  const [attachment, setAttachment] = useState('5')
  const [detachment, setDetachment] = useState('15')
  const [poolSize, setPoolSize] = useState('1000')
  const [approach, setApproach] = useState<'SEC-IRBA' | 'SEC-SA'>('SEC-IRBA')
  const [isSts, setIsSts] = useState(false)

  // Leverage state
  const [leverageResult, setLeverageResult] = useState<LeverageRatioResult | null>(null)
  const [tier1Capital, setTier1Capital] = useState('50000')
  const [onBalanceExposures, setOnBalanceExposures] = useState('1000000')
  const [derivativeExposures, setDerivativeExposures] = useState('50000')
  const [sftExposures, setSftExposures] = useState('30000')
  const [offBalanceItems, setOffBalanceItems] = useState('100000')
  const [ccfOffBalance, setCcfOffBalance] = useState('100')

  // LCR state
  const [lcrResult, setLcrResult] = useState<LCRResult | null>(null)
  const [hqlaL1, setHqlaL1] = useState('100000')
  const [hqlaL2a, setHqlaL2a] = useState('30000')
  const [hqlaL2b, setHqlaL2b] = useState('10000')
  const [retailStable, setRetailStable] = useState('200000')
  const [retailLessStable, setRetailLessStable] = useState('100000')
  const [wholesaleOp, setWholesaleOp] = useState('50000')
  const [wholesaleNonOp, setWholesaleNonOp] = useState('30000')
  const [inflows, setInflows] = useState('20000')

  // NSFR state
  const [nsfrResult, setNsfrResult] = useState<NSFRResult | null>(null)
  const [capitalLongTerm, setCapitalLongTerm] = useState('80000')
  const [stableRetailDep, setStableRetailDep] = useState('150000')
  const [lessStableDep, setLessStableDep] = useState('50000')
  const [wholesaleShort, setWholesaleShort] = useState('30000')
  const [cashReserves, setCashReserves] = useState('50000')
  const [corporateLoans, setCorporateLoans] = useState('100000')
  const [mortgages, setMortgages] = useState('200000')
  const [otherLoans, setOtherLoans] = useState('80000')

  // MREL state
  const [mrelResult, setMrelResult] = useState<MRELResult | null>(null)
  const [cet1, setCet1] = useState('40000')
  const [at1, setAt1] = useState('5000')
  const [tier2, setTier2] = useState('10000')
  const [seniorNonPref, setSeniorNonPref] = useState('15000')
  const [totalRwa, setTotalRwa] = useState('400000')
  const [leverageExposure, setLeverageExposure] = useState('1200000')

  // IRRBB state
  const [irrbbResult, setIrrbbResult] = useState<IRRBBResult | null>(null)
  const [irrbbTier1, setIrrbbTier1] = useState('50000')
  const [gaps, setGaps] = useState({
    overnight: '10000',
    m1: '5000',
    m3: '-3000',
    m6: '-5000',
    y1: '-10000',
    y2: '2000',
    y3: '5000',
    y5: '8000',
    y7: '3000',
    y10: '-2000',
    y15: '-1000',
    y20: '500'
  })

  // ============================================================================
  // API Calls
  // ============================================================================

  const calculateSecuritization = async () => {
    setIsLoading(true)
    setResult(null)
    setComparison(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/securitization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kirb: parseFloat(kirb) / 100,
          lgd: parseFloat(lgd) / 100,
          maturity: parseFloat(maturity),
          attachment: parseFloat(attachment) / 100,
          detachment: parseFloat(detachment) / 100,
          pool_size: parseFloat(poolSize),
          approach: approach,
          is_sts: isSts,
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const compareApproaches = async () => {
    setIsLoading(true)
    setResult(null)
    setComparison(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/securitization/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:  JSON.stringify({
          kirb: parseFloat(kirb) / 100,
          lgd: parseFloat(lgd) / 100,
          maturity:  parseFloat(maturity),
          attachment: parseFloat(attachment) / 100,
          detachment:  parseFloat(detachment) / 100,
          pool_size:  parseFloat(poolSize),
          is_sts: isSts,
        }),
      })
      if (!response.ok) throw new Error('Error en la comparación')
      setComparison(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateLeverageRatio = async () => {
    setIsLoading(true)
    setLeverageResult(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/leverage-ratio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier1_capital: parseFloat(tier1Capital),
          on_balance_exposures: parseFloat(onBalanceExposures),
          derivative_exposures: parseFloat(derivativeExposures),
          sft_exposures: parseFloat(sftExposures),
          off_balance_items: parseFloat(offBalanceItems),
          ccf_off_balance: parseFloat(ccfOffBalance) / 100,
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setLeverageResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateLCR = async () => {
    setIsLoading(true)
    setLcrResult(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/lcr`, {
        method: 'POST',
        headers:  { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hqla_level1: parseFloat(hqlaL1),
          hqla_level2a: parseFloat(hqlaL2a),
          hqla_level2b:  parseFloat(hqlaL2b),
          retail_deposits_stable: parseFloat(retailStable),
          retail_deposits_less_stable: parseFloat(retailLessStable),
          wholesale_operational: parseFloat(wholesaleOp),
          wholesale_non_operational: parseFloat(wholesaleNonOp),
          retail_inflows: parseFloat(inflows),
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setLcrResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateNSFR = async () => {
    setIsLoading(true)
    setNsfrResult(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/nsfr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON. stringify({
          capital_long_term_debt: parseFloat(capitalLongTerm),
          stable_retail_deposits: parseFloat(stableRetailDep),
          less_stable_deposits: parseFloat(lessStableDep),
          wholesale_funding_short: parseFloat(wholesaleShort),
          cash_and_reserves: parseFloat(cashReserves),
          corporate_loans_short: parseFloat(corporateLoans),
          residential_mortgages: parseFloat(mortgages),
          other_loans_long:  parseFloat(otherLoans),
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setNsfrResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMREL = async () => {
    setIsLoading(true)
    setMrelResult(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/mrel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cet1_capital: parseFloat(cet1),
          at1_capital:  parseFloat(at1),
          tier2_capital: parseFloat(tier2),
          senior_non_preferred: parseFloat(seniorNonPref),
          total_rwa: parseFloat(totalRwa),
          leverage_exposure: parseFloat(leverageExposure),
          mrel_requirement_rwa: 0.18,
          mrel_requirement_lem: 0.0675,
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setMrelResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateIRRBB = async () => {
    setIsLoading(true)
    setIrrbbResult(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/calculator/irrbb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gap_overnight: parseFloat(gaps. overnight),
          gap_1m: parseFloat(gaps.m1),
          gap_3m: parseFloat(gaps.m3),
          gap_6m: parseFloat(gaps.m6),
          gap_1y: parseFloat(gaps.y1),
          gap_2y: parseFloat(gaps.y2),
          gap_3y: parseFloat(gaps.y3),
          gap_5y: parseFloat(gaps.y5),
          gap_7y: parseFloat(gaps.y7),
          gap_10y: parseFloat(gaps.y10),
          gap_15y: parseFloat(gaps.y15),
          gap_20y_plus: parseFloat(gaps.y20),
          tier1_capital: parseFloat(irrbbTier1),
        }),
      })
      if (!response.ok) throw new Error('Error en el cálculo')
      setIrrbbResult(await response.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'securitization' as TabType, label: 'Securitización', icon: TrendingUp },
    { id: 'leverage' as TabType, label: 'Leverage Ratio', icon: Scale },
    { id: 'lcr' as TabType, label: 'LCR', icon: Droplets },
    { id: 'nsfr' as TabType, label: 'NSFR', icon: Building2 },
    { id: 'mrel' as TabType, label: 'MREL', icon: Shield },
    { id: 'irrbb' as TabType, label: 'IRRBB', icon: TrendingDown },
  ]
