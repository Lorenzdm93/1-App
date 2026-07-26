/**
 * The persistent player dock. Screens remount on every tab switch (the shell
 * keys its view by tab for transitions), which killed any iframe living in
 * the tree. This component mounts once at App level, outside the keyed view,
 * and simply follows the route: visible anywhere inside RESPIRO, gone when
 * you leave the module. The iframe never remounts between RESPIRO tabs, so
 * the music keeps playing while you practise.
 */
import { useStore } from '../../core/hooks'
import { useRoute } from '../../core/router'
import {
  respiroStore,
  setDock,
  parseSpotify,
  parseYouTube,
  spotifyEmbedUrl,
  youtubeEmbedUrl,
} from './model'

export default function RespiroDock() {
  const route = useRoute()
  const st = useStore(respiroStore)
  const dock = st.dock
  const inRespiro = route.name === 'module' && route.id === 'respiro'
  if (!inRespiro || !dock) return null
  const ref = dock.kind === 'youtube' ? parseYouTube(dock.url) : parseSpotify(dock.url)
  if (!ref) return null
  return (
    <div className="rp2 rp2-dock">
      {dock.kind === 'youtube' ? (
        <iframe
          className="yt"
          src={youtubeEmbedUrl(ref)}
          allow="autoplay; encrypted-media; picture-in-picture"
          title="YouTube player"
        />
      ) : (
        <iframe
          className="sp"
          src={spotifyEmbedUrl(ref)}
          height={80}
          allow="encrypted-media"
          title="Spotify player"
        />
      )}
      <button className="close" onClick={() => setDock(null)} aria-label="Close player">✕</button>
    </div>
  )
}
