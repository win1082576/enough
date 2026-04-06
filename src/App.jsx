import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Philosophy from './pages/Philosophy'
import Simulator from './pages/Simulator'
import TravelMap from './pages/TravelMap'
import About from './pages/About'
import FAQ from './pages/FAQ'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/philosophy" element={<Philosophy />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/map" element={<TravelMap />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </>
  )
}
