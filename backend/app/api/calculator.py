"""
Regulatory Calculator API endpoints.
"""

from fastapi import APIRouter, HTTPException
import math
from typing import Dict, Any

from app.models.schemas import (
    SecuritizationRequest, SecuritizationResult, SecuritizationComparison,
    LeverageRatioRequest, LeverageRatioResult,
    RWARequest, RWAResult
)

router = APIRouter()


# ============================================================================
# Securitization Calculator
# ============================================================================

def calculate_p_parameter(kirb: float, lgd: float, maturity: float, approach: str) -> float:
    """Calculate p-parameter for securitization."""
    if approach == "SEC-SA":
        return 0.5

    # SEC-IRBA formula
    p_raw = 3.56 * kirb - 1.85 * (kirb ** 2) + 0.55 * lgd + 0.07 * maturity
    return max(0.3, p_raw)


def calculate_kssfa(kirb: float, attachment: float, detachment: float, p: float) -> float:
    """Calculate KSSFA using supervisory formula."""
    if kirb <= 0 or p <= 0:
        return 1.0

    a = -1.0 / (p * kirb)

    # Calculate u and l
    u = detachment - kirb
    l = max(attachment - kirb, 0)

    if u <= 0:
        return 1.0  # Entire tranche is first loss

    if l >= u:
        return 0.0

    try:
        # KSSFA formula
        if abs(a * (u - l)) < 0.0001:
            kssfa = 1.0
        else:
            exp_au = math.exp(a * u)
            exp_al = math.exp(a * l)
            kssfa = (exp_au - exp_al) / (a * (u - l))
    except (OverflowError, ValueError):
        kssfa = 1.0

    return max(0, min(kssfa, 1.0))


def calculate_risk_weight(kirb: float, attachment: float, detachment: float,
                          p: float, is_sts: bool = False) -> float:
    """Calculate risk weight for a securitization tranche."""
    if attachment >= detachment:
        raise ValueError("Attachment must be less than detachment")

    # If entire tranche is below KIRB -> 1250%
    if detachment <= kirb:
        return 12.5  # 1250%

    # If tranche is entirely above KIRB
    if attachment >= kirb:
        kssfa = calculate_kssfa(kirb, attachment, detachment, p)
        rw = 12.5 * kssfa / (detachment - attachment)
    else:
        # Mixed case: part below, part above KIRB
        kssfa_a = calculate_kssfa(kirb, attachment, detachment, p)
        kssfa_d = calculate_kssfa(kirb, detachment, detachment, p)
        rw = 12.5 * (kssfa_a - kssfa_d) / (detachment - attachment)

    # Apply floors
    rw_floor = 0.10 if is_sts else 0.15
    rw = max(rw, rw_floor)

    # Cap at 1250%
    rw = min(rw, 12.5)

    return rw


