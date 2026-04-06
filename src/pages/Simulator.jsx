import { useState, useEffect, useRef, useCallback } from 'react'
import './Simulator.css'

// ============================================================
// Monte Carlo Engine (pure functions, no React)
// ============================================================

/** Box-Muller transform: standard normal sample */
function randNormal() {
  let u, v
  do { u = Math.random() } while (u === 0)
  do { v = Math.random() } while (v === 0)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Sample annual market return with fat tails */
function sampleReturn(p) {
  // Fat tail black swan event
  if (Math.random() < p.fatTailProb) {
    return -p.fatTailDrop / 100 + randNormal() * 0.05
  }
  // Normal return: equity portion with volatility; bond portion stable
  const equityR = (p.equityMean / 100) + randNormal() * (p.equityStd / 100)
  const bondR   = (p.bondMean   / 100) + randNormal() * (p.bondStd   / 100)
  return p.equityRatio / 100 * equityR + (1 - p.equityRatio / 100) * bondR
}

/** Simulate one retirement path. Returns array of yearly snapshots. */
function simulatePath(p, sorrYears) {
  let portfolio = p.currentAssets
  let buffer    = Math.min(p.bufferMonths / 12 * p.annualExpense, portfolio * 0.15)
  portfolio    -= buffer

  let baseWithdrawal = p.annualExpense * (1 - p.pensionCoverage / 100)
  let withdrawal     = baseWithdrawal
  const snapshots    = []

  for (let yr = 0; yr < p.years; yr++) {
    // --- Income this year ---
    let extraIncome = 0
    if (yr < p.technicianYears) extraIncome += p.technicianIncome
    if (yr >= p.pensionStartYear) extraIncome += p.pensionAmount * 12

    // Net withdrawal from portfolio (after income)
    const netWithdraw = Math.max(0, withdrawal - extraIncome)

    // --- Market return ---
    let mktReturn
    if (yr < sorrYears) {
      // Forced bear market for SORR stress test
      mktReturn = -0.15 + randNormal() * 0.08
    } else {
      mktReturn = sampleReturn(p)
    }

    const isBull = mktReturn > 0.10

    // --- Buffer logic ---
    let actualWithdraw = netWithdraw
    if (buffer > 0 && mktReturn < 0) {
      const fromBuffer = Math.min(buffer, netWithdraw * 0.5)
      buffer -= fromBuffer
      actualWithdraw  -= fromBuffer
    }

    // Portfolio growth
    portfolio = portfolio * (1 + mktReturn) - actualWithdraw

    // Refill buffer in bull years
    if (isBull && buffer < p.bufferMonths / 12 * p.annualExpense) {
      const refill = Math.min(
        p.bufferMonths / 12 * p.annualExpense - buffer,
        portfolio * 0.05
      )
      buffer    += refill
      portfolio -= refill
    }

    const totalAssets = portfolio + buffer

    // --- Guyton-Klinger rules ---
    if (totalAssets > 0) {
      const wr = withdrawal / totalAssets
      if (wr > p.gkUpperBand / 100) {
        withdrawal = Math.max(withdrawal * 0.90, baseWithdrawal * 0.75)
      } else if (wr < p.gkLowerBand / 100) {
        withdrawal = Math.min(withdrawal * 1.10, baseWithdrawal * 1.25)
      }
    }

    // Inflation adjustment (skip if market was down)
    if (mktReturn >= 0) {
      baseWithdrawal *= (1 + p.inflation / 100)
      withdrawal     *= (1 + p.inflation / 100)
    }

    snapshots.push({
      yr,
      portfolio: Math.max(0, portfolio),
      buffer: Math.max(0, buffer),
      total: Math.max(0, totalAssets),
      withdrawal,
      mktReturn,
      extraIncome,
    })

    if (totalAssets <= 0) break
  }

  return snapshots
}

/** Run full Monte Carlo. Returns array of paths. */
function runMonteCarlo(p, numRuns, sorrYears) {
  const paths = []
  for (let i = 0; i < numRuns; i++) {
    paths.push(simulatePath(p, sorrYears))
  }
  return paths
}

/** Compute summary statistics from paths. */
function computeStats(paths, years) {
  const n = paths.length
  let survived = 0

  // Per-year quantiles
  const yearlyTotals   = Array.from({ length: years }, () => [])
  const yearlyWithdraw = Array.from({ length: years }, () => [])
  const yearlyBuffer   = Array.from({ length: years }, () => [])

  paths.forEach(path => {
    if (path.length >= years || (path.length > 0 && path[path.length - 1].total > 0)) {
      survived++
    }
    path.forEach(snap => {
      if (snap.yr < years) {
        yearlyTotals[snap.yr].push(snap.total)
        yearlyWithdraw[snap.yr].push(snap.withdrawal)
        yearlyBuffer[snap.yr].push(snap.buffer)
      }
    })
  })

  const pct = (arr, p) => {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length * p)]
  }

  return {
    successRate: survived / n * 100,
    yearlyMedianTotal:    yearlyTotals.map(a   => pct(a, 0.5)),
    yearlyP10Total:       yearlyTotals.map(a   => pct(a, 0.1)),
    yearlyP90Total:       yearlyTotals.map(a   => pct(a, 0.9)),
    yearlyMedianWithdraw: yearlyWithdraw.map(a => pct(a, 0.5)),
    yearlyP10Withdraw:    yearlyWithdraw.map(a => pct(a, 0.1)),
    yearlyMedianBuffer:   yearlyBuffer.map(a   => pct(a, 0.5)),
    yearlyP10Buffer:      yearlyBuffer.map(a   => pct(a, 0.1)),
    medianFinal: pct(yearlyTotals[years - 1] || [], 0.5),
  }
}

