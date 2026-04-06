import './Philosophy.css'

export default function Philosophy() {
  return (
    <main className="page">
      <div className="page-content">
        <div className="container-narrow">
          <p className="philo__eyebrow text-accent">理念</p>
          <h1 className="philo__title">夠了，是一個數字，<br />也是一個決定。</h1>

          <div className="philo__body">
            <p>
              大多數人花一生追求更多，卻從來沒有認真算過：自己究竟需要多少？
            </p>

            <div className="philo__divider" />

            <p>
              「夠了」不是放棄，不是躺平。它是一道數學題——當你的資產複利速度超過你的生活需求，繼續用時間換薪水就成了一筆<em>虧本的交易</em>。
            </p>

            <div className="philo__divider" />

            <p>
              這個模擬器存在的理由只有一個：<strong>幫你找到那條線。</strong>
            </p>
            <p>
              跨過去之前，你需要知道數字。<br />
              跨過去之後，數字就不再重要了。
            </p>
          </div>

          <div className="philo__quote">
            <blockquote>
              「財務獨立不是終點，是一個選擇的開始。」
            </blockquote>
          </div>

          {/* Three principles */}
          <div className="philo__principles">
            <div className="philo__principle">
              <div className="philo__principle-num">01</div>
              <h3>算清楚</h3>
              <p>你不需要最樂觀的假設，你需要4,000種情境都能撐住的數字。蒙地卡羅不是悲觀主義，是務實。</p>
            </div>
            <div className="philo__principle">
              <div className="philo__principle-num">02</div>
              <h3>動態調整</h3>
              <p>市場壞的時候少花一點，市場好的時候不用刻意克制。Guyton-Klinger規則讓提領策略跟著現實走。</p>
            </div>
            <div className="philo__principle">
              <div className="philo__principle-num">03</div>
              <h3>夠了就夠了</h3>
              <p>這個工具沒有「最優化提領策略」、沒有「最大化遺產」的功能。因為那不是重點。</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