@router.post("/securitization", response_model=SecuritizationResult)
async def calculate_securitization(request: SecuritizationRequest):
    """Calculate risk weight for a securitization tranche."""
    try:
        # Calculate p-parameter
        p = calculate_p_parameter(
            kirb=request.kirb,
            lgd=request.lgd,
            maturity=request.maturity,
            approach=request.approach.value
        )

        # Use KSA for SEC-SA if provided
        k_value = request.ksa if request.approach.value == "SEC-SA" and request.ksa else request.kirb

        # Calculate risk weight
        rw = calculate_risk_weight(
            kirb=k_value,
            attachment=request.attachment,
            detachment=request.detachment,
            p=p,
            is_sts=request.is_sts
        )

        # Calculate RWA and capital if pool size provided
        rwa = None
        capital = None
        if request.pool_size:
            tranche_size = request.pool_size * (request.detachment - request.attachment)
            rwa = tranche_size * rw
            capital = rwa * 0.08

        # Build calculation steps
        steps = [
            f"1. Input parameters: KIRB={request.kirb:.2%}, LGD={request.lgd:.2%}, MT={request.maturity} years",
            f"2. Tranche: Attachment={request.attachment:.2%}, Detachment={request.detachment:.2%}",
        ]

        if request.approach.value == "SEC-IRBA":
            steps.extend([
                f"3. Calculate p = max(0.3, 3.56*{request.kirb:.4f} - 1.85*{request.kirb:.4f}^2 + 0.55*{request.lgd:.2f} + 0.07*{request.maturity})",
                f"4. p = max(0.3, {3.56*request.kirb - 1.85*request.kirb**2 + 0.55*request.lgd + 0.07*request.maturity:.4f}) = {p:.4f}"
            ])
        else:
            steps.append(f"3. SEC-SA uses fixed p = 0.5")

        steps.extend([
            f"5. Calculate a = -1/(p * KIRB) = {-1/(p*k_value):.4f}",
            f"6. Apply KSSFA formula",
            f"7. Risk Weight = {rw:.2%}" + (" (STS floor: 10%)" if request.is_sts else " (Floor: 15%)")
        ])

        return SecuritizationResult(
            approach=request.approach.value,
            p_parameter=round(p, 4),
            risk_weight=round(rw, 4),
            risk_weight_percent=f"{rw:.2%}",
            rwa=round(rwa, 2) if rwa else None,
            capital_requirement=round(capital, 2) if capital else None,
            calculation_steps=steps,
            inputs={
                "kirb": request.kirb,
                "lgd": request.lgd,
                "maturity": request.maturity,
                "attachment": request.attachment,
                "detachment": request.detachment,
                "is_sts": request.is_sts
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/securitization/compare", response_model=SecuritizationComparison)
async def compare_securitization_approaches(request: SecuritizationRequest):
    """Compare SEC-IRBA vs SEC-SA for same tranche."""
    try:
        # Calculate SEC-IRBA
        p_irba = calculate_p_parameter(request.kirb, request.lgd, request.maturity, "SEC-IRBA")
        rw_irba = calculate_risk_weight(request.kirb, request.attachment, request.detachment, p_irba, request.is_sts)

        # Calculate SEC-SA
        k_sa = request.ksa or request.kirb * 1.5  # Estimate KSA if not provided
        p_sa = 0.5
        rw_sa = calculate_risk_weight(k_sa, request.attachment, request.detachment, p_sa, request.is_sts)

        # Determine optimal approach
        if rw_irba < rw_sa:
            optimal = "SEC-IRBA"
            recommendation = f"SEC-IRBA saves {(rw_sa - rw_irba):.2%} risk weight. Use SEC-IRBA for this tranche."
        elif rw_sa < rw_irba:
            optimal = "SEC-SA"
            recommendation = f"SEC-SA saves {(rw_irba - rw_sa):.2%} risk weight. Consider using SEC-SA."
        else:
            optimal = "Either"
            recommendation = "Both approaches yield similar results. Consider operational factors."

        # Calculate capital savings if pool size provided
        capital_savings = None
        if request.pool_size:
            tranche_size = request.pool_size * (request.detachment - request.attachment)
            capital_diff = abs(rw_irba - rw_sa) * tranche_size * 0.08
            capital_savings = round(capital_diff, 2)

        return SecuritizationComparison(
            sec_irba=SecuritizationResult(
                approach="SEC-IRBA",
                p_parameter=round(p_irba, 4),
                risk_weight=round(rw_irba, 4),
                risk_weight_percent=f"{rw_irba:.2%}",
                rwa=round(rw_irba * request.pool_size * (request.detachment - request.attachment), 2) if request.pool_size else None,
                capital_requirement=round(rw_irba * request.pool_size * (request.detachment - request.attachment) * 0.08, 2) if request.pool_size else None,
                calculation_steps=[f"p = {p_irba:.4f}", f"RW = {rw_irba:.2%}"],
                inputs=request.model_dump()
            ),
            sec_sa=SecuritizationResult(
                approach="SEC-SA",
                p_parameter=0.5,
                risk_weight=round(rw_sa, 4),
                risk_weight_percent=f"{rw_sa:.2%}",
                rwa=round(rw_sa * request.pool_size * (request.detachment - request.attachment), 2) if request.pool_size else None,
                capital_requirement=round(rw_sa * request.pool_size * (request.detachment - request.attachment) * 0.08, 2) if request.pool_size else None,
                calculation_steps=[f"p = 0.5 (fixed)", f"RW = {rw_sa:.2%}"],
                inputs=request.model_dump()
            ),
            optimal_approach=optimal,
            rw_difference=round(abs(rw_irba - rw_sa), 4),
            capital_savings=capital_savings,
            recommendation=recommendation
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Leverage Ratio Calculator
# ============================================================================

@router.post("/leverage-ratio", response_model=LeverageRatioResult)
async def calculate_leverage_ratio(request: LeverageRatioRequest):
    """Calculate leverage ratio."""
    try:
        # Calculate total exposure measure
        off_balance_exposure = request.off_balance_items * request.ccf_off_balance

        total_exposure = (
            request.on_balance_exposures +
            request.derivative_exposures +
            request.sft_exposures +
            off_balance_exposure
        )

        # Calculate leverage ratio
        leverage_ratio = request.tier1_capital / total_exposure if total_exposure > 0 else 0

        # Minimum requirement is 3%
        minimum = 0.03
        compliant = leverage_ratio >= minimum
        buffer = leverage_ratio - minimum

        return LeverageRatioResult(
            leverage_ratio=round(leverage_ratio, 4),
            leverage_ratio_percent=f"{leverage_ratio:.2%}",
            total_exposure_measure=round(total_exposure, 2),
            compliant=compliant,
            buffer_to_minimum=round(buffer, 4),
            breakdown={
                "tier1_capital": request.tier1_capital,
                "on_balance": request.on_balance_exposures,
                "derivatives": request.derivative_exposures,
                "sft": request.sft_exposures,
                "off_balance": off_balance_exposure
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# RWA Calculator
# ============================================================================

# Standard risk weights by exposure class
SA_RISK_WEIGHTS = {
    "sovereign": 0.0,
    "institution": 0.20,
    "corporate": 1.0,
    "retail": 0.75,
    "mortgage": 0.35,
    "sme_corporate": 0.85,  # With SME factor
    "equity": 1.0,
    "other": 1.0
}


def calculate_irb_rw(pd: float, lgd: float, maturity: float, exposure_class: str) -> float:
    """Calculate IRB risk weight using regulatory formula."""
    # Correlation factor
    if exposure_class == "retail":
        r = 0.03 * (1 - math.exp(-35 * pd)) / (1 - math.exp(-35)) + \
            0.16 * (1 - (1 - math.exp(-35 * pd)) / (1 - math.exp(-35)))
    else:
        r = 0.12 * (1 - math.exp(-50 * pd)) / (1 - math.exp(-50)) + \
            0.24 * (1 - (1 - math.exp(-50 * pd)) / (1 - math.exp(-50)))

    # Maturity adjustment
    b = (0.11852 - 0.05478 * math.log(pd)) ** 2
    ma = (1 + (maturity - 2.5) * b) / (1 - 1.5 * b)

    # Capital requirement K
    from scipy.stats import norm
    n = norm.ppf
    k = (lgd * n((1 / (1 - r)) ** 0.5 * n(pd) + (r / (1 - r)) ** 0.5 * n(0.999)) - lgd * pd) * ma

    # Risk weight
    rw = k * 12.5

    return max(0, min(rw, 12.5))  # Floor 0%, cap 1250%


@router.post("/rwa", response_model=RWAResult)
async def calculate_rwa(request: RWARequest):
    """Calculate RWA for an exposure."""
    try:
        if request.approach == "SA":
            # Standardised Approach
            if request.risk_weight_override is not None:
                rw = request.risk_weight_override
            else:
                rw = SA_RISK_WEIGHTS.get(request.exposure_class.lower(), 1.0)

            steps = [
                f"1. Exposure class: {request.exposure_class}",
                f"2. SA Risk Weight: {rw:.2%}",
                f"3. RWA = {request.exposure_amount} * {rw:.2%} = {request.exposure_amount * rw:.2f}"
            ]

        else:
            # IRB Approach
            if not all([request.pd, request.lgd, request.maturity]):
                raise HTTPException(
                    status_code=400,
                    detail="IRB approach requires PD, LGD, and maturity"
                )

            try:
                rw = calculate_irb_rw(request.pd, request.lgd, request.maturity, request.exposure_class)
            except ImportError:
                # Fallback if scipy not available
                rw = request.pd * request.lgd * 12.5  # Simplified

            steps = [
                f"1. Exposure class: {request.exposure_class}",
                f"2. IRB Parameters: PD={request.pd:.2%}, LGD={request.lgd:.2%}, M={request.maturity}",
                f"3. IRB Risk Weight: {rw:.2%}",
                f"4. RWA = {request.exposure_amount} * {rw:.2%} = {request.exposure_amount * rw:.2f}"
            ]

        rwa = request.exposure_amount * rw
        capital = rwa * 0.08

        return RWAResult(
            exposure_class=request.exposure_class,
            approach=request.approach,
            risk_weight=round(rw, 4),
            rwa=round(rwa, 2),
            capital_requirement=round(capital, 2),
            calculation_steps=steps
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# LCR Calculator
# ============================================================================

@router.post("/lcr", response_model=LCRResult)
async def calculate_lcr(request: LCRRequest):
    """Calculate Liquidity Coverage Ratio."""
    try:
        # Apply haircuts to HQLA
        l1_adjusted = request.hqla_level1 * 1.0  # No haircut
        l2a_adjusted = request.hqla_level2a * 0.85  # 15% haircut
        l2b_adjusted = request.hqla_level2b * 0.50  # 50% haircut
        
        # Calculate total before caps
        hqla_total = request.hqla_level1 + request.hqla_level2a + request.hqla_level2b
        hqla_adjusted_pre_cap = l1_adjusted + l2a_adjusted + l2b_adjusted
        
        # Apply caps
        caps_applied = {}
        
        # L2 total cap:  max 40% of total HQLA
        l2_total = l2a_adjusted + l2b_adjusted
        l2_cap = l1_adjusted * (40/60)  # L2 can be max 40%, so L1 must be 60%
        if l2_total > l2_cap:
            reduction_factor = l2_cap / l2_total
            l2a_adjusted *= reduction_factor
            l2b_adjusted *= reduction_factor
            caps_applied["L2_cap"] = f"Level 2 capped to 40% (reduced by {(1-reduction_factor)*100:.1f}%)"
        
        # L2B cap: max 15% of total HQLA
        l2b_cap = (l1_adjusted + l2a_adjusted) * (15/85)
        if l2b_adjusted > l2b_cap: 
            caps_applied["L2B_cap"] = f"Level 2B capped to 15%"
            l2b_adjusted = l2b_cap
        
        hqla_adjusted = l1_adjusted + l2a_adjusted + l2b_adjusted
        
        # Calculate outflows with runoff rates
        outflows = {
            "retail_stable": request.retail_deposits_stable * 0.05,
            "retail_less_stable": request.retail_deposits_less_stable * 0.10,
            "wholesale_operational": request.wholesale_operational * 0.25,
            "wholesale_non_operational": request.wholesale_non_operational * 0.40,
            "secured_funding": request.secured_funding,
            "other":  request.other_outflows
        }
        total_outflows = sum(outflows.values())
        
        # Calculate inflows (capped at 75% of outflows)
        inflows = {
            "retail":  request.retail_inflows,
            "wholesale": request.wholesale_inflows,
            "other": request.other_inflows
        }
        total_inflows = sum(inflows.values())
        inflow_cap = total_outflows * 0.75
        total_inflows_capped = min(total_inflows, inflow_cap)
        
        if total_inflows > inflow_cap:
            caps_applied["inflow_cap"] = f"Inflows capped at 75% of outflows"
        
        # Net outflows
        net_outflows = total_outflows - total_inflows_capped
        
        # Calculate LCR
        lcr = hqla_adjusted / net_outflows if net_outflows > 0 else float('inf')
        
        # Minimum requirement is 100%
        minimum = 1.0
        compliant = lcr >= minimum
        buffer = lcr - minimum
        
        return LCRResult(
            lcr=round(lcr, 4),
            lcr_percent=f"{lcr:.2%}",
            compliant=compliant,
            buffer_to_minimum=round(buffer, 4),
            hqla_total=round(hqla_total, 2),
            hqla_adjusted=round(hqla_adjusted, 2),
            total_outflows=round(total_outflows, 2),
            total_inflows=round(total_inflows_capped, 2),
            net_outflows=round(net_outflows, 2),
            hqla_breakdown={
                "level1": round(l1_adjusted, 2),
                "level2a": round(l2a_adjusted, 2),
                "level2b": round(l2b_adjusted, 2)
            },
            outflow_breakdown={k: round(v, 2) for k, v in outflows. items()},
            inflow_breakdown={k: round(v, 2) for k, v in inflows.items()},
            caps_applied=caps_applied
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# NSFR Calculator
# ============================================================================

@router.post("/nsfr", response_model=NSFRResult)
async def calculate_nsfr(request: NSFRRequest):
    """Calculate Net Stable Funding Ratio."""
    try:
        # Calculate ASF with factors
        asf_breakdown = {
            "capital_long_term": request.capital_long_term_debt * 1.00,
            "stable_retail": request.stable_retail_deposits * 0.95,
            "less_stable_deposits": request.less_stable_deposits * 0.90,
            "wholesale_short":  request.wholesale_funding_short * 0.50,
            "other_liabilities": request.other_liabilities * 0.00
        }
        total_asf = sum(asf_breakdown.values())
        
        # Calculate RSF with factors
        rsf_breakdown = {
            "cash_reserves": request.cash_and_reserves * 0.00,
            "hqla_l1": request.hqla_level1 * 0.05,
            "hqla_l2":  request.hqla_level2 * 0.15,
            "loans_fi_short": request.loans_to_fi_short * 0.10,
            "corporate_short": request.corporate_loans_short * 0.50,
            "residential_mortgages": request.residential_mortgages * 0.65,
            "other_loans_long":  request.other_loans_long * 0.85,
            "npl": request.npl_assets * 1.00,
            "other_assets": request.other_assets * 1.00
        }
        total_rsf = sum(rsf_breakdown.values())
        
        # Calculate NSFR
        nsfr = total_asf / total_rsf if total_rsf > 0 else float('inf')
        
        # Minimum requirement is 100%
        minimum = 1.0
        compliant = nsfr >= minimum
        buffer = nsfr - minimum
        
        return NSFRResult(
            nsfr=round(nsfr, 4),
            nsfr_percent=f"{nsfr:.2%}",
            compliant=compliant,
            buffer_to_minimum=round(buffer, 4),
            total_asf=round(total_asf, 2),
            total_rsf=round(total_rsf, 2),
            asf_breakdown={k: round(v, 2) for k, v in asf_breakdown.items()},
            rsf_breakdown={k: round(v, 2) for k, v in rsf_breakdown. items()}
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# MREL/TLAC Calculator
# ============================================================================

@router.post("/mrel", response_model=MRELResult)
async def calculate_mrel(request: MRELRequest):
    """Calculate MREL/TLAC ratios."""
    try:
        # Total MREL-eligible resources
        total_mrel = (
            request.cet1_capital +
            request.at1_capital +
            request. tier2_capital +
            request.senior_non_preferred +
            request.other_eligible
        )
        
        # Subordinated amount (CET1 + AT1 + T2)
        subordinated = request.cet1_capital + request.at1_capital + request.tier2_capital
        
        # Calculate ratios
        mrel_ratio_rwa = total_mrel / request.total_rwa if request.total_rwa > 0 else 0
        mrel_ratio_lem = total_mrel / request. leverage_exposure if request.leverage_exposure > 0 else 0
        subordination_ratio = subordinated / request.total_rwa if request.total_rwa > 0 else 0
        
        # Check compliance
        compliant_rwa = mrel_ratio_rwa >= request.mrel_requirement_rwa
        compliant_lem = mrel_ratio_lem >= request.mrel_requirement_lem
        compliant_sub = subordination_ratio >= request. subordination_requirement
        
        return MRELResult(
            total_mrel=round(total_mrel, 2),
            mrel_ratio_rwa=round(mrel_ratio_rwa, 4),
            mrel_ratio_rwa_percent=f"{mrel_ratio_rwa:.2%}",
            mrel_ratio_lem=round(mrel_ratio_lem, 4),
            mrel_ratio_lem_percent=f"{mrel_ratio_lem:.2%}",
            subordinated_amount=round(subordinated, 2),
            subordination_ratio=round(subordination_ratio, 4),
            subordination_ratio_percent=f"{subordination_ratio:.2%}",
            compliant_rwa=compliant_rwa,
            compliant_lem=compliant_lem,
            compliant_subordination=compliant_sub,
            overall_compliant=compliant_rwa and compliant_lem and compliant_sub,
            buffer_rwa=round(mrel_ratio_rwa - request.mrel_requirement_rwa, 4),
            buffer_lem=round(mrel_ratio_lem - request.mrel_requirement_lem, 4),
            buffer_subordination=round(subordination_ratio - request.subordination_requirement, 4),
            breakdown={
                "cet1":  request.cet1_capital,
                "at1": request.at1_capital,
                "tier2": request.tier2_capital,
                "senior_non_preferred": request.senior_non_preferred,
                "other_eligible": request.other_eligible
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# CVA Risk Calculator (SA-CVA Basic Approach)
# ============================================================================

# Risk weights by rating for SA-CVA
CVA_RISK_WEIGHTS = {
    "AAA": 0.007,
    "AA": 0.008,
    "A": 0.010,
    "BBB": 0.020,
    "BB": 0.030,
    "B":  0.050,
    "CCC": 0.100
}

@router.post("/cva", response_model=CVAResult)
async def calculate_cva_risk(request: CVARequest):
    """Calculate CVA capital using SA-CVA Basic Approach."""
    try:
        cva_by_counterparty = []
        total_ead = 0
        total_hedging_benefit = 0
        
        for cp in request.counterparties:
            # Get risk weight based on rating
            rw = CVA_RISK_WEIGHTS.get(cp.rating. upper(), 0.10)
            
            # Discount factor approximation
            df = max(1, cp.maturity)
            
            # CVA capital for this counterparty
            cva_capital = 2. 33 * rw * df * cp. ead
            
            # Hedging benefit (simplified)
            hedge_benefit = min(cp.hedge_notional, cp. ead) * rw * 0.5
            
            net_cva = max(0, cva_capital - hedge_benefit)
            
            cva_by_counterparty. append({
                "name": cp.name,
                "ead": cp.ead,
                "rating": cp.rating,
                "risk_weight": rw,
                "cva_capital_gross": round(cva_capital, 2),
                "hedge_benefit": round(hedge_benefit, 2),
                "cva_capital_net": round(net_cva, 2)
            })
            
            total_ead += cp.ead
            total_hedging_benefit += hedge_benefit
        
        # Aggregate with correlation (simplified - assuming 25% correlation)
        sum_squared = sum((x["cva_capital_net"] ** 2) for x in cva_by_counterparty)
        sum_cva = sum(x["cva_capital_net"] for x in cva_by_counterparty)
        
        rho = 0.25
        total_cva = ((rho * sum_cva) ** 2 + (1 - rho) * sum_squared) ** 0.5
        
        # Average risk weight
        avg_rw = total_cva / total_ead if total_ead > 0 else 0
        
        return CVAResult(
            total_cva_capital=round(total_cva, 2),
            cva_capital_by_counterparty=cva_by_counterparty,
            total_ead=round(total_ead, 2),
            hedging_benefit=round(total_hedging_benefit, 2),
            aggregate_risk_weight=round(avg_rw, 4)
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Large Exposures Calculator
# ============================================================================

@router.post("/large-exposures", response_model=LargeExposuresResult)
async def calculate_large_exposures(request: LargeExposuresRequest):
    """Calculate large exposures and check limits."""
    try:
        # Limit is 25% for normal entities, 10% for G-SIB to G-SIB
        limit_percent = 0.10 if request.is_gsib else 0.25
        
        exposures_detail = []
        large_count = 0
        breach_count = 0
        total_concentration = 0
        
        for exp in request.exposures:
            net_exposure = exp.gross_exposure - exp.collateral - exp.guarantees
            net_exposure = max(0, net_exposure)  # Can't be negative
            
            exposure_percent = net_exposure / request.tier1_capital if request.tier1_capital > 0 else 0
            
            is_large = exposure_percent >= 0.10  # >10% is large exposure
            is_breach = exposure_percent > limit_percent
            
            if is_large: 
                large_count += 1
                total_concentration += exposure_percent
            
            if is_breach:
                breach_count += 1
            
            exposures_detail.append({
                "group_name": exp.group_name,
                "gross_exposure": exp.gross_exposure,
                "collateral": exp.collateral,
                "guarantees": exp. guarantees,
                "net_exposure": round(net_exposure, 2),
                "percent_of_tier1": round(exposure_percent, 4),
                "percent_of_tier1_display": f"{exposure_percent:.2%}",
                "is_large_exposure": is_large,
                "is_breach": is_breach,
                "limit":  f"{limit_percent:. 0%}"
            })
        
        return LargeExposuresResult(
            exposures_detail=exposures_detail,
            large_exposures_count=large_count,
            breaches_count=breach_count,
            total_concentration=round(total_concentration, 4),
            tier1_capital=request.tier1_capital,
            limit_percent=limit_percent
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# IRRBB Calculator
# ============================================================================

# Shock scenarios (in basis points)
IRRBB_SCENARIOS = {
    "parallel_up": {"ON": 200, "1M": 200, "3M": 200, "6M": 200, "1Y": 200, "2Y": 200, "3Y": 200, "5Y":  200, "7Y": 200, "10Y": 200, "15Y":  200, "20Y+": 200},
    "parallel_down": {"ON": -200, "1M": -200, "3M": -200, "6M": -200, "1Y": -200, "2Y": -200, "3Y":  -200, "5Y": -200, "7Y": -200, "10Y": -200, "15Y": -200, "20Y+": -200},
    "steepener": {"ON": -100, "1M": -90, "3M": -80, "6M": -60, "1Y": -40, "2Y": 0, "3Y": 20, "5Y": 40, "7Y": 60, "10Y": 80, "15Y": 100, "20Y+": 100},
    "flattener": {"ON": 100, "1M": 90, "3M": 80, "6M": 60, "1Y": 40, "2Y": 0, "3Y": -20, "5Y":  -40, "7Y": -60, "10Y": -80, "15Y": -100, "20Y+": -100},
    "short_rates_up": {"ON": 200, "1M": 180, "3M": 150, "6M": 100, "1Y": 60, "2Y": 30, "3Y": 10, "5Y": 0, "7Y": 0, "10Y": 0, "15Y": 0, "20Y+": 0},
    "short_rates_down": {"ON": -200, "1M": -180, "3M": -150, "6M": -100, "1Y":  -60, "2Y": -30, "3Y": -10, "5Y": 0, "7Y": 0, "10Y": 0, "15Y": 0, "20Y+": 0}
}

# Duration approximations for each bucket
BUCKET_DURATIONS = {
    "ON": 0.003,
    "1M": 0.08,
    "3M": 0.25,
    "6M": 0.5,
    "1Y": 1.0,
    "2Y": 2.0,
    "3Y":  3.0,
    "5Y": 5.0,
    "7Y": 7.0,
    "10Y": 10.0,
    "15Y": 15.0,
    "20Y+":  20.0
}

@router.post("/irrbb", response_model=IRRBBResult)
async def calculate_irrbb(request:  IRRBBRequest):
    """Calculate IRRBB under standard scenarios."""
    try:
        # Build gap profile
        gaps = {
            "ON": request.gap_overnight,
            "1M": request.gap_1m,
            "3M":  request.gap_3m,
            "6M": request.gap_6m,
            "1Y": request.gap_1y,
            "2Y": request.gap_2y,
            "3Y": request.gap_3y,
            "5Y": request.gap_5y,
            "7Y": request. gap_7y,
            "10Y": request.gap_10y,
            "15Y":  request.gap_15y,
            "20Y+": request. gap_20y_plus
        }
        
        # Threshold is 15% of Tier 1
        threshold = 0.15
        
        scenarios_results = []
        worst_delta = 0
        worst_scenario = ""
        
        for scenario_name, shocks in IRRBB_SCENARIOS.items():
            # Calculate delta EVE for this scenario
            delta_eve = 0
            for bucket, gap in gaps.items():
                shock_bps = shocks[bucket]
                duration = BUCKET_DURATIONS[bucket]
                # Delta EVE = -Gap * Duration * Shock
                delta_eve -= gap * duration * (shock_bps / 10000)
            
            delta_eve_pct = delta_eve / request. tier1_capital if request.tier1_capital > 0 else 0
            breaches = abs(delta_eve_pct) > threshold
            
            scenarios_results.append(IRRBBScenarioResult(
                scenario_name=scenario_name. replace("_", " ").title(),
                delta_eve=round(delta_eve, 2),
                delta_eve_percent_tier1=f"{delta_eve_pct:. 2%}",
                breaches_threshold=breaches
            ))
            
            if abs(delta_eve) > abs(worst_delta):
                worst_delta = delta_eve
                worst_scenario = scenario_name. replace("_", " ").title()
        
        worst_pct = worst_delta / request. tier1_capital if request.tier1_capital > 0 else 0
        overall_compliant = all(not s. breaches_threshold for s in scenarios_results)
        
        return IRRBBResult(
            scenarios=scenarios_results,
            worst_scenario=worst_scenario,
            worst_delta_eve=round(worst_delta, 2),
            worst_delta_eve_percent=f"{worst_pct:.2%}",
            tier1_capital=request.tier1_capital,
            threshold_percent=threshold,
            overall_compliant=overall_compliant,
            gap_profile=gaps
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