// ============================================================
// Feature 1: Retirement reverse calculator
// ============================================================

function findRetirementYear(currentAssets, annualExpense, annualSavings, targetRate, params, maxYears = 50) {
  const r = (params.equityRatio / 100) * (params.equityMean / 100)
          + (1 - params.equityRatio / 100) * (params.bondMean / 100)
  for (let n = 0; n <= maxYears; n++) {
    const projected = n === 0
      ? currentAssets
      : currentAssets * Math.pow(1 + r, n) + annualSavings * ((Math.pow(1 + r, n) - 1) / r)
    const testParams = { ...params, currentAssets: projected }
    const paths = runMonteCarlo(testParams, 500, 0)
    const s = computeStats(paths, params.years)
    if (s.successRate >= targetRate) {
      return { yearsNeeded: n, projectedAssets: projected, actualRate: s.successRate, growthRate: r * 100 }
    }
  }
  return null
}

// ============================================================
// Feature 3: Asset allocation analysis
// ============================================================

const ASSET_PROFILES = [
  { keywords: ['全球股票','VT','VXUS','全球'],              mean: 7,   std: 15, type: 'equity' },
  { keywords: ['美股','SPY','QQQ','VOO','S&P','NASDAQ'],    mean: 8,   std: 16, type: 'equity' },
  { keywords: ['台股','0050','台灣50','元大台灣'],           mean: 7,   std: 20, type: 'equity' },
  { keywords: ['新興市場','EEM','VWO','新興'],               mean: 6,   std: 22, type: 'equity' },
  { keywords: ['REITs','VNQ','房地產','不動產'],             mean: 6,   std: 18, type: 'equity' },
  { keywords: ['高收益債','HYG','JNK','高收益'],             mean: 5,   std: 8,  type: 'bond'   },
  { keywords: ['債券','BND','AGG','IEF','公債','國債'],      mean: 3,   std: 4,  type: 'bond'   },
  { keywords: ['現金','貨幣市場','MMF','定存'],              mean: 1.5, std: 0.5, type: 'cash'  },
]

function matchAssetProfile(name) {
  const n = name.toUpperCase()
  for (const p of ASSET_PROFILES) {
    if (p.keywords.some(k => n.includes(k.toUpperCase()))) return p
  }
  // default: treat as equity
  return { mean: 7, std: 15, type: 'equity' }
}

function calcWeightedParams(holdings) {
  let wMean = 0, wStd = 0, equityPct = 0
  holdings.forEach(h => {
    const p = matchAssetProfile(h.name)
    const w = h.pct / 100
    wMean += w * p.mean
    wStd  += w * p.std
    if (p.type === 'equity') equityPct += h.pct
  })
  return {
    equityMean:  parseFloat(wMean.toFixed(1)),
    equityStd:   parseFloat(wStd.toFixed(1)),
    equityRatio: Math.round(equityPct),
  }
}

function compressAndEncode(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

// ============================================================
// Canvas Chart Components
// ============================================================

const CHART_COLORS = {
  median:  '#c96442',
  p10:     '#e8a080',
  p90:     '#e8a080',
  fill:    'rgba(201,100,66,0.08)',
  buffer:  '#2d8c6f',
  withdraw:'#8b6914',
  grid:    '#e8e0d8',
  text:    '#9e8f82',
  zero:    '#c96442',
}

function useRetina(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
  })
}

