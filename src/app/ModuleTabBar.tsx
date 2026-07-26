import { navigate } from '../core/router'
import { useTabGlider } from './TabBar'
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
  const { innerRef, glider } = useTabGlider(String((typeof location !== 'undefined' ? location.hash : '')))
  return (
    <nav className="tabbar tabbar-mod" aria-label="Module" style={{ ['--tb-accent' as string]: `var(--m-${moduleId})` }}>
      <div className="tabbar-inner" ref={innerRef}>
        {glider && (
          <span
            className="tab-glider"
            aria-hidden="true"
            style={{ transform: `translateX(${glider.x}px)`, width: glider.w }}
          />
        )}
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'tab' + (t.id === active ? ' on' : '')}
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
