import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './Navbar.css'

const links = [
  { to: '/philosophy', label: '理念' },
  { to: '/map',        label: '旅居地圖' },
  { to: '/faq',        label: '概念' },
  { to: '/about',      label: '關於' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <NavLink to="/" className="navbar__logo">
          夠了<span>Enough</span>
        </NavLink>

        {/* Desktop links */}
        <ul className="navbar__links">
          {links.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) => isActive ? 'navbar__link navbar__link--active' : 'navbar__link'}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          className={`navbar__burger${open ? ' navbar__burger--open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="選單"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`navbar__drawer${open ? ' navbar__drawer--open' : ''}`}>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => isActive ? 'navbar__drawer-link navbar__drawer-link--active' : 'navbar__drawer-link'}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