function drawChart(canvas, stats, chartType, years) {
  if (!canvas || !stats) return
  const dpr  = window.devicePixelRatio || 1
  const rect  = canvas.getBoundingClientRect()
  const W     = rect.width
  const H     = rect.height
  canvas.width  = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const pad = { top: 20, right: 20, bottom: 40, left: 70 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top  - pad.bottom

  // Data arrays
  let dataMedian, dataLow, dataHigh, dataColor, yLabel
  if (chartType === 'portfolio') {
    dataMedian = stats.yearlyMedianTotal
    dataLow    = stats.yearlyP10Total
    dataHigh   = stats.yearlyP90Total
    dataColor  = CHART_COLORS.median
    yLabel     = '資產（萬）'
  } else if (chartType === 'withdrawal') {
    dataMedian = stats.yearlyMedianWithdraw
    dataLow    = stats.yearlyP10Withdraw
    dataHigh   = stats.yearlyMedianWithdraw
    dataColor  = CHART_COLORS.withdraw
    yLabel     = '年提領（萬）'
  } else {
    dataMedian = stats.yearlyMedianBuffer
    dataLow    = stats.yearlyP10Buffer
    dataHigh   = stats.yearlyMedianBuffer
    dataColor  = CHART_COLORS.buffer
    yLabel     = '緩衝池（萬）'
  }

  const allVals = [...dataMedian, ...(dataLow || []), ...(dataHigh || [])].filter(v => v != null && !isNaN(v))
  if (!allVals.length) return
  const maxVal = Math.max(...allVals) * 1.05
  const scaleY = v => chartH - (v / maxVal) * chartH + pad.top
  const scaleX = i => pad.left + (i / (years - 1)) * chartW

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Grid lines
  ctx.strokeStyle = CHART_COLORS.grid
  ctx.lineWidth   = 0.5
  const gridLines = 5
  for (let i = 0; i <= gridLines; i++) {
    const y   = pad.top + (chartH / gridLines) * i
    const val = maxVal * (1 - i / gridLines)
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    ctx.fillStyle = CHART_COLORS.text
    ctx.font = `11px Courier New`
    ctx.textAlign = 'right'
    ctx.fillText((val / 10000).toFixed(0), pad.left - 6, y + 4)
  }

  // X-axis labels
  ctx.fillStyle  = CHART_COLORS.text
  ctx.font       = '11px Courier New'
  ctx.textAlign  = 'center'
  const step = Math.ceil(years / 6)
  for (let i = 0; i < years; i += step) {
    ctx.fillText(`${i}年`, scaleX(i), H - pad.bottom + 18)
  }

  // Y-axis label
  ctx.save()
  ctx.translate(14, pad.top + chartH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText(yLabel, 0, 0)
  ctx.restore()

  // Fill band (P10–P90 or P10–median)
  if (dataLow && dataHigh) {
    ctx.beginPath()
    dataHigh.forEach((v, i) => {
      if (v == null) return
      i === 0 ? ctx.moveTo(scaleX(i), scaleY(v)) : ctx.lineTo(scaleX(i), scaleY(v))
    })
    ;[...dataLow].reverse().forEach((v, i) => {
      const ri = years - 1 - i
      if (v == null) return
      ctx.lineTo(scaleX(ri), scaleY(v))
    })
    ctx.closePath()
    ctx.fillStyle = CHART_COLORS.fill
    ctx.fill()
  }

  // Median line
  ctx.beginPath()
  ctx.strokeStyle = dataColor
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'round'
  dataMedian.forEach((v, i) => {
    if (v == null || isNaN(v)) return
    i === 0 ? ctx.moveTo(scaleX(i), scaleY(v)) : ctx.lineTo(scaleX(i), scaleY(v))
  })
  ctx.stroke()

  // P10 line (dashed)
  if (dataLow) {
    ctx.beginPath()
    ctx.strokeStyle = dataColor
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 4])
    dataLow.forEach((v, i) => {
      if (v == null || isNaN(v)) return
      i === 0 ? ctx.moveTo(scaleX(i), scaleY(v)) : ctx.lineTo(scaleX(i), scaleY(v))
    })
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Zero line
  if (maxVal > 0) {
    const y0 = scaleY(0)
    ctx.beginPath()
    ctx.strokeStyle = CHART_COLORS.zero
    ctx.lineWidth   = 0.5
    ctx.setLineDash([2, 4])
    ctx.moveTo(pad.left, y0); ctx.lineTo(pad.left + chartW, y0)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function RetirementChart({ stats, chartType, years }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!stats) return
    const canvas = canvasRef.current
    drawChart(canvas, stats, chartType, years)
  }, [stats, chartType, years])

  return (
    <canvas
      ref={canvasRef}
      className="sim__canvas"
      style={{ width: '100%', height: '280px' }}
    />
  )
}

// ============================================================
// Default parameters
// ============================================================

const DEFAULTS = {
  currentAssets:    16800000,
  annualExpense:    600000,
  years:            30,
  equityRatio:      70,
  equityMean:       7,
  equityStd:        15,
  bondMean:         3,
  bondStd:          4,
  inflation:        2,
  fatTailProb:      0.05,
  fatTailDrop:      35,
  gkUpperBand:      5.5,
  gkLowerBand:      3.5,
  technicianIncome: 30000,
  technicianYears:  10,
  pensionAmount:    0,
  pensionStartYear: 26,
  pensionCoverage:  0,
  bufferMonths:     12,
  sorrYears:        0,
  numRuns:          4000,
}

const STORAGE_KEY = 'enough_sim_params'

function loadParams() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

// ============================================================
// Main Simulator Component
// ============================================================

