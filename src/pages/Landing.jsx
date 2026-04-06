import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <main className="landing">
      <section className="landing__hero">

        <div className="landing__headline">
          <div className="landing__zh">夠了</div>
          <div className="landing__en">ENOUGH</div>
        </div>

        {/* Illustration: tapered wave line */}
        <div className="landing__illustration" aria-hidden="true">

          {/* Tapered wave line */}
          <svg
            className="landing__line-svg"
            viewBox="0 0 1000 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="lineAlpha" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="white" stopOpacity="0" />
                <stop offset="6%"   stopColor="white" stopOpacity="1" />
                <stop offset="88%"  stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="lineMask">
                <rect x="0" y="0" width="1000" height="80" fill="url(#lineAlpha)" />
              </mask>
            </defs>
            <path
              d="M 0,40 C 150,18 280,62 440,40 C 590,18 700,56 850,36 C 920,28 965,40 1000,40"
              stroke="#1c1410"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              mask="url(#lineMask)"
            />
          </svg>
        </div>

        <p className="landing__tagline">
          你的資產，什麼時候可以讓你停下來？
        </p>

        <button
          className="btn btn-primary landing__cta"
          onClick={() => navigate('/simulator')}
        >
          找到那條線
        </button>

        <div className="landing__scroll-hint" aria-hidden="true">
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="currentColor" strokeWidth="1.5"/>
            <circle className="landing__scroll-dot" cx="8" cy="7" r="2" fill="currentColor"/>
          </svg>
        </div>
      </section>

      <section className="landing__strips container">
        <div className="landing__strip">
          <div className="landing__strip-icon">∑</div>
          <div>
            <h3>蒙地卡羅模擬</h3>
            <p className="text-secondary">4,000 種市場情境，驗證你的數字能不能撐住</p>
          </div>
        </div>
        <div className="landing__strip">
          <div className="landing__strip-icon">⟳</div>
          <div>
            <h3>動態提領規則</h3>
            <p className="text-secondary">Guyton-Klinger 機制，壞年不硬撐，好年不浪費</p>
          </div>
        </div>
        <div className="landing__strip">
          <div className="landing__strip-icon">◎</div>
          <div>
            <h3>旅居地圖</h3>
            <p className="text-secondary">標記想去的地方，連動生活費試算</p>
          </div>
        </div>
      </section>
    </main>
  )
}
