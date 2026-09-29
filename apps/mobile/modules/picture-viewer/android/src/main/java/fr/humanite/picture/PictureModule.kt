package fr.humanite.picture

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.activity.ComponentActivity
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView

class PictureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HumaPicture")
    View(PictureSource::class) {
      Prop("uri") { view: PictureSource, value: String ->
        if (view.uri != value) view.release()
        view.uri = value
      }
      Prop("headers") { view: PictureSource, value: Map<String, String> -> view.headers = value }
      Prop("words") { view: PictureSource, value: Map<String, String> -> view.words = value }
      OnViewDestroys { view: PictureSource -> view.release() }
    }
  }
}

/** Owns the source, so recycling or unmounting cannot leave a viewer pointing at another photograph. */
class PictureSource(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var uri = ""
  var headers: Map<String, String> = emptyMap()
  var words: Map<String, String> = emptyMap()
  private var viewer: PictureSession? = null

  init {
    isClickable = true
    isFocusable = true
    setOnClickListener {
      val activity = appContext.currentActivity as? ComponentActivity ?: return@setOnClickListener
      if (viewer != null || activity.isFinishing || activity.isDestroyed) return@setOnClickListener
      val image = findImage(this) ?: return@setOnClickListener
      val session = PictureSession(image, uri, headers, words) { viewer = null }
      viewer = session
      PictureActivity.open(activity, session)
    }
  }

  // Android's click recognition retains touch slop, cancellation by the article's scroll, and TalkBack activation.
  override fun onInterceptTouchEvent(event: MotionEvent) = true

  override fun getAccessibilityClassName(): CharSequence = "android.widget.Button"

  fun release() {
    viewer?.release()
    viewer = null
  }

  override fun onDetachedFromWindow() {
    release()
    super.onDetachedFromWindow()
  }

  private fun findImage(view: View): ImageView? {
    if (view is ImageView && view.visibility == View.VISIBLE && view.drawable != null) return view
    if (view is ViewGroup) {
      for (index in view.childCount - 1 downTo 0) {
        findImage(view.getChildAt(index))?.let { return it }
      }
    }
    return null
  }
}
