import './About.css'

const timeline = [
  { year: '2016', label: '入公職', note: '鋪面工程研究，開始累積年資' },
  { year: '2026', label: '開始計算', note: '第一次認真算出那條線' },
  { year: '2031', label: '離開', note: '39歲，資產1,680萬，3.81%提領率' },
  { year: '2057', label: '？', note: '想去的地方還沒排好順序' },
]

// Scattered dots for the world map decoration
const dots = [
  { x: 22, y: 38 }, { x: 48, y: 28 }, { x: 52, y: 55 }, { x: 68, y: 32 },
  { x: 71, y: 45 }, { x: 80, y: 60 }, { x: 35, y: 62 }, { x: 15, y: 48 },
  { x: 60, y: 22 }, { x: 85, y: 35 }, { x: 28, y: 72 }, { x: 42, y: 48 },
]

export default function About() {
  return (
    <main className="page">
      <div className="page-content">
        <div className="container-narrow">
          <p className="text-accent" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            關於
          </p>
          <h1 style={{ marginBottom: '2.5rem' }}>這個工具是怎麼來的</h1>

          <div className="about__bio">
            <p>我是一個台灣的公務員，從事鋪面工程研究。</p>
            <p>2031年，我打算辭職。</p>
            <p>
              不是因為討厭工作——雖然我確實越來越討厭這個體制——而是因為我算清楚了：39歲，資產1,680萬，3.81%提領率，技師執照。三層保障，剛剛好夠。
            </p>
            <p>想去的地方很多，還沒排好順序。不趕時間，不看LINE。</p>
            <p>
              「夠了」是我為自己做的計算工具，用蒙地卡羅模擬驗證這個決定在數千種市場情境下能不能撐住。
            </p>
            <p>
              它不是理財建議，不是產品，不是給所有人的。<br />
              它只是一個人想清楚之後，留下來的證明。
            </p>
          </div>

          {/* Timeline */}
          <div className="about__timeline">
            {timeline.map((item, i) => (
              <div key={i} className="about__tl-item">
                <div className="about__tl-year">{item.year}</div>
                <div className="about__tl-dot" />
                <div className="about__tl-content">
                  <div className="about__tl-label">{item.label}</div>
                  <div className="about__tl-note">{item.note}</div>
                </div>
              </div>
            ))}
            <div className="about__tl-line" />
          </div>

          {/* World map decoration */}
          <div className="about__mapwrap">
            <svg viewBox="0 0 100 70" className="about__mapsvg" aria-hidden="true">
              {/* Placeholder land masses as simple shapes */}
              <ellipse cx="22" cy="35" rx="10" ry="8" fill="var(--border)" opacity="0.5" />
              <ellipse cx="48" cy="32" rx="16" ry="10" fill="var(--border)" opacity="0.5" />
              <ellipse cx="68" cy="30" rx="12" ry="9" fill="var(--border)" opacity="0.5" />
              <ellipse cx="82" cy="45" rx="8" ry="6" fill="var(--border)" opacity="0.4" />
              <ellipse cx="35" cy="58" rx="7" ry="5" fill="var(--border)" opacity="0.35" />
              {/* Scattered dots */}
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="1.2" fill="var(--accent)" opacity="0.55" />
              ))}
            </svg>
            <p className="about__mapnote">想去的地方很多，還沒排好順序。</p>
          </div>

          {/* Technical section */}
          <div className="about__tech">
            <h3>技術說明</h3>
            <p>
              採用 <strong>Guyton-Klinger 動態提領規則</strong>、<strong>肥尾效應模擬</strong>、<strong>分階段收入架構</strong>，以及<strong>現金緩衝池回補機制</strong>。每次模擬跑 4,000 次以上的隨機市場情境。
            </p>
            <div className="about__tech-tags">
              <span className="tag tag-accent">React + Vite</span>
              <span className="tag tag-accent">Canvas Charts</span>
              <span className="tag tag-accent">Firebase Firestore</span>
              <span className="tag tag-accent">PWA</span>
              <span className="tag tag-accent">Guyton-Klinger</span>
              <span className="tag tag-accent">Monte Carlo</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
