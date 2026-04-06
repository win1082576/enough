import { useState, useEffect, useCallback } from 'react'
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup
} from 'react-simple-maps'
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db, ensureAuth } from '../firebase'
import './TravelMap.css'

// World topojson
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Preset city database (city name → [lng, lat])
const CITY_DB = {
  '東京': [139.69, 35.68], '京都': [135.77, 35.01], '大阪': [135.50, 34.69],
  '沖繩': [127.68, 26.21], '北海道': [142.77, 43.06], '奈良': [135.83, 34.69],
  '神戶': [135.19, 34.69], '福岡': [130.40, 33.59], '廣島': [132.46, 34.39],
  '首爾': [126.98, 37.57], '釜山': [129.08, 35.18], '濟州島': [126.56, 33.49],
  '曼谷': [100.52, 13.75], '清邁': [98.99, 18.79], '芭達雅': [100.88, 12.93],
  '胡志明市': [106.63, 10.82], '河內': [105.85, 21.03], '峴港': [108.20, 16.07], '會安': [108.34, 15.88],
  '峇里島': [115.19, -8.41], '吉隆坡': [101.69, 3.14], '新加坡': [103.82, 1.35],
  '雅加達': [106.83, -6.17], '日惹': [110.36, -7.80], '馬尼拉': [120.98, 14.60],
  '宿霧': [123.89, 10.32], '加德滿都': [85.32, 27.71], '孟買': [72.88, 19.08],
  '新德里': [77.21, 28.63], '科倫坡': [79.86, 6.92], '普吉島': [98.40, 7.88],
  // 中國 — 一線城市
  '北京': [116.41, 39.91], '上海': [121.47, 31.23], '廣州': [113.26, 23.13], '深圳': [114.06, 22.54],
  // 中國 — 西南（旅居熱門）
  '成都': [104.07, 30.67], '重慶': [106.55, 29.56],
  '昆明': [102.71, 25.05], '大理': [100.16, 25.69], '麗江': [100.22, 26.87],
  '西雙版納': [100.80, 22.01], '香格里拉': [99.71, 27.83],
  // 中國 — 西北
  '西安': [108.94, 34.27], '蘭州': [103.83, 36.06], '敦煌': [94.68, 40.14],
  '烏魯木齊': [87.62, 43.83], '喀什': [75.99, 39.47],
  // 中國 — 華南
  '廈門': [118.09, 24.48], '福州': [119.30, 26.08], '桂林': [110.29, 25.27],
  '陽朔': [110.50, 24.78], '三亞': [109.51, 18.25], '海口': [110.33, 20.03],
  // 中國 — 華東
  '杭州': [120.15, 30.27], '蘇州': [120.62, 31.30], '南京': [118.80, 32.07],
  '揚州': [119.41, 32.39], '黃山': [118.34, 29.72], '烏鎮': [120.49, 30.64],
  // 中國 — 華中
  '武漢': [114.31, 30.52], '長沙': [112.98, 28.23], '張家界': [110.48, 29.12],
  '鳳凰古城': [109.60, 27.95],
  // 中國 — 華北 / 東北
  '青島': [120.38, 36.07], '濟南': [117.12, 36.65], '瀋陽': [123.46, 41.80],
  '哈爾濱': [126.65, 45.75], '長春': [125.32, 43.82],
  // 港澳
  '香港': [114.17, 22.32], '澳門': [113.55, 22.20],
  '里斯本': [-9.14, 38.72], '馬德里': [-3.70, 40.42], '巴塞隆納': [2.17, 41.39],
  '巴黎': [2.35, 48.86], '阿姆斯特丹': [4.90, 52.37], '布魯塞爾': [4.35, 50.85],
  '柏林': [13.41, 52.52], '慕尼黑': [11.58, 48.14], '維也納': [16.37, 48.21],
  '布拉格': [14.42, 50.09], '布達佩斯': [19.04, 47.50], '華沙': [21.01, 52.23],
  '羅馬': [12.50, 41.90], '米蘭': [9.19, 45.46], '那不勒斯': [14.27, 40.85],
  '雅典': [23.73, 37.98], '伊斯坦堡': [28.95, 41.01], '克羅埃西亞': [15.97, 45.81],
  '倫敦': [-0.13, 51.51], '愛丁堡': [-3.19, 55.95], '都柏林': [-6.27, 53.33],
  '哥本哈根': [12.57, 55.68], '斯德哥爾摩': [18.07, 59.33], '赫爾辛基': [24.94, 60.17],
  '里加': [24.11, 56.95], '塔林': [24.75, 59.44],
  '紐約': [-74.01, 40.71], '洛杉磯': [-118.24, 34.05], '舊金山': [-122.42, 37.77],
  '西雅圖': [-122.33, 47.61], '波特蘭': [-122.68, 45.52], '奧斯丁': [-97.74, 30.27],
  '邁阿密': [-80.19, 25.77], '芝加哥': [-87.63, 41.88], '溫哥華': [-123.12, 49.28],
  '多倫多': [-79.38, 43.65], '蒙特婁': [-73.57, 45.51], '墨西哥城': [-99.13, 19.43],
  '坎昆': [-86.84, 21.17], '哈瓦那': [-82.38, 23.14], '波哥大': [-74.08, 4.71],
  '利馬': [-77.04, -12.05], '聖地牙哥': [-70.65, -33.45], '布宜諾斯艾利斯': [-58.38, -34.60],
  '里約熱內盧': [-43.17, -22.91], '聖保羅': [-46.63, -23.55],
  '開羅': [31.24, 30.06], '摩洛哥': [-7.99, 31.62], '坦尚尼亞': [35.74, -6.17],
  '南非開普敦': [18.42, -33.93], '奈洛比': [36.82, -1.29],
  '雪梨': [151.21, -33.87], '墨爾本': [144.97, -37.82], '布里斯本': [153.02, -27.47],
  '奧克蘭': [174.76, -36.85], '努美阿': [166.46, -22.28],
  '台北': [121.56, 25.04], '台中': [120.68, 24.14], '台南': [120.22, 22.99],
  '高雄': [120.30, 22.62], '花蓮': [121.60, 23.99],
}

