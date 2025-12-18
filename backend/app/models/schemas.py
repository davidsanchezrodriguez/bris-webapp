"""
Pydantic schemas for BRIS API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# Chat Models
# ============================================================================

class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    message: str = Field(..., description="User message", min_length=1, max_length=2000)
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    include_sources: bool = Field(True, description="Include source documents in response")
    language: str = Field("es", description="Response language: 'es' or 'en'")


class Source(BaseModel):
    """Source document reference."""
    title: str
    file_name: Optional[str] = None
    regulatory_topic: Optional[str] = None
    excerpt: str
    relevance_score: Optional[float] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    answer: str
    sources: List[Source] = []
    session_id: str
    confidence: str = Field("medium", description="Confidence level: low, medium, high")
    suggestions: List[str] = Field([], description="Follow-up question suggestions")
    processing_time_ms: Optional[int] = None


# ============================================================================
# Calculator Models
# ============================================================================

class SecuritizationApproach(str, Enum):
    SEC_IRBA = "SEC-IRBA"
    SEC_SA = "SEC-SA"
    SEC_ERBA = "SEC-ERBA"


class SecuritizationRequest(BaseModel):
    """Request for securitization RW calculation."""
    kirb: float = Field(..., ge=0.001, le=0.50, description="KIRB (e.g., 0.04 for 4%)")
    ksa: Optional[float] = Field(None, ge=0.001, le=0.50, description="KSA for SEC-SA")
    lgd: float = Field(0.40, ge=0.05, le=0.95, description="Pool LGD")
    maturity: float = Field(4.0, ge=1.0, le=10.0, description="Weighted average maturity")
    attachment: float = Field(..., ge=0.0, le=1.0, description="Attachment point")
    detachment: float = Field(..., ge=0.0, le=1.0, description="Detachment point")
    pool_size: Optional[float] = Field(None, description="Pool size in EUR millions")
    approach: SecuritizationApproach = SecuritizationApproach.SEC_IRBA
    is_sts: bool = Field(False, description="Is STS securitization")


class SecuritizationResult(BaseModel):
    """Result of securitization calculation."""
    approach: str
    p_parameter: float
    risk_weight: float
    risk_weight_percent: str
    rwa: Optional[float] = None
    capital_requirement: Optional[float] = None
    calculation_steps: List[str]
    inputs: Dict[str, Any]


class SecuritizationComparison(BaseModel):
    """Comparison between approaches."""
    sec_irba: SecuritizationResult
    sec_sa: SecuritizationResult
    optimal_approach: str
    rw_difference: float
    capital_savings: Optional[float] = None
    recommendation: str


class LeverageRatioRequest(BaseModel):
    """Request for leverage ratio calculation."""
    tier1_capital: float = Field(..., description="Tier 1 capital in EUR millions")
    on_balance_exposures: float = Field(..., description="On-balance sheet exposures")
    derivative_exposures: float = Field(0, description="Derivative exposures (SA-CCR)")
    sft_exposures: float = Field(0, description="SFT exposures")
    off_balance_items: float = Field(0, description="Off-balance sheet items")
    ccf_off_balance: float = Field(1.0, ge=0.1, le=1.0, description="CCF for off-balance")


class LeverageRatioResult(BaseModel):
    """Result of leverage ratio calculation."""
    leverage_ratio: float
    leverage_ratio_percent: str
    total_exposure_measure: float
    compliant: bool
    buffer_to_minimum: float
    breakdown: Dict[str, float]


class RWARequest(BaseModel):
    """Request for RWA calculation."""
    exposure_class: str = Field(..., description="Exposure class (corporate, retail, etc.)")
    exposure_amount: float = Field(..., description="Exposure amount in EUR millions")
    approach: str = Field("SA", description="SA or IRB")
    pd: Optional[float] = Field(None, description="PD for IRB (e.g., 0.02 for 2%)")
    lgd: Optional[float] = Field(None, description="LGD for IRB")
    maturity: Optional[float] = Field(None, description="Maturity for IRB")
    risk_weight_override: Optional[float] = Field(None, description="Manual RW for SA")


class RWAResult(BaseModel):
    """Result of RWA calculation."""
    exposure_class: str
    approach: str
    risk_weight: float
    rwa: float
    capital_requirement: float
    calculation_steps: List[str]


# ============================================================================
# Document Models
# ============================================================================

class DocumentInfo(BaseModel):
    """Information about an indexed document."""
    title: str
    file_name: str
    regulatory_topic: str
    source_authority: str
    chunk_count: int


class DocumentStats(BaseModel):
    """Statistics about the document database."""
    total_chunks: int
    total_documents: int
    topics: Dict[str, int]
    authorities: Dict[str, int]


class SearchRequest(BaseModel):
    """Request for document search."""
    query: str = Field(..., min_length=3, max_length=500)
    top_k: int = Field(5, ge=1, le=20)
    topic_filter: Optional[str] = None


class SearchResult(BaseModel):
    """Result of document search."""
    query: str
    results: List[Source]
    total_found: int
# Añade estos imports al inicio del archivo si no están: 
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

# ============================================================================
# LCR (Liquidity Coverage Ratio)
# ============================================================================

class LCRRequest(BaseModel):
    """Request for LCR calculation."""
    # HQLA
    hqla_level1: float = Field(..., description="Level 1 HQLA (cash, central bank reserves, sovereigns)")
    hqla_level2a: float = Field(0, description="Level 2A HQLA (AA- corporate bonds, covered bonds)")
    hqla_level2b: float = Field(0, description="Level 2B HQLA (BBB corporate bonds, equities)")
    
    # Outflows
    retail_deposits_stable: float = Field(0, description="Stable retail deposits (5% runoff)")
    retail_deposits_less_stable: float = Field(0, description="Less stable retail deposits (10% runoff)")
    wholesale_operational:  float = Field(0, description="Operational wholesale deposits (25% runoff)")
    wholesale_non_operational: float = Field(0, description="Non-operational wholesale (40% runoff)")
    secured_funding: float = Field(0, description="Secured funding outflows")
    other_outflows: float = Field(0, description="Other contractual outflows")
    
    # Inflows
    retail_inflows: float = Field(0, description="Retail inflows")
    wholesale_inflows: float = Field(0, description="Wholesale inflows")
    other_inflows: float = Field(0, description="Other contractual inflows")


class LCRResult(BaseModel):
    """Result of LCR calculation."""
    lcr: float
    lcr_percent: str
    compliant: bool
    buffer_to_minimum: float
    hqla_total: float
    hqla_adjusted: float
    total_outflows: float
    total_inflows: float
    net_outflows: float
    hqla_breakdown: Dict[str, float]
    outflow_breakdown: Dict[str, float]
    inflow_breakdown:  Dict[str, float]
    caps_applied: Dict[str, str]


# ============================================================================
# NSFR (Net Stable Funding Ratio)
# ============================================================================

class NSFRRequest(BaseModel):
    """Request for NSFR calculation."""
    # Available Stable Funding (ASF)
    capital_long_term_debt: float = Field(0, description="Capital and debt >1 year (100% ASF)")
    stable_retail_deposits: float = Field(0, description="Stable retail deposits (95% ASF)")
    less_stable_deposits: float = Field(0, description="Less stable deposits (90% ASF)")
    wholesale_funding_short:  float = Field(0, description="Wholesale funding <1 year (50% ASF)")
    other_liabilities: float = Field(0, description="Other liabilities (0% ASF)")
    
    # Required Stable Funding (RSF)
    cash_and_reserves: float = Field(0, description="Cash and reserves (0% RSF)")
    hqla_level1: float = Field(0, description="HQLA Level 1 (5% RSF)")
    hqla_level2: float = Field(0, description="HQLA Level 2 (15% RSF)")
    loans_to_fi_short: float = Field(0, description="Loans to FIs <6 months (10% RSF)")
    corporate_loans_short: float = Field(0, description="Corporate loans <1 year (50% RSF)")
    residential_mortgages: float = Field(0, description="Residential mortgages (65% RSF)")
    other_loans_long:  float = Field(0, description="Other loans >1 year (85% RSF)")
    npl_assets: float = Field(0, description="Non-performing assets (100% RSF)")
    other_assets: float = Field(0, description="Other assets (100% RSF)")


class NSFRResult(BaseModel):
    """Result of NSFR calculation."""
    nsfr: float
    nsfr_percent: str
    compliant: bool
    buffer_to_minimum: float
    total_asf: float
    total_rsf: float
    asf_breakdown: Dict[str, float]
    rsf_breakdown: Dict[str, float]


# ============================================================================
# MREL/TLAC Calculator
# ============================================================================

class MRELRequest(BaseModel):
    """Request for MREL/TLAC calculation."""
    cet1_capital: float = Field(... , description="CET1 Capital")
    at1_capital: float = Field(0, description="Additional Tier 1 Capital")
    tier2_capital: float = Field(0, description="Tier 2 Capital")
    senior_non_preferred:  float = Field(0, description="Senior non-preferred debt")
    other_eligible:  float = Field(0, description="Other MREL-eligible instruments")
    total_rwa: float = Field(... , description="Total Risk-Weighted Assets")
    leverage_exposure: float = Field(... , description="Leverage Exposure Measure")
    mrel_requirement_rwa: float = Field(0.18, description="MREL requirement as % of RWA")
    mrel_requirement_lem: float = Field(0.0675, description="MREL requirement as % of LEM")
    subordination_requirement: float = Field(0.08, description="Subordination requirement as % of RWA")


class MRELResult(BaseModel):
    """Result of MREL/TLAC calculation."""
    total_mrel: float
    mrel_ratio_rwa: float
    mrel_ratio_rwa_percent: str
    mrel_ratio_lem: float
    mrel_ratio_lem_percent: str
    subordinated_amount: float
    subordination_ratio: float
    subordination_ratio_percent: str
    compliant_rwa: bool
    compliant_lem: bool
    compliant_subordination: bool
    overall_compliant: bool
    buffer_rwa: float
    buffer_lem: float
    buffer_subordination: float
    breakdown: Dict[str, float]


# ============================================================================
# CVA Risk Calculator (SA-CVA Basic)
# ============================================================================

class CounterpartyExposure(BaseModel):
    """Single counterparty exposure for CVA."""
    name: str
    sector: str = Field(..., description="financial, corporate, sovereign")
    rating: str = Field(..., description="AAA, AA, A, BBB, BB, B, CCC")
    ead: float = Field(... , description="Exposure at Default")
    maturity: float = Field(..., description="Effective maturity in years")
    hedge_notional: float = Field(0, description="CDS hedge notional")


class CVARequest(BaseModel):
    """Request for CVA risk calculation."""
    counterparties: List[CounterpartyExposure]


class CVAResult(BaseModel):
    """Result of CVA calculation."""
    total_cva_capital: float
    cva_capital_by_counterparty: List[Dict[str, float]]
    total_ead: float
    hedging_benefit: float
    aggregate_risk_weight: float


# ============================================================================
# Large Exposures Calculator
# ============================================================================

class LargeExposure(BaseModel):
    """Single large exposure entry."""
    group_name: str
    gross_exposure: float
    collateral:  float = 0
    guarantees: float = 0


class LargeExposuresRequest(BaseModel):
    """Request for large exposures calculation."""
    exposures: List[LargeExposure]
    tier1_capital: float = Field(..., description="Eligible Tier 1 Capital")
    is_gsib: bool = Field(False, description="Is the entity a G-SIB")


class LargeExposuresResult(BaseModel):
    """Result of large exposures calculation."""
    exposures_detail: List[Dict]
    large_exposures_count: int
    breaches_count: int
    total_concentration: float
    tier1_capital: float
    limit_percent: float


# ============================================================================
# IRRBB Calculator
# ============================================================================

class IRRBBRequest(BaseModel):
    """Request for IRRBB calculation."""
    # Rate-sensitive gaps by time bucket (in EUR millions)
    gap_overnight: float = Field(0)
    gap_1m: float = Field(0)
    gap_3m: float = Field(0)
    gap_6m: float = Field(0)
    gap_1y: float = Field(0)
    gap_2y: float = Field(0)
    gap_3y: float = Field(0)
    gap_5y: float = Field(0)
    gap_7y: float = Field(0)
    gap_10y: float = Field(0)
    gap_15y: float = Field(0)
    gap_20y_plus: float = Field(0)
    tier1_capital: float = Field(... , description="Tier 1 Capital for threshold comparison")


class IRRBBScenarioResult(BaseModel):
    """Result for a single IRRBB scenario."""
    scenario_name: str
    delta_eve: float
    delta_eve_percent_tier1: str
    breaches_threshold: bool


class IRRBBResult(BaseModel):
    """Result of IRRBB calculation."""
    scenarios: List[IRRBBScenarioResult]
    worst_scenario: str
    worst_delta_eve: float
    worst_delta_eve_percent:  str
    tier1_capital: float
    threshold_percent: float
    overall_compliant: bool
    gap_profile: Dict[str, float]
