import { navigate } from '../core/router'
import type { ModuleTab } from '../core/types'

/**
 * Replaces the global tab bar while inside a module that declares tabs.
 * Text-only, accent-underlined — the module is a small app of its own.
 */
export default function ModuleTabBar({
  moduleId,
  tabs,
  active,
}: {
  moduleId: string
  tabs: readonly ModuleTab[]
  active: string
}) {
  return (
    <nav className="tabbar tabbar-mod" aria-label="Module">
      <div className="tabbar-inner">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'mtab' + (t.id === active ? ' on' : '')}
            onClick={() => navigate(`/m/${moduleId}/${t.id}`)}
            aria-current={t.id === active ? 'page' : undefined}
          >
            {t.Icon && <t.Icon size={18} />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