export default function Simulator() {
  const [params, setParams]     = useState(loadParams)
  const [stats,  setStats]      = useState(null)
  const [running, setRunning]   = useState(false)
  const [chartType, setChart]   = useState('portfolio')
  const [panelOpen, setPanel]   = useState(false)
  const [scenarios, setScenarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('enough_scenarios') || '[]') } catch { return [] }
  })
  const [scenarioName, setScenName] = useState('')
  const [todayAssets, setTodayAssets] = useState(() => {
    try { return parseFloat(localStorage.getItem('enough_today_assets')) || params.currentAssets } catch { return params.currentAssets }
  })
  const [gkYear,  setGkYear]   = useState(1)
  const [sorrTest, setSorr]    = useState(false)
  const [inflSens, setInflSens] = useState(false)
  const [yearDetail, setYearDetail] = useState(false)
  // Feature 1: retirement reverse calculator
  const [retireCalc, setRetireCalc] = useState({ currentAge: 40, annualSavings: 600000, targetRate: 90 })
  const [retireResult, setRetireResult] = useState(null)
  const [retireRunning, setRetireRunning] = useState(false)
  // Feature 3: vision analysis
  const [visionApiKey, setVisionApiKey] = useState(() => localStorage.getItem('enough_claude_key') || '')
  const [visionFile, setVisionFile] = useState(null)
  const [visionRunning, setVisionRunning] = useState(false)
  const [visionResult, setVisionResult] = useState(null)
  const [visionError, setVisionError] = useState('')

  // Persist params
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  }, [params])

  const set = (key) => (e) =>
    setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))

  // FI goal (4% rule)
  const fiGoal    = params.annualExpense * 25
  const fiPct     = Math.min(100, (params.currentAssets / fiGoal * 100))
  const yearsToFI = fiPct < 100
    ? Math.ceil((Math.log(fiGoal / params.currentAssets) / Math.log(1.05)) )
    : 0

  // Run simulation
  const runSim = useCallback(() => {
    setRunning(true)
    setYearDetail(false)
    setTimeout(() => {
      try {
        const paths = runMonteCarlo(params, params.numRuns, sorrTest ? params.sorrYears : 0)
        const s     = computeStats(paths, params.years)
        setStats(s)
      } finally {
        setRunning(false)
      }
    }, 30)
  }, [params, sorrTest])

  const runRetireCalc = useCallback(() => {
    setRetireRunning(true)
    setRetireResult(null)
    setTimeout(() => {
      try {
        const r = findRetirementYear(
          params.currentAssets,
          params.annualExpense,
          retireCalc.annualSavings,
          retireCalc.targetRate,
          params
        )
        setRetireResult(r)
      } finally {
        setRetireRunning(false)
      }
    }, 30)
  }, [params, retireCalc])

  const analyzePortfolioImage = useCallback(async () => {
    if (!visionFile || !visionApiKey) return
    setVisionRunning(true)
    setVisionError('')
    setVisionResult(null)
    try {
      // Compress image via canvas
      const base64 = await compressAndEncode(visionFile)
      const mediaType = 'image/jpeg'

      // Phase 1: identify holdings
      const resp1 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': visionApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `請分析這張投資帳戶截圖，列出所有資產持倉名稱與佔比百分比。
只回覆 JSON，格式：{"holdings":[{"name":"資產名稱或代號","pct":數字}]}
pct 為百分比數字，所有項目加總應接近100。若無法識別，回覆：{"error":"原因"}` }
            ]
          }]
        })
      })
      const data1 = await resp1.json()
      if (!resp1.ok) throw new Error(data1.error?.message || '識別失敗')
      const text1 = data1.content?.[0]?.text || ''
      const match = text1.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('無法解析回應格式')
      const json1 = JSON.parse(match[0])
      if (json1.error) throw new Error(json1.error)
      if (!json1.holdings?.length) throw new Error('未識別到任何持倉')

      const weighted = calcWeightedParams(json1.holdings)

      // Phase 2: AI comment
      const holdingsSummary = json1.holdings.map(h => `${h.name} ${h.pct.toFixed(1)}%`).join('、')
      const resp2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': visionApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `我的投資組合：${holdingsSummary}。
加權年化報酬約 ${weighted.equityMean}%，加權波動率約 ${weighted.equityStd}%，股票佔比 ${weighted.equityRatio}%。
目前資產 ${(params.currentAssets/10000).toFixed(0)} 萬，年支出 ${(params.annualExpense/10000).toFixed(1)} 萬。
請以繁體中文，用 150-200 字：1) 評價此配置的優缺點 2) 針對長期退休目標給出具體調整建議。語氣務實簡潔。`
          }]
        })
      })
      const data2 = await resp2.json()
      if (!resp2.ok) throw new Error(data2.error?.message || 'AI 評價失敗')
      const aiComment = data2.content?.[0]?.text || ''

      setVisionResult({ holdings: json1.holdings, ...weighted, aiComment })
    } catch (err) {
      setVisionError(err.message || '分析失敗，請確認 API Key 正確且圖片清晰')
    } finally {
      setVisionRunning(false)
    }
  }, [visionFile, visionApiKey, params])

  // Save scenario
  const saveScenario = () => {
    if (!stats || !scenarioName.trim()) return
    const sc = {
      id:   Date.now(),
      name: scenarioName.trim(),
      rate: stats.successRate.toFixed(1),
      final: (stats.medianFinal / 10000).toFixed(0),
      withdraw: params.annualExpense,
      assets: params.currentAssets,
      wr: (params.annualExpense / params.currentAssets * 100).toFixed(2),
    }
    const next = [sc, ...scenarios].slice(0, 5)
    setScenarios(next)
    localStorage.setItem('enough_scenarios', JSON.stringify(next))
    setScenName('')
  }

  // Persist todayAssets
  useEffect(() => {
    localStorage.setItem('enough_today_assets', todayAssets)
  }, [todayAssets])

  // GK today: based on todayAssets input (separate from simulation params)
  const todayWR = todayAssets > 0 ? params.annualExpense / todayAssets * 100 : 0
  let todayGkWithdraw = params.annualExpense
  let todayGkStatus   = 'normal' // 'normal' | 'cut' | 'raise'
  if (todayAssets > 0) {
    if (todayWR > params.gkUpperBand) {
      todayGkWithdraw = params.annualExpense * 0.90
      todayGkStatus   = 'cut'
    } else if (todayWR < params.gkLowerBand) {
      todayGkWithdraw = params.annualExpense * 1.10
      todayGkStatus   = 'raise'
    }
  }
  const todayGkMonthly = todayGkWithdraw / 12

  // GK current year calculator (used in results section)
  const totalNow  = params.currentAssets
  const currentWR = params.annualExpense / totalNow * 100
  let gkAdjust    = '維持不變'
  if (currentWR > params.gkUpperBand) gkAdjust = `削減10% → ${(params.annualExpense * 0.9 / 10000).toFixed(1)}萬`
  else if (currentWR < params.gkLowerBand) gkAdjust = `增加10% → ${(params.annualExpense * 1.1 / 10000).toFixed(1)}萬`

  // Inflation sensitivity
  const inflRates = inflSens ? [0, 1, 2, 3, 4] : null

  const successColor = (r) =>
    r >= 90 ? 'var(--success)' : r >= 75 ? 'var(--warning)' : 'var(--danger)'

  return (
    <main className="page sim">
      <div className="page-content">
        <div className="container">

          {/* Header */}
          <div className="sim__header">
            <div>
              <p className="text-accent" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                退休模擬器
              </p>
              <h1 style={{ marginBottom: 0 }}>找到那條線</h1>
            </div>
            <button
              className="btn btn-ghost btn-sm hide-mobile"
              onClick={() => setPanel(o => !o)}
            >
              {panelOpen ? '收起參數' : '展開參數'}
            </button>
          </div>

          {/* FI Progress Bar */}
          <div className="sim__fi-bar card">
            <div className="sim__fi-top">
              <span>財務獨立進度</span>
              <span className="sim__fi-pct" style={{ color: fiPct >= 100 ? 'var(--success)' : 'var(--accent)' }}>
                {fiPct.toFixed(1)}%
              </span>
            </div>
            <div className="sim__fi-track">
              <div className="sim__fi-fill" style={{ width: `${fiPct}%` }} />
              <div className="sim__fi-marker" title="目標" />
            </div>
            <div className="sim__fi-bottom">
              <span>{(params.currentAssets / 10000).toFixed(0)} 萬</span>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                {fiPct < 100
                  ? `距離目標 ${((fiGoal - params.currentAssets) / 10000).toFixed(0)} 萬（目標 ${(fiGoal/10000).toFixed(0)} 萬）`
                  : '已達財務獨立目標'}
              </span>
              <span>{(fiGoal / 10000).toFixed(0)} 萬</span>
            </div>
          </div>

          {/* Feature 1: Retirement reverse calculator */}
          <div className="sim__retire-card card">
            <div className="sim__retire-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>幾歲可以退？</h3>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  以目前資產 + 每年儲蓄，試算何時能達到目標成功率
                </p>
              </div>
            </div>
            <div className="sim__retire-inputs">
              <div className="sim__retire-field">
                <label className="sim__retire-label">目前年齡</label>
                <input
                  type="number"
                  className="sim__retire-input"
                  value={retireCalc.currentAge}
                  onChange={e => setRetireCalc(c => ({ ...c, currentAge: parseInt(e.target.value) || 0 }))}
                  min="20" max="70"
                />
              </div>
              <div className="sim__retire-field">
                <label className="sim__retire-label">每年可儲蓄（元）</label>
                <input
                  type="number"
                  className="sim__retire-input"
                  value={retireCalc.annualSavings}
                  onChange={e => setRetireCalc(c => ({ ...c, annualSavings: parseFloat(e.target.value) || 0 }))}
                  step="100000"
                />
                <span className="sim__retire-hint">= {(retireCalc.annualSavings / 10000).toFixed(1)} 萬</span>
              </div>
              <div className="sim__retire-field">
                <label className="sim__retire-label">目標成功率（%）</label>
                <input
                  type="number"
                  className="sim__retire-input"
                  value={retireCalc.targetRate}
                  onChange={e => setRetireCalc(c => ({ ...c, targetRate: parseFloat(e.target.value) || 90 }))}
                  min="50" max="99" step="5"
                />
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={runRetireCalc}
              disabled={retireRunning}
              style={{ alignSelf: 'flex-start' }}
            >
              {retireRunning ? '計算中…' : '試算退休年份'}
            </button>
            {retireResult !== null && !retireRunning && (
              retireResult
                ? (
                  <div className="sim__retire-result sim__retire-result--success">
                    <div className="sim__retire-result-main">
                      {retireResult.yearsNeeded === 0
                        ? '現在就可以退休了！'
                        : `預計 ${retireResult.yearsNeeded} 年後（${retireCalc.currentAge + retireResult.yearsNeeded} 歲）可以退休`}
                    </div>
                    <div className="sim__retire-result-sub">
                      屆時資產約 {(retireResult.projectedAssets / 10000).toFixed(0)} 萬 ／
                      模擬成功率 {retireResult.actualRate.toFixed(1)}% ／
                      以加權年化報酬 {retireResult.growthRate.toFixed(1)}% 試算
                    </div>
                  </div>
                ) : (
                  <div className="sim__retire-result sim__retire-result--fail">
                    <div className="sim__retire-result-main">50 年內估計無法達到目標成功率</div>
                    <div className="sim__retire-result-sub">建議增加儲蓄、提高投資報酬，或降低目標成功率</div>
                  </div>
                )
            )}
          </div>

          {/* Today's GK withdrawal card — always visible */}
          <div className="sim__today-card card">
            <div className="sim__today-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>今年度可提領金額</h3>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  依 Guyton-Klinger 法則，輸入當前資產即可得出建議提領額
                </p>
              </div>
            </div>
            <div className="sim__today-body">
              <div className="sim__today-input-wrap">
                <label className="sim__today-label">目前實際資產（元）</label>
                <input
                  type="number"
                  className="sim__today-input"
                  value={todayAssets}
                  onChange={e => setTodayAssets(parseFloat(e.target.value) || 0)}
                  step="100000"
                />
                <span className="sim__today-hint">= {(todayAssets / 10000).toFixed(1)} 萬</span>
              </div>
              <div className="sim__today-results">
                <div className={`sim__today-result sim__today-result--${todayGkStatus}`}>
                  <div className="sim__today-result-label">GK 建議年提領</div>
                  <div className="sim__today-result-val">
                    {(todayGkWithdraw / 10000).toFixed(1)} <span>萬 / 年</span>
                  </div>
                  <div className="sim__today-result-sub">
                    每月 {(todayGkMonthly / 10000).toFixed(2)} 萬
                  </div>
                </div>
                <div className="sim__today-result">
                  <div className="sim__today-result-label">目前提領率</div>
                  <div className="sim__today-result-val">
                    {todayWR.toFixed(2)} <span>%</span>
                  </div>
                  <div className="sim__today-result-sub">
                    安全線 {params.gkLowerBand}% – {params.gkUpperBand}%
                  </div>
                </div>
                <div className="sim__today-result">
                  <div className="sim__today-result-label">GK 調整</div>
                  <div className={`sim__today-result-val sim__today-badge--${todayGkStatus}`}>
                    {todayGkStatus === 'cut'   && '⬇ 削減 10%'}
                    {todayGkStatus === 'raise' && '⬆ 增加 10%'}
                    {todayGkStatus === 'normal' && '✓ 維持不變'}
                  </div>
                  <div className="sim__today-result-sub">
                    {todayGkStatus === 'cut'    && '提領率過高，需縮減支出'}
                    {todayGkStatus === 'raise'  && '提領率偏低，可適度增加'}
                    {todayGkStatus === 'normal' && '提領率在安全範圍內'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sim__layout">
            {/* Parameter panel */}
            <aside className={`sim__panel${panelOpen ? ' sim__panel--open' : ''}`}>
              <div className="sim__panel-inner">

                <Section title="基本設定">
                  <Field label={`目前資產 ${(params.currentAssets/10000).toFixed(0)} 萬`}>
                    <input type="number" value={params.currentAssets} onChange={set('currentAssets')} step="100000" />
                  </Field>
                  <Field label={`年度生活支出 ${(params.annualExpense/10000).toFixed(1)} 萬`}>
                    <input type="number" value={params.annualExpense} onChange={set('annualExpense')} step="10000" />
                  </Field>
                  <Field label={`模擬年數 ${params.years} 年`}>
                    <input type="range" min="15" max="50" value={params.years} onChange={set('years')} />
                  </Field>
                  <Field label="模擬次數">
                    <select value={params.numRuns} onChange={set('numRuns')}>
                      <option value={1000}>1,000（快速）</option>
                      <option value={4000}>4,000（推薦）</option>
                      <option value={10000}>10,000（精確）</option>
                    </select>
                  </Field>
                </Section>

                <Section title="投資組合">
                  <Field label={`股票比例 ${params.equityRatio}%`}>
                    <input type="range" min="0" max="100" value={params.equityRatio} onChange={set('equityRatio')} />
                  </Field>
                  <Field label={`股票年化報酬 ${params.equityMean}%`}>
                    <input type="range" min="1" max="15" step="0.5" value={params.equityMean} onChange={set('equityMean')} />
                  </Field>
                  <Field label={`股票標準差 ${params.equityStd}%`}>
                    <input type="range" min="5" max="30" value={params.equityStd} onChange={set('equityStd')} />
                  </Field>
                  <Field label={`債券年化報酬 ${params.bondMean}%`}>
                    <input type="range" min="0" max="8" step="0.5" value={params.bondMean} onChange={set('bondMean')} />
                  </Field>
                  <Field label={`通膨率 ${params.inflation}%`}>
                    <input type="range" min="0" max="6" step="0.5" value={params.inflation} onChange={set('inflation')} />
                  </Field>

                  {/* Feature 3: Vision analysis */}
                  <div className="sim__vision-wrap">
                    <div className="sim__vision-divider">— 或上傳截圖自動帶入 —</div>
                    <div className="sim__vision-key-row">
                      <label className="sim__vision-key-label">Claude API Key</label>
                      <input
                        type="password"
                        className="sim__vision-key-input"
                        placeholder="sk-ant-..."
                        value={visionApiKey}
                        onChange={e => {
                          setVisionApiKey(e.target.value)
                          localStorage.setItem('enough_claude_key', e.target.value)
                        }}
                      />
                      <span className="sim__vision-key-hint">僅存於本機瀏覽器</span>
                    </div>
                    <label className="sim__vision-upload-btn btn btn-ghost btn-sm">
                      {visionFile ? `✓ ${visionFile.name}` : '上傳持倉截圖'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => { setVisionFile(e.target.files[0] || null); setVisionResult(null); setVisionError('') }}
                      />
                    </label>
                    {visionFile && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={analyzePortfolioImage}
                        disabled={visionRunning || !visionApiKey}
                      >
                        {visionRunning ? '分析中…' : '分析配置 + 取得 AI 建議'}
                      </button>
                    )}
                    {visionError && <p className="sim__vision-error">{visionError}</p>}
                    {visionResult && (
                      <div className="sim__vision-result">
                        <div className="sim__vision-result-title">識別持倉</div>
                        {visionResult.holdings.map((h, i) => (
                          <div key={i} className="sim__vision-holding">
                            <span>{h.name}</span>
                            <span>{h.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                        <div className="sim__vision-calc-row">
                          加權報酬 {visionResult.equityMean}% ／ 波動 {visionResult.equityStd}% ／ 股票比 {visionResult.equityRatio}%
                        </div>
                        {visionResult.aiComment && (
                          <div className="sim__vision-ai-comment">{visionResult.aiComment}</div>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setParams(p => ({
                            ...p,
                            equityMean:  visionResult.equityMean,
                            equityStd:   visionResult.equityStd,
                            equityRatio: visionResult.equityRatio,
                          }))}
                        >
                          帶入模擬參數
                        </button>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="肥尾效應（黑天鵝）">
                  <Field label={`黑天鵝機率 ${(params.fatTailProb * 100).toFixed(0)}% / 年`}>
                    <input type="range" min="0" max="0.15" step="0.01" value={params.fatTailProb} onChange={set('fatTailProb')} />
                  </Field>
                  <Field label={`黑天鵝跌幅 ${params.fatTailDrop}%`}>
                    <input type="range" min="10" max="60" value={params.fatTailDrop} onChange={set('fatTailDrop')} />
                  </Field>
                </Section>

                <Section title="Guyton-Klinger 規則">
                  <Field label={`上限警戒線 ${params.gkUpperBand}%`}>
                    <input type="range" min="4" max="7" step="0.1" value={params.gkUpperBand} onChange={set('gkUpperBand')} />
                  </Field>
                  <Field label={`下限保護線 ${params.gkLowerBand}%`}>
                    <input type="range" min="2" max="4.5" step="0.1" value={params.gkLowerBand} onChange={set('gkLowerBand')} />
                  </Field>
                </Section>

                <Section title="分階段收入">
                  <Field label={`技師月收入 ${(params.technicianIncome/10000).toFixed(1)} 萬`}>
                    <input type="range" min="0" max="80000" step="5000" value={params.technicianIncome} onChange={set('technicianIncome')} />
                  </Field>
                  <Field label={`技師收入持續 ${params.technicianYears} 年`}>
                    <input type="range" min="0" max="20" value={params.technicianYears} onChange={set('technicianYears')} />
                  </Field>
                  <Field label={`月退年金 ${(params.pensionAmount/10000).toFixed(1)} 萬/月`}>
                    <input type="range" min="0" max="80000" step="5000" value={params.pensionAmount} onChange={set('pensionAmount')} />
                  </Field>
                  <Field label={`月退起始（第 ${params.pensionStartYear} 年）`}>
                    <input type="range" min="1" max="40" value={params.pensionStartYear} onChange={set('pensionStartYear')} />
                  </Field>
                </Section>

                <Section title="現金緩衝池">
                  <Field label={`緩衝池大小 ${params.bufferMonths} 個月`}>
                    <input type="range" min="0" max="36" value={params.bufferMonths} onChange={set('bufferMonths')} />
                  </Field>
                </Section>

                <Section title="順序風險壓力測試">
                  <div className="sim__toggle-row">
                    <label className="sim__toggle">
                      <input type="checkbox" checked={sorrTest} onChange={e => setSorr(e.target.checked)} />
                      <span>啟用強制熊市</span>
                    </label>
                  </div>
                  {sorrTest && (
                    <Field label={`前 ${params.sorrYears} 年強制熊市`}>
                      <input type="range" min="1" max="10" value={params.sorrYears} onChange={set('sorrYears')} />
                    </Field>
                  )}
                </Section>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setParams({ ...DEFAULTS }); setStats(null) }}
                  >
                    重設預設值
                  </button>
                </div>
              </div>
            </aside>

            {/* Results area */}
            <div className="sim__main">
              {/* Mobile: param toggle */}
              <button
                className="btn btn-ghost btn-sm sim__mobile-toggle"
                onClick={() => setPanel(o => !o)}
              >
                {panelOpen ? '收起參數 ▲' : '展開參數 ▼'}
              </button>

              {/* Run button */}
              <button
                className={`btn btn-primary sim__run${running ? ' sim__run--loading' : ''}`}
                onClick={runSim}
                disabled={running}
              >
                {running ? '模擬中…' : `執行模擬（${params.numRuns.toLocaleString()} 次）`}
              </button>

              {/* Stats summary */}
              {stats && (
                <>
                  <div className="sim__stats">
                    <div className="sim__stat">
                      <div className="sim__stat-val" style={{ color: successColor(stats.successRate) }}>
                        {stats.successRate.toFixed(1)}%
                      </div>
                      <div className="sim__stat-label">成功率</div>
                      <div className="sim__stat-sub">
                        {stats.successRate >= 90 ? '非常穩健' : stats.successRate >= 75 ? '尚可接受' : '風險偏高'}
                      </div>
                    </div>
                    <div className="sim__stat">
                      <div className="sim__stat-val">
                        {(stats.medianFinal / 10000).toFixed(0)}萬
                      </div>
                      <div className="sim__stat-label">中位數終點資產</div>
                      <div className="sim__stat-sub">{params.years} 年後</div>
                    </div>
                    <div className="sim__stat">
                      <div className="sim__stat-val">
                        {(params.annualExpense / params.currentAssets * 100).toFixed(2)}%
                      </div>
                      <div className="sim__stat-label">初始提領率</div>
                      <div className="sim__stat-sub">
                        {params.annualExpense / params.currentAssets * 100 <= 4
                          ? '低於4%安全線'
                          : '超過4%'}
                      </div>
                    </div>
                    <div className="sim__stat">
                      <div className="sim__stat-val">
                        {((stats.yearlyMedianWithdraw[Math.min(1, stats.yearlyMedianWithdraw.length-1)] || 0) / 10000).toFixed(1)}萬
                      </div>
                      <div className="sim__stat-label">中位數年提領</div>
                      <div className="sim__stat-sub">第 1 年</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="sim__chart-wrap card">
                    <div className="sim__chart-tabs">
                      {[
                        { id: 'portfolio',  label: '資產軌跡' },
                        { id: 'withdrawal', label: '年度提領' },
                        { id: 'buffer',     label: '緩衝池水位' },
                      ].map(t => (
                        <button
                          key={t.id}
                          className={`sim__tab${chartType === t.id ? ' sim__tab--active' : ''}`}
                          onClick={() => setChart(t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <RetirementChart stats={stats} chartType={chartType} years={params.years} />
                    <p className="sim__chart-caption text-muted">
                      實線：中位數（50%ile）　虛線：悲觀情境（10%ile）　陰影：10–90%ile 範圍
                    </p>
                  </div>

                  {/* Feature 2: Annual detail table */}
                  <div className="sim__detail card">
                    <div className="sim__detail-header">
                      <h3>年度明細</h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => setYearDetail(o => !o)}>
                        {yearDetail ? '收起 ▲' : '展開明細 ▼'}
                      </button>
                    </div>
                    {yearDetail && (
                      <div className="sim__detail-table-wrap">
                        <table className="sim__detail-table">
                          <thead>
                            <tr className="sim__detail-head">
                              <th>年份</th>
                              <th>中位數資產（萬）</th>
                              <th>悲觀 P10（萬）</th>
                              <th>年提領（萬）</th>
                              <th>緩衝池（萬）</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: params.years }, (_, i) => (
                              <tr key={i} className={`sim__detail-row${i % 2 === 0 ? ' sim__detail-row--even' : ''}`}>
                                <td>第 {i + 1} 年</td>
                                <td>{((stats.yearlyMedianTotal[i]    || 0) / 10000).toFixed(1)}</td>
                                <td>{((stats.yearlyP10Total[i]        || 0) / 10000).toFixed(1)}</td>
                                <td>{((stats.yearlyMedianWithdraw[i]  || 0) / 10000).toFixed(1)}</td>
                                <td>{((stats.yearlyMedianBuffer[i]    || 0) / 10000).toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Inflation sensitivity */}
                  <div className="sim__section card">
                    <div className="sim__section-header">
                      <h3>通膨敏感度比較</h3>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setInflSens(o => !o)}
                      >
                        {inflSens ? '收起' : '展開比較'}
                      </button>
                    </div>
                    {inflSens && (
                      <div className="sim__infl-table">
                        <div className="sim__infl-row sim__infl-head">
                          <span>通膨率</span>
                          <span>成功率</span>
                          <span>提領率</span>
                        </div>
                        {[0, 1, 2, 3, 4].map(rate => {
                          const p2 = { ...params, inflation: rate }
                          const paths2 = runMonteCarlo(p2, 1000, 0)
                          const s2 = computeStats(paths2, params.years)
                          return (
                            <div key={rate} className={`sim__infl-row${rate === params.inflation ? ' sim__infl-row--current' : ''}`}>
                              <span>{rate}%</span>
                              <span style={{ color: successColor(s2.successRate) }}>
                                {s2.successRate.toFixed(1)}%
                              </span>
                              <span>{(params.annualExpense / params.currentAssets * 100).toFixed(2)}%</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* GK Current Year Calculator */}
                  <div className="sim__section card">
                    <h3>GK 當年度提領計算機</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                      根據目前資產與提領率，GK規則建議：
                    </p>
                    <div className="sim__gk-grid">
                      <div className="sim__gk-item">
                        <div className="sim__gk-label">目前提領率</div>
                        <div className="sim__gk-val">{currentWR.toFixed(2)}%</div>
                      </div>
                      <div className="sim__gk-item">
                        <div className="sim__gk-label">GK 建議</div>
                        <div className="sim__gk-val" style={{ color: gkAdjust === '維持不變' ? 'var(--success)' : 'var(--warning)' }}>
                          {gkAdjust}
                        </div>
                      </div>
                      <div className="sim__gk-item">
                        <div className="sim__gk-label">上限警戒</div>
                        <div className="sim__gk-val">{params.gkUpperBand}%</div>
                      </div>
                      <div className="sim__gk-item">
                        <div className="sim__gk-label">下限保護</div>
                        <div className="sim__gk-val">{params.gkLowerBand}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Scenario comparison */}
                  <div className="sim__section card">
                    <h3>情境比較</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                      儲存此次模擬結果，與其他情境並排比較（最多5組）
                    </p>
                    <div className="sim__sc-save">
                      <input
                        type="text"
                        placeholder="情境名稱（例：2031退休）"
                        value={scenarioName}
                        onChange={e => setScenName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={saveScenario}>
                        儲存
                      </button>
                    </div>
                    {scenarios.length > 0 && (
                      <div className="sim__sc-list">
                        <div className="sim__sc-head">
                          <span>情境</span>
                          <span>資產</span>
                          <span>提領率</span>
                          <span>成功率</span>
                          <span>中位終點</span>
                        </div>
                        {scenarios.map(sc => (
                          <div key={sc.id} className="sim__sc-row">
                            <span className="sim__sc-name">{sc.name}</span>
                            <span>{(sc.assets / 10000).toFixed(0)}萬</span>
                            <span>{sc.wr}%</span>
                            <span style={{ color: successColor(parseFloat(sc.rate)) }}>
                              {sc.rate}%
                            </span>
                            <span>{sc.final}萬</span>
                          </div>
                        ))}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginTop: '0.5rem' }}
                          onClick={() => { setScenarios([]); localStorage.removeItem('enough_scenarios') }}
                        >
                          清除所有
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!stats && !running && (
                <div className="sim__empty">
                  <div className="sim__empty-icon">∿</div>
                  <p>調整左側參數，按下「執行模擬」</p>
                  <p className="text-muted">4,000 條市場軌跡，幾秒內跑完</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// Small helper components
function Section({ title, children }) {
  return (
    <div className="sim__section-group">
      <div className="sim__section-title">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="sim__field">
      <label>{label}</label>
      {children}
    </div>
  )
}
