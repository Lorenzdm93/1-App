/**
 * Quick log — the capture entry point on Today. A slim bar opens a sheet: type
 * what you did, the parser turns it into reviewable draft chips, you deselect
 * anything wrong, and only then is it written. Nothing is ever logged blind.
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Sheet } from './ui'
import { toast } from '../core/toast'
import { parseCapture, applyDrafts, draftChrome, type CaptureDraft } from './capture'
import { t } from '../core/i18n'

export default function QuickLog() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<CaptureDraft[]>([])
  const [off, setOff] = useState<Set<string>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(false)

  function reset() {
    setText(''); setDrafts([]); setOff(new Set()); setParsed(false); setParsing(false)
  }
  function close() {
    setOpen(false)
    setTimeout(reset, 250)
  }

  async function doParse() {
    const t = text.trim()
    if (!t) return
    setParsing(true)
    const ds = await parseCapture(t)
    setDrafts(ds); setOff(new Set()); setParsed(true); setParsing(false)
  }

  function toggle(id: string) {
    setOff((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selected = drafts.filter((d) => !off.has(d.id))
  function commit() {
    if (!selected.length) return
    applyDrafts(selected)
    toast(`Logged ${selected.length} ${selected.length === 1 ? 'entry' : 'entries'}`)
    close()
  }

  return (
    <>
      <button className="qlog-bar" onClick={() => setOpen(true)} aria-label="Quick log">
        <span className="qlog-plus" aria-hidden="true">+</span>
        <span className="qlog-ph">{t('Log what you did…')}</span>
      </button>

      <Sheet open={open} title={t('Quick log')} onClose={close}>
        <div className="qlog">
          <div className="qlog-inrow">
            <input
              className="ai-in"
              autoFocus
              placeholder={t('e.g. squat 5x5 100kg, meditated 10 min')}
              value={text}
              onChange={(e) => { setText(e.target.value); setParsed(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void doParse() } }}
            />
            <button className="btn btn-primary qlog-go" onClick={() => void doParse()} disabled={!text.trim() || parsing}>
              {parsing ? '…' : t('Read')}
            </button>
          </div>

          {parsed && drafts.length === 0 && (
            <p className="qlog-empty">
              {t("Couldn't read that. Try “25 min focus”, “squat 5x5 100kg”, or the name of a habit or supplement you track.")}
            </p>
          )}

          {drafts.length > 0 && (
            <>
              <div className="qlog-drafts">
                {drafts.map((d) => {
                  const c = draftChrome(d)
                  const on = !off.has(d.id)
                  return (
                    <button
                      key={d.id}
                      className={'qlog-chip' + (on ? ' on' : '')}
                      style={{ ['--wc' as string]: c.accent } as CSSProperties}
                      onClick={() => toggle(d.id)}
                    >
                      <span className="qlog-chip-mod">{c.name}</span>
                      <span className="qlog-chip-detail">{d.detail}</span>
                      <span className="qlog-chip-mark" aria-hidden="true">{on ? '✓' : '+'}</span>
                    </button>
                  )
                })}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14 }}
                onClick={commit}
                disabled={selected.length === 0}
              >
                {selected.length === 1 ? t('Log one entry') : t('Log {n} entries', { n: selected.length })}
              </button>
              <p className="qlog-hint">{t('Tap a card to include or skip it. Nothing is saved until you log.')}</p>
            </>
          )}
        </div>
      </Sheet>
    </>
  )
}
