'use client';

import { useState } from 'react';

type CalculatorTab = 'leverage' | 'lcr' | 'nsfr' | 'mrel' | 'irrbb';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('leverage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 BRIS Regulatory Calculators
          </h1>
          <p className="text-gray-600">
            Advanced Basel III/IV regulatory ratio calculators
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2">
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === 'leverage'}
              onClick={() => setActiveTab('leverage')}
              label="Leverage Ratio"
              icon="⚖️"
            />
            <TabButton
              active={activeTab === 'lcr'}
              onClick={() => setActiveTab('lcr')}
              label="LCR"
              icon="💧"
            />
            <TabButton
              active={activeTab === 'nsfr'}
              onClick={() => setActiveTab('nsfr')}
              label="NSFR"
              icon="🔄"
            />
            <TabButton
              active={activeTab === 'mrel'}
              onClick={() => setActiveTab('mrel')}
              label="MREL/TLAC"
              icon="🛡️"
            />
            <TabButton
              active={activeTab === 'irrbb'}
              onClick={() => setActiveTab('irrbb')}
              label="IRRBB"
              icon="📈"
            />
          </div>
        </div>

        {/* Calculator Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'leverage' && <LeverageCalculator />}
          {activeTab === 'lcr' && <LCRCalculator />}
          {activeTab === 'nsfr' && <NSFRCalculator />}
          {activeTab === 'mrel' && <MRELCalculator />}
          {activeTab === 'irrbb' && <IRRBBCalculator />}
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label, icon }:  any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? 'bg-red-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

// ============================================================================
// LEVERAGE RATIO CALCULATOR
// ============================================================================

function LeverageCalculator() {
  const [tier1, setTier1] = useState('');
  const [exposure, setExposure] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const t1 = parseFloat(tier1);
    const exp = parseFloat(exposure);
    if (t1 && exp) {
      const ratio = (t1 / exp) * 100;
      const compliant = ratio >= 3.0;
      setResult({ ratio, compliant, buffer: ratio - 3.0 });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        ⚖️ Leverage Ratio Calculator
      </h2>
      <p className="text-gray-600 mb-6">
        Basel III leverage ratio measures Tier 1 capital against total exposure. 
        Minimum requirement: 3%. 
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier 1 Capital (EUR millions)
            </label>
            <input
              type="number"
              value={tier1}
              onChange={(e) => setTier1(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="e.g., 50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Exposure Measure (EUR millions)
            </label>
            <input
              type="number"
              value={exposure}
              onChange={(e) => setExposure(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="e.g., 1500000"
            />
          </div>

          <button
            onClick={calculate}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Calculate Leverage Ratio
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Leverage Ratio</div>
                <div className="text-3xl font-bold text-gray-900">
                  {result.ratio. toFixed(2)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Compliance Status</div>
                <div className={`text-lg font-semibold ${result.compliant ? 'text-green-600' : 'text-red-600'}`}>
                  {result.compliant ?  '✅ Compliant' :  '❌ Non-Compliant'}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Buffer to Minimum (3%)</div>
                <div className={`text-lg font-semibold ${result.buffer >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.buffer >= 0 ?  '+' : ''}{result.buffer.toFixed(2)}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to 3% minimum</span>
                  <span>{Math.min(100, (result.ratio / 3) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      result.compliant ?  'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (result. ratio / 3) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LCR CALCULATOR
// ============================================================================

function LCRCalculator() {
  const [hqlaL1, setHqlaL1] = useState('');
  const [hqlaL2a, setHqlaL2a] = useState('');
  const [retailStable, setRetailStable] = useState('');
  const [retailLessStable, setRetailLessStable] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const l1 = parseFloat(hqlaL1) || 0;
    const l2a = parseFloat(hqlaL2a) || 0;
    const rs = parseFloat(retailStable) || 0;
    const rls = parseFloat(retailLessStable) || 0;

    // Simplified LCR calculation
    const hqla = l1 + l2a * 0.85;
    const outflows = rs * 0.05 + rls * 0.10;
    const lcr = outflows > 0 ? (hqla / outflows) * 100 : 0;
    const compliant = lcr >= 100;

    setResult({ lcr, compliant, hqla, outflows });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        💧 Liquidity Coverage Ratio (LCR)
      </h2>
      <p className="text-gray-600 mb-6">
        Ensures banks have sufficient high-quality liquid assets to survive a 30-day stress scenario.
        Minimum requirement: 100%. 
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">HQLA (High-Quality Liquid Assets)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Level 1 (EUR M)</label>
                <input
                  type="number"
                  value={hqlaL1}
                  onChange={(e) => setHqlaL1(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Cash, reserves, sovereigns"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Level 2A (EUR M)</label>
                <input
                  type="number"
                  value={hqlaL2a}
                  onChange={(e) => setHqlaL2a(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="85% haircut applied"
                />
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Retail Deposits (Outflows)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Stable (EUR M)</label>
                <input
                  type="number"
                  value={retailStable}
                  onChange={(e) => setRetailStable(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="5% runoff rate"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Less Stable (EUR M)</label>
                <input
                  type="number"
                  value={retailLessStable}
                  onChange={(e) => setRetailLessStable(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="10% runoff rate"
                />
              </div>
            </div>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
          >
            Calculate LCR
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Results</h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">LCR</div>
                <div className="text-3xl font-bold text-gray-900">
                  {result.lcr.toFixed(1)}%
                </div>
                <div className={`text-sm mt-2 font-semibold ${result.compliant ? 'text-green-600' : 'text-red-600'}`}>
                  {result.compliant ? '✅ Compliant (≥100%)' : '❌ Below minimum'}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Breakdown</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>HQLA (adjusted):</span>
                    <span className="font-semibold">{result.hqla.toFixed(0)} M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Outflows (30d):</span>
                    <span className="font-semibold">{result.outflows.toFixed(0)} M</span>
                  </div>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to 100% minimum</span>
                  <span>{Math. min(100, result.lcr).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${result.compliant ? 'bg-green-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(100, result.lcr)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// NSFR CALCULATOR
// ============================================================================

function NSFRCalculator() {
  const [capitalLT, setCapitalLT] = useState('');
  const [stableRetail, setStableRetail] = useState('');
  const [hqlaL1, setHqlaL1] = useState('');
  const [mortgages, setMortgages] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const clt = parseFloat(capitalLT) || 0;
    const sr = parseFloat(stableRetail) || 0;
    const l1 = parseFloat(hqlaL1) || 0;
    const mtg = parseFloat(mortgages) || 0;

    // Simplified NSFR
    const asf = clt * 1.0 + sr * 0.95;
    const rsf = l1 * 0.05 + mtg * 0.65;
    const nsfr = rsf > 0 ? (asf / rsf) * 100 : 0;
    const compliant = nsfr >= 100;

    setResult({ nsfr, compliant, asf, rsf });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        🔄 Net Stable Funding Ratio (NSFR)
      </h2>
      <p className="text-gray-600 mb-6">
        Ensures banks maintain stable funding over a one-year horizon. 
        Minimum requirement: 100%.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Available Stable Funding (ASF)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Capital & LT Debt (EUR M)</label>
                <input
                  type="number"
                  value={capitalLT}
                  onChange={(e) => setCapitalLT(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="100% ASF factor"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Stable Retail Deposits (EUR M)</label>
                <input
                  type="number"
                  value={stableRetail}
                  onChange={(e) => setStableRetail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="95% ASF factor"
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Required Stable Funding (RSF)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">HQLA Level 1 (EUR M)</label>
                <input
                  type="number"
                  value={hqlaL1}
                  onChange={(e) => setHqlaL1(e. target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="5% RSF factor"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Residential Mortgages (EUR M)</label>
                <input
                  type="number"
                  value={mortgages}
                  onChange={(e) => setMortgages(e.target. value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="65% RSF factor"
                />
              </div>
            </div>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
          >
            Calculate NSFR
          </button>
        </div>

        {result && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Results</h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">NSFR</div>
                <div className="text-3xl font-bold text-gray-900">
                  {result.nsfr.toFixed(1)}%
                </div>
                <div className={`text-sm mt-2 font-semibold ${result.compliant ? 'text-green-600' :  'text-red-600'}`}>
                  {result.compliant ? '✅ Compliant (≥100%)' : '❌ Below minimum'}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Breakdown</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ASF: </span>
                    <span className="font-semibold text-green-600">{result. asf.toFixed(0)} M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RSF:</span>
                    <span className="font-semibold text-orange-600">{result.rsf.toFixed(0)} M</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Ratio:</span>
                    <span className="font-semibold">{result.nsfr.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Compliance gauge</span>
                  <span>{Math.min(100, result. nsfr).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${result.compliant ?  'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(100, result.nsfr)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MREL CALCULATOR
// ============================================================================

function MRELCalculator() {
  const [cet1, setCet1] = useState('');
  const [at1, setAt1] = useState('');
  const [tier2, setTier2] = useState('');
  const [seniorNP, setSeniorNP] = useState('');
  const [rwa, setRwa] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const c1 = parseFloat(cet1) || 0;
    const a1 = parseFloat(at1) || 0;
    const t2 = parseFloat(tier2) || 0;
    const snp = parseFloat(seniorNP) || 0;
    const r = parseFloat(rwa) || 1;

    const totalMREL = c1 + a1 + t2 + snp;
    const mrelRatio = (totalMREL / r) * 100;
    const requirement = 18; // 18% of RWA
    const compliant = mrelRatio >= requirement;

    setResult({ mrelRatio, compliant, totalMREL, requirement, buffer: mrelRatio - requirement });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        🛡️ MREL/TLAC Calculator
      </h2>
      <p className="text-gray-600 mb-6">
        Minimum Requirement for own funds and Eligible Liabilities. 
        Typical requirement: 18% of RWA.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">MREL-Eligible Resources</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">CET1 Capital (EUR M)</label>
                <input
                  type="number"
                  value={cet1}
                  onChange={(e) => setCet1(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">AT1 Capital (EUR M)</label>
                <input
                  type="number"
                  value={at1}
                  onChange={(e) => setAt1(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tier 2 Capital (EUR M)</label>
                <input
                  type="number"
                  value={tier2}
                  onChange={(e) => setTier2(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Senior Non-Preferred (EUR M)</label>
                <input
                  type="number"
                  value={seniorNP}
                  onChange={(e) => setSeniorNP(e.target. value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Risk-Weighted Assets (EUR M)
            </label>
            <input
              type="number"
              value={rwa}
              onChange={(e) => setRwa(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e. g., 500000"
            />
          </div>

          <button
            onClick={calculate}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
          >
            Calculate MREL
          </button>
        </div>

        {result && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Results</h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">MREL Ratio</div>
                <div className="text-3xl font-bold text-gray-900">
                  {result.mrelRatio.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  of RWA
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Compliance</div>
                <div className={`text-lg font-semibold ${result.compliant ? 'text-green-600' :  'text-red-600'}`}>
                  {result.compliant ? '✅ Compliant' : '❌ Below requirement'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Requirement:  {result.requirement}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Buffer</div>
                <div className={`text-xl font-bold ${result.buffer >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.buffer >= 0 ? '+' : ''}{result.buffer.toFixed(2)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Total MREL Resources</div>
                <div className="text-lg font-semibold text-gray-900">
                  €{result.totalMREL. toLocaleString()} M
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to {result.requirement}%</span>
                  <span>{Math.min(100, (result.mrelRatio / result.requirement) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${result.compliant ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (result.mrelRatio / result.requirement) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// IRRBB CALCULATOR
// ============================================================================

function IRRBBCalculator() {
  const [gap1y, setGap1y] = useState('');
  const [gap5y, setGap5y] = useState('');
  const [gap10y, setGap10y] = useState('');
  const [tier1, setTier1] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const g1 = parseFloat(gap1y) || 0;
    const g5 = parseFloat(gap5y) || 0;
    const g10 = parseFloat(gap10y) || 0;
    const t1 = parseFloat(tier1) || 1;

    // Simplified IRRBB - parallel +200bp shock
    const shock = 0.02; // 200bp = 2%
    const duration1y = 1. 0;
    const duration5y = 4.5;
    const duration10y = 8.0;

    const deltaEVE = -(g1 * duration1y * shock + g5 * duration5y * shock + g10 * duration10y * shock);
    const deltaPercent = (Math.abs(deltaEVE) / t1) * 100;
    const threshold = 15; // 15% of Tier 1
    const compliant = deltaPercent <= threshold;

    setResult({ deltaEVE, deltaPercent, compliant, threshold });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        📈 Interest Rate Risk in the Banking Book (IRRBB)
      </h2>
      <p className="text-gray-600 mb-6">
        Measures the impact of interest rate shocks on economic value of equity.
        Threshold: 15% of Tier 1 Capital.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Rate-Sensitive Gaps (EUR M)</h3>
            <p className="text-xs text-gray-600 mb-3">
              Positive = more assets than liabilities repricing in this bucket
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">1 Year Gap</label>
                <input
                  type="number"
                  value={gap1y}
                  onChange={(e) => setGap1y(e.target. value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">5 Year Gap</label>
                <input
                  type="number"
                  value={gap5y}
                  onChange={(e) => setGap5y(e.target. value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., -2000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">10 Year Gap</label>
                <input
                  type="number"
                  value={gap10y}
                  onChange={(e) => setGap10y(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., -1000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier 1 Capital (EUR M)
            </label>
            <input
              type="number"
              value={tier1}
              onChange={(e) => setTier1(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="For threshold comparison"
            />
          </div>

          <button
            onClick={calculate}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
          >
            Calculate IRRBB Impact
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-900 mb-1">📘 Scenario</div>
            <div className="text-sm text-blue-800">
              Parallel +200bp rate shock across all maturities
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Results</h3>

            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Δ EVE (Economic Value Impact)</div>
                <div className={`text-3xl font-bold ${result.deltaEVE >= 0 ?  'text-green-600' : 'text-red-600'}`}>
                  {result.deltaEVE >= 0 ? '+' : ''}€{result.deltaEVE. toFixed(0)} M
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Impact as % of Tier 1</div>
                <div className="text-2xl font-bold text-gray-900">
                  {result. deltaPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Threshold: {result.threshold}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-gray-600 mb-2">Compliance Status</div>
                <div className={`text-lg font-semibold ${result.compliant ?  'text-green-600' : 'text-red-600'}`}>
                  {result.compliant ? '✅ Within Threshold' : '⚠️ Exceeds Threshold'}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Threshold usage</span>
                  <span>{((result.deltaPercent / result.threshold) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${result.compliant ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width:  `${Math.min(100, (result. deltaPercent / result.threshold) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="text-xs font-semibold text-yellow-900 mb-1">💡 Interpretation</div>
                <div className="text-xs text-yellow-800">
                  {result.compliant 
                    ? 'Interest rate risk exposure is within regulatory tolerance.'
                    : 'Supervisory measures may be required to reduce rate risk.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
Force rebuild - Add BRIS to title
