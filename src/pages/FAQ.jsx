import { useState } from 'react'
import './FAQ.css'

const faqs = [
  {
    q: '什麼是蒙地卡羅模擬？',
    a: `想像你要預測30年後的退休金夠不夠用。你沒辦法知道市場每一年的報酬，但你可以「丟骰子」4,000次——每次都給市場一組隨機的報酬序列，有的運氣好，有的遇到金融海嘯，有的前幾年就崩盤。

模擬跑完，4,000條人生軌跡裡有多少條到終點還有錢？那個比例，就是你的成功率。

成功率85%以上，數字就算是站得住腳的。`
  },
  {
    q: '什麼是提領率？3.5%安全嗎？',
    a: `提領率 = 每年花費 ÷ 退休總資產。

比如你有1,000萬，每年花35萬，提領率就是3.5%。

「4%法則」來自1994年的研究（三一大學）：假設退休30年、股債6:4組合，4%提領率歷史上有95%的存活率。

但這是美國市場的數字，且不考慮台灣的年金體制。如果你有技師執照收入或月退，等效提領率可以更高——因為你不全靠資產在養活自己。`
  },
  {
    q: 'Guyton-Klinger動態提領規則怎麼運作？',
    a: `傳統提領策略是每年固定金額＋通膨調整，問題是壞年份也照花，會提早見底。

GK規則在兩種情況下介入：

壞年警戒：當年度提領率超過上限（例如5.5%），強制削減提領10%。
好年保護：當年度提領率低於下限（例如3.5%），允許增加提領10%。

同時，若市場剛好下跌，那一年不做通膨調整。

結果：壞年少花一點，好年不用忍著，整體讓資產更有機會撐過30年。`
  },
  {
    q: '什麼是順序風險（SORR）？',
    a: `退休後最怕的不是平均報酬太低，而是「一開始就跌死了」。

假設你退休後第一年市場跌40%，你還在提領生活費，資產大幅縮水；即使之後每年漲12%，也可能再也追不回來。

這就是順序風險（Sequence of Returns Risk）。

模擬器的「前N年強制熊市」功能，就是在模擬最壞情況：退休第一天就遇到長熊市，看看你的數字還撐不撐得住。`
  },
  {
    q: '肥尾效應是什麼？',
    a: `正常的統計分佈假設市場報酬像鐘形曲線——極端事件很少發生。但現實是，金融危機、病毒、戰爭，這些「黑天鵝」比理論預測的更常出現。

肥尾效應（Fat Tail）就是在模擬時加入這些極端事件的機率：比如每年有5%的機率發生跌幅40%的黑天鵝事件。

這讓模擬結果更接近真實世界的殘忍，而不是只算風平浪靜的情境。`
  },
  {
    q: '什麼是現金緩衝池？',
    a: `退休了，你不想在股市低點被迫賣股票來生活。

現金緩衝池的邏輯：平時保留N個月的生活費放在現金或短期定存。市場下跌時，先從緩衝池提領，不動股票；市場好的時候（漲幅超過閾值），把一部分獲利撥回緩衝池補滿。

這樣可以有效緩解順序風險，不用在崩盤的時候賣在低點。`
  },
  {
    q: '為什麼要等15年年資才能領月退？',
    a: `台灣公務員的退休制度：

服務滿25年，可以領月退俸（每月約6–7萬）。
服務滿15年但未達25年，只能領一次退休金（一次金）。

如果你在39歲辭職（服務約15年），可能選擇月退延後到65歲才領，或選擇一次金。

模擬器的「分階段收入」功能，讓你可以設定「第X年開始，每月多一筆月退收入」，看看這筆錢對整體成功率的影響。這通常會大幅改善退休後20–30年的存活率。`
  }
]

function FAQItem({ item, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq__item${open ? ' faq__item--open' : ''}`}>
      <button className="faq__question" onClick={() => setOpen(o => !o)}>
        <span className="faq__q-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="faq__q-text">{item.q}</span>
        <span className="faq__chevron">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="faq__answer">
          {item.a.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <main className="page">
      <div className="page-content">
        <div className="container-narrow">
          <p className="text-accent" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            概念說明
          </p>
          <h1 style={{ marginBottom: '0.75rem' }}>看懂這些，<br />數字就會說話。</h1>
          <p className="text-secondary" style={{ fontSize: '1.05rem', marginBottom: '3rem' }}>
            幾個退休規劃裡最常被問到的概念，用人話解釋。
          </p>

          <div className="faq__list">
            {faqs.map((item, i) => (
              <FAQItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
