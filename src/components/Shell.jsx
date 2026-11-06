import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session'
import { DataProvider } from '../lib/data'
import { t, L } from '../lib/i18n'
import InstallBanner from './InstallBanner'
const tabs = [['/home', 'navToday'], ['/journey', 'navJourney'], ['/routine', 'navRoutine'], ['/offers', 'navOffers'], ['/ask', 'navAsk']]
const groups = [
  { label: 'Routine sections', items: [['/routine', 'Setup'], ['/refill', 'Refill & cost']] },
  { label: 'Journey sections', items: [['/journey', 'Timeline'], ['/progress', 'Photos & ratings'], ['/goal', 'Goal preview']] },
  { label: 'Offer sections', items: [['/offers', 'Offers'], ['/rewards', 'Rewards'], ['/student', 'Student']] },
]
const parent = { '/refill': '/routine', '/progress': '/journey', '/goal': '/journey', '/rewards': '/offers', '/student': '/offers' }
export default function Shell() {
  const { lang } = useSession()
  const { pathname } = useLocation()
  const group = groups.find((g) => g.items.some(([to]) => to === pathname))
  return (
    <DataProvider>
      <div className="pb-24">
        <InstallBanner />
        {group && (
          <div className="px-5 pt-5 flex gap-2 flex-wrap" role="group" aria-label={group.label}>
            {group.items.map(([to, l]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `px-4 py-2 rounded-full text-sm border ${isActive ? 'bg-ink text-paper border-ink' : 'border-ink/25'}`}>{L(l)}</NavLink>
            ))}
          </div>
        )}
        <Outlet />
        <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]" aria-label="Main">
          <div className="flex rounded-2xl bg-ink/95 backdrop-blur p-1.5 shadow-2xl">
            {tabs.map(([to, k]) => (
              <NavLink key={to} to={to} className={({ isActive }) => {
                const on = isActive || parent[pathname] === to
                return `flex-1 text-center py-3 px-1 rounded-xl text-sm font-medium ${on ? 'bg-amber text-ink' : 'text-paper/70'}`
              }}>{t(lang, k)}</NavLink>
            ))}
          </div>
        </nav>
      </div>
    </DataProvider>
  )
}