const COLLECTION = 'travel_cities'

export default function TravelMap() {
  const [cities,    setCities]   = useState([])
  const [selected,  setSelected] = useState(null) // city id being edited
  const [search,    setSearch]   = useState('')
  const [zoom,      setZoom]     = useState(1)
  const [center,    setCenter]   = useState([20, 10])
  const [loading,   setLoading]  = useState(true)
  const [offline,   setOffline]  = useState(false)
  const [addMode,   setAddMode]  = useState(false)
  const [draft,     setDraft]    = useState(null)
  const [uid,       setUid]      = useState(null)

  // Auth
  useEffect(() => {
    ensureAuth()
      .then(user => setUid(user.uid))
      .catch(() => setOffline(true))
  }, [])

  // Firestore listener
  useEffect(() => {
    if (!uid) return
    const unsub = onSnapshot(
      collection(db, 'users', uid, COLLECTION),
      snapshot => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setCities(data)
        setLoading(false)
      },
      err => {
        console.warn('Firestore offline:', err)
        setOffline(true)
        setLoading(false)
      }
    )
    return unsub
  }, [uid])

  const saveCity = useCallback(async (city) => {
    if (!uid) return
    const ref = doc(db, 'users', uid, COLLECTION, city.id)
    await setDoc(ref, {
      name:       city.name,
      lng:        city.lng,
      lat:        city.lat,
      visited:    city.visited,
      monthlyCost:city.monthlyCost,
      notes:      city.notes,
      updatedAt:  serverTimestamp(),
    })
  }, [uid])

  const removeCity = useCallback(async (id) => {
    if (!uid) return
    await deleteDoc(doc(db, 'users', uid, COLLECTION, id))
    setSelected(null)
  }, [uid])

  // Recommended China residence cities (旅居推薦)
  const CHINA_PRESETS = [
    { name: '成都',   monthlyCost: 25000, notes: '生活步調慢，餐飲便宜，氣候宜人，適合長住' },
    { name: '大理',   monthlyCost: 18000, notes: '洱海旁，氣候涼爽，有旅居社群，租金低' },
    { name: '廈門',   monthlyCost: 28000, notes: '海濱城市，鼓浪嶼，閩南料理，冬暖夏涼' },
    { name: '杭州',   monthlyCost: 32000, notes: '西湖，茶文化，交通便利，生活品質高' },
    { name: '麗江',   monthlyCost: 16000, notes: '古城氛圍，旅居社群，海拔較高需適應' },
    { name: '桂林',   monthlyCost: 18000, notes: '喀斯特地形，陽朔近郊，生活費低' },
    { name: '昆明',   monthlyCost: 20000, notes: '四季如春，物價合理，進出東南亞方便' },
    { name: '青島',   monthlyCost: 26000, notes: '海濱城市，啤酒節，夏季涼爽' },
    { name: '三亞',   monthlyCost: 30000, notes: '熱帶海灘，冬季避寒首選，旺季人多' },
    { name: '西安',   monthlyCost: 22000, notes: '歷史古都，陝西料理，生活費合理' },
  ]

  const addChinaPresets = async () => {
    for (const preset of CHINA_PRESETS) {
      if (cities.find(c => c.name === preset.name)) continue
      const coords = CITY_DB[preset.name]
      if (!coords) continue
      const id = `city_${Date.now()}_${preset.name}`
      const newCity = {
        id, name: preset.name,
        lng: coords[0], lat: coords[1],
        visited: false,
        monthlyCost: preset.monthlyCost,
        notes: preset.notes,
      }
      setCities(prev => [...prev, newCity])
      await saveCity(newCity)
      await new Promise(r => setTimeout(r, 50))
    }
  }

  // Add city from search
  const addFromSearch = (name) => {
    const coords = CITY_DB[name]
    if (!coords) return
    const id = `city_${Date.now()}`
    const newCity = {
      id, name,
      lng: coords[0], lat: coords[1],
      visited: false, monthlyCost: 0, notes: '',
    }
    setCities(prev => [...prev, newCity])
    saveCity(newCity)
    setSearch('')
    setCenter(coords)
    setZoom(3)
    setSelected(id)
    setDraft(newCity)
  }

  const updateDraft = (key, val) => {
    setDraft(d => ({ ...d, [key]: val }))
  }

  const commitDraft = () => {
    if (!draft) return
    saveCity(draft)
    setCities(prev => prev.map(c => c.id === draft.id ? draft : c))
    setSelected(null)
    setDraft(null)
  }

  const openCity = (city) => {
    setSelected(city.id)
    setDraft({ ...city })
  }

  const filteredSuggestions = search.trim().length >= 1
    ? Object.keys(CITY_DB).filter(n => n.includes(search.trim())).slice(0, 8)
    : []

  const visitedCount = cities.filter(c => c.visited).length
  const wantCount    = cities.filter(c => !c.visited).length

  return (
    <main className="page map-page">
      <div className="page-content" style={{ padding: '2rem 0' }}>
        <div className="container">

          {/* Header */}
          <div className="map__header">
            <div>
              <p className="text-accent" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                旅居地圖
              </p>
              <h1 style={{ marginBottom: 0 }}>想去的地方</h1>
            </div>
            <div className="map__counters">
              <div className="map__counter">
                <div className="map__counter-num" style={{ color: 'var(--accent)' }}>{visitedCount}</div>
                <div className="map__counter-label">已去</div>
              </div>
              <div className="map__counter">
                <div className="map__counter-num">{wantCount}</div>
                <div className="map__counter-label">想去</div>
              </div>
            </div>
          </div>

          {offline && (
            <div className="map__offline">
              Firebase 離線中 — 顯示快取資料，變更待下次連線時同步
            </div>
          )}

          {/* Search bar */}
          <div className="map__search-wrap">
            <input
              type="text"
              className="map__search"
              placeholder="搜尋城市新增標記（例：東京、里斯本）"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {filteredSuggestions.length > 0 && (
              <ul className="map__suggestions">
                {filteredSuggestions.map(name => (
                  <li key={name} onClick={() => addFromSearch(name)}>
                    {name}
                    {cities.find(c => c.name === name) && (
                      <span className="map__suggestion-exists">已標記</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* China preset button */}
          {cities.filter(c => CHINA_PRESETS.some(p => p.name === c.name)).length < CHINA_PRESETS.length && (
            <div className="map__preset-bar">
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                第一步先走遍中國？
              </span>
              <button className="btn btn-ghost btn-sm" onClick={addChinaPresets}>
                ＋ 一鍵新增中國旅居推薦城市（10個）
              </button>
            </div>
          )}

          <div className="map__layout">
            {/* Map */}
            <div className="map__canvas-wrap card">
              {loading ? (
                <div className="map__loading">載入中…</div>
              ) : (
                <ComposableMap
                  projection="geoNaturalEarth1"
                  projectionConfig={{ scale: 145 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <ZoomableGroup
                    zoom={zoom}
                    center={center}
                    onMoveEnd={({ zoom: z, coordinates }) => {
                      setZoom(z); setCenter(coordinates)
                    }}
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
                              hover:   { fill: '#d8cfc5', outline: 'none' },
                              pressed: { outline: 'none' },
                            }}
                          />
                        ))
                      }
                    </Geographies>

                    {cities.map(city => (
                      <Marker
                        key={city.id}
                        coordinates={[city.lng, city.lat]}
                        onClick={() => openCity(city)}
                      >
                        {city.visited ? (
                          // Visited: solid coral circle
                          <circle
                            r={5 / zoom}
                            fill="var(--accent)"
                            stroke="white"
                            strokeWidth={1 / zoom}
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          // Want-to-go: hollow dashed circle
                          <>
                            <circle
                              r={5 / zoom}
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth={1.5 / zoom}
                              strokeDasharray={`${3/zoom},${2/zoom}`}
                              style={{ cursor: 'pointer' }}
                            />
                            <circle r={1.5 / zoom} fill="var(--accent)" />
                          </>
                        )}
                        <title>{city.name}</title>
                      </Marker>
                    ))}
                  </ZoomableGroup>
                </ComposableMap>
              )}

              {/* Zoom controls */}
              <div className="map__zoom">
                <button onClick={() => setZoom(z => Math.min(z * 1.5, 20))}>+</button>
                <button onClick={() => setZoom(z => Math.max(z / 1.5, 1))}>−</button>
                <button onClick={() => { setZoom(1); setCenter([20, 10]) }}>⌂</button>
              </div>

              {/* Legend */}
              <div className="map__legend">
                <div className="map__legend-item">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="5" fill="var(--accent)" />
                  </svg>
                  已去
                </div>
                <div className="map__legend-item">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3,2" />
                    <circle cx="7" cy="7" r="1.5" fill="var(--accent)" />
                  </svg>
                  想去
                </div>
              </div>
            </div>

            {/* City list / detail panel */}
            <div className="map__sidebar">
              {draft && selected ? (
                // City detail editor
                <div className="card map__detail">
                  <div className="map__detail-header">
                    <h3>{draft.name}</h3>
                    <button className="map__detail-close" onClick={() => { setSelected(null); setDraft(null) }}>×</button>
                  </div>

                  <div className="map__detail-status">
                    <button
                      className={`map__status-btn${!draft.visited ? ' map__status-btn--active' : ''}`}
                      onClick={() => updateDraft('visited', false)}
                    >
                      ○ 想去
                    </button>
                    <button
                      className={`map__status-btn${draft.visited ? ' map__status-btn--active' : ''}`}
                      onClick={() => updateDraft('visited', true)}
                    >
                      ● 已去
                    </button>
                  </div>

                  <div className="map__detail-field">
                    <label>估算月生活費（TWD）</label>
                    <input
                      type="number"
                      value={draft.monthlyCost}
                      onChange={e => updateDraft('monthlyCost', parseInt(e.target.value) || 0)}
                      placeholder="例：35000"
                      step="1000"
                    />
                    {draft.monthlyCost > 0 && (
                      <p className="map__cost-hint">
                        年開銷約 {(draft.monthlyCost * 12 / 10000).toFixed(1)} 萬 TWD
                      </p>
                    )}
                  </div>

                  <div className="map__detail-field">
                    <label>備忘筆記</label>
                    <textarea
                      value={draft.notes}
                      onChange={e => updateDraft('notes', e.target.value)}
                      placeholder="幾行備忘即可…"
                      rows={4}
                    />
                  </div>

                  <div className="map__detail-actions">
                    <button className="btn btn-primary btn-sm" onClick={commitDraft}>
                      儲存
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => removeCity(draft.id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ) : (
                // City list
                <div className="map__list">
                  {cities.length === 0 ? (
                    <div className="map__empty card">
                      <p>還沒有標記任何城市</p>
                      <p className="text-muted">在上方搜尋框輸入城市名稱開始新增</p>
                    </div>
                  ) : (
                    <>
                      {cities.filter(c => c.visited).length > 0 && (
                        <>
                          <div className="map__list-section">已去</div>
                          {cities.filter(c => c.visited).map(city => (
                            <CityCard key={city.id} city={city} onSelect={() => openCity(city)} />
                          ))}
                        </>
                      )}
                      {cities.filter(c => !c.visited).length > 0 && (
                        <>
                          <div className="map__list-section">想去</div>
                          {cities.filter(c => !c.visited).map(city => (
                            <CityCard key={city.id} city={city} onSelect={() => openCity(city)} />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function CityCard({ city, onSelect }) {
  return (
    <div className="map__city-card card" onClick={onSelect}>
      <div className="map__city-left">
        <div className={`map__city-dot${city.visited ? ' map__city-dot--visited' : ''}`} />
        <div>
          <div className="map__city-name">{city.name}</div>
          {city.monthlyCost > 0 && (
            <div className="map__city-cost">
              {city.monthlyCost.toLocaleString()} TWD/月
            </div>
          )}
        </div>
      </div>
      {city.notes && (
        <div className="map__city-notes">{city.notes.slice(0, 40)}{city.notes.length > 40 ? '…' : ''}</div>
      )}
    </div>
  )
}
