import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import './About.css'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const DESTINATIONS = [
  { name: '東京',           coords: [139.69,  35.68] },
  { name: '京都',           coords: [135.77,  35.01] },
  { name: '大阪',           coords: [135.50,  34.69] },
  { name: '沖繩',           coords: [127.68,  26.21] },
  { name: '成都',           coords: [104.07,  30.67] },
  { name: '大理',           coords: [100.16,  25.69] },
  { name: '桂林',           coords: [110.29,  25.27] },
  { name: '昆明',           coords: [102.71,  25.05] },
  { name: '廈門',           coords: [118.09,  24.48] },
  { name: '里斯本',         coords: [ -9.14,  38.72] },
  { name: '馬德里',         coords: [ -3.70,  40.42] },
  { name: '巴塞隆納',       coords: [  2.17,  41.39] },
  { name: '巴黎',           coords: [  2.35,  48.86] },
  { name: '維也納',         coords: [ 16.37,  48.21] },
  { name: '布拉格',         coords: [ 14.42,  50.09] },
  { name: '布達佩斯',       coords: [ 19.04,  47.50] },
  { name: '愛丁堡',         coords: [ -3.19,  55.95] },
  { name: '伊斯坦堡',       coords: [ 28.95,  41.01] },
  { name: '雅典',           coords: [ 23.73,  37.98] },
  { name: '溫哥華',         coords: [-123.12,  49.28] },
  { name: '舊金山',         coords: [-122.42,  37.77] },
  { name: '哈瓦那',         coords: [-82.38,  23.14] },
  { name: '布宜諾斯艾利斯', coords: [-58.38, -34.60] },
  { name: '利馬',           coords: [-77.04, -12.05] },
  { name: '開普敦',         coords: [ 18.42, -33.93] },
  { name: '奈洛比',         coords: [ 36.82,  -1.29] },
  { name: '摩洛哥',         coords: [ -7.99,  31.62] },
  { name: '雪梨',           coords: [151.21, -33.87] },
  { name: '清邁',           coords: [ 98.99,  18.79] },
  { name: '加德滿都',       coords: [ 85.32,  27.71] },
]

const timeline = [
  { year: '2016', label: '入公職', note: '鋪面工程研究，開始累積年資' },
  { year: '2026', label: '開始計算', note: '第一次認真算出那條線' },
  { year: '2031', label: '離開', note: '39歲，資產1,680萬，3.81%提領率' },
  { year: '2057', label: '？', note: '想去的地方還沒排好順序' },
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

          {/* World map */}
          <div className="about__mapwrap">
            <div className="about__mapsvg">
              <ComposableMap
                projection="geoNaturalEarth1"
                projectionConfig={{ scale: 145 }}
                style={{ width: '100%', height: 'auto' }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map(geo => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="var(--border)"
                        stroke="var(--card)"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover:   { outline: 'none' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {DESTINATIONS.map(dest => (
                  <Marker key={dest.name} coordinates={dest.coords}>
                    <circle r={3} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="2,1.5" />
                    <circle r={1} fill="var(--accent)" />
                  </Marker>
                ))}
              </ComposableMap>
            </div>
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
