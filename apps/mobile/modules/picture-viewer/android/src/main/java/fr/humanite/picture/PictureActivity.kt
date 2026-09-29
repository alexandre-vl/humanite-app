package fr.humanite.picture

import android.content.Intent
import android.os.Bundle
import android.widget.ImageView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import java.util.UUID

/** A transient session, never persisted: after process death the article is the safe destination. */
internal class PictureSession(
  val source: ImageView,
  val uri: String,
  val headers: Map<String, String>,
  val words: Map<String, String>,
  private val onReleased: () -> Unit,
) {
  val id = UUID.randomUUID().toString()
  var screen: PictureActivity? = null
  private var released = false

  fun release() {
    if (released) return
    released = true
    PictureActivity.pending.remove(id)
    val current = screen
    screen = null
    current?.finishPicture()
    onReleased()
  }
}

/** Only this activity opts into predictive back; React Native keeps its existing back handling. */
class PictureActivity : ComponentActivity() {
  internal companion object {
    val pending = mutableMapOf<String, PictureSession>()
    fun open(activity: ComponentActivity, session: PictureSession) {
      pending[session.id] = session
      activity.startActivity(Intent(activity, PictureActivity::class.java).putExtra("session", session.id))
      activity.overridePendingTransition(0, 0)
    }
  }
  private var session: PictureSession? = null
  private var overlay: PictureOverlay? = null

  override fun onCreate(state: Bundle?) {
    super.onCreate(state)
    val found = pending.remove(intent.getStringExtra("session"))
    if (found == null || !found.source.isAttachedToWindow) { finishPicture(); return }
    session = found
    found.screen = this
    WindowCompat.setDecorFitsSystemWindows(window, false)
    overlay = PictureOverlay(this, found.source, found.uri, found.headers, found.words) { found.release() }
    overlay?.show()
  }

  internal fun finishPicture() {
    overlay?.dispose()
    overlay = null
    finish()
    overridePendingTransition(0, 0)
  }

  override fun onDestroy() {
    overlay?.dispose()
    overlay = null
    session?.release()
    session = null
    super.onDestroy()
  }
}
