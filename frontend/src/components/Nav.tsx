import { NavLink } from 'react-router-dom'
import { Activity, GitBranch, BarChart2, AlertTriangle } from 'lucide-react'

const links = [
  { to: '/',          label: 'Dashboard',  Icon: Activity      },
  { to: '/workflows', label: 'Workflows',  Icon: GitBranch     },
  { to: '/analytics', label: 'Analytics',  Icon: BarChart2     },
  { to: '/anomalies', label: 'Anomalies',  Icon: AlertTriangle },
]

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                    px-8 h-14 border-b border-border bg-bg/90 backdrop-blur-sm">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-accent" style={{ clipPath: 'polygon(50% 0%,100% 100%,0% 100%)' }} />
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-text uppercase">
          FlowForge
        </span>
        <span className="label ml-2 hidden sm:block">API Reliability Platform</span>
      </div>

      {/* Links */}
      <div className="flex items-center gap-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 font-mono text-2xs tracking-widest uppercase
               transition-colors duration-150 border border-transparent
               ${isActive
                 ? 'text-accent border-accent/30 bg-accent-dim'
                 : 'text-text-dim hover:text-text hover:border-border'}`
            }
          >
            <Icon size={12} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 label">
        <span className="dot-live" />
        system nominal
      </div>
    </nav>
  )
}
