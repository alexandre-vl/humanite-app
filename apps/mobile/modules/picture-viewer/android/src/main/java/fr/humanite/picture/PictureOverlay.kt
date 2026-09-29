package fr.humanite.picture

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityEvent
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.os.Build
import android.window.BackEvent
import android.window.OnBackAnimationCallback
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.bumptech.glide.Glide
import com.bumptech.glide.load.model.GlideUrl
import com.bumptech.glide.load.model.LazyHeaders
import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import kotlin.math.roundToInt

/** The translucent native activity keeps the article mounted behind its photograph. */
internal class PictureOverlay(
  private val activity: ComponentActivity,
  private val source: ImageView,
  private val uri: String,
  private val headers: Map<String, String>,
  private val words: Map<String, String>,
  private val onDisposed: () -> Unit,
) {
  private val host = activity.window.decorView as ViewGroup
  private val root = FrameLayout(activity)
  private val backdrop = View(activity).apply { setBackgroundColor(Color.BLACK) }
  private val photo = ZoomPicture(activity)
  private val chrome = FrameLayout(activity)
  private val close = ImageButton(activity)
  private val caption = LinearLayout(activity)
  private val previousAccessibility = mutableMapOf<View, Int>()
  private val controller = WindowCompat.getInsetsController(activity.window, host)
  private var wasStatusVisible = true
  private var wasNavigationVisible = true
  private var previousBehavior = controller.systemBarsBehavior
  private var previousLightStatus = controller.isAppearanceLightStatusBars
  private var previousLightNavigation = controller.isAppearanceLightNavigationBars
  private var animation: ValueAnimator? = null
  private var disposed = false
  private var closing = false
  private var controlsVisible = true
  private var sourceAlpha = source.alpha
  private var transitionStart = Matrix()
  private var transitionClip = Rect()
  private var backProgress = 0f
  private var returnBackdrop = 1f
  private var returnChrome = 1f
  private var pendingDrawable: Drawable? = null
  private var entering = true
  private val glide = Glide.with(activity)
  private val target = object : CustomTarget<Drawable>() {
    override fun onResourceReady(resource: Drawable, transition: Transition<in Drawable>?) {
      if (disposed || closing) return
      if (entering || photo.zoom > 1f || backProgress > 0f) pendingDrawable = resource
      else photo.replaceDrawable(resource)
    }
    override fun onLoadCleared(placeholder: Drawable?) { pendingDrawable = null }
  }
  private var predictiveBack: OnBackInvokedCallback? = null
  private val back = object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() { dismiss() }
  }

  @android.annotation.TargetApi(34)
  private fun makePredictiveBack() = object : OnBackAnimationCallback {
    override fun onBackStarted(backEvent: BackEvent) {
      if (closing || entering) return
      animation?.cancel()
      photo.prepareForBack()
      returnBackdrop = backdrop.alpha
      returnChrome = chrome.alpha
      transitionStart.set(photo.imageMatrix)
      transitionClip.set(0, 0, root.width, root.height)
      backProgress = 0f
    }
    override fun onBackProgressed(backEvent: BackEvent) {
      if (closing || entering) return
      backProgress = backEvent.progress
      drawReturn(backProgress * 0.85f)
    }
    override fun onBackCancelled() {
      if (closing || entering) return
      val start = backProgress * 0.85f
      animate(start, 0f, { drawReturn(it) }) {
        backProgress = 0f
        photo.clipBounds = null
        photo.interactive = true
        chrome.alpha = if (controlsVisible) 1f else 0f
      }
    }
    override fun onBackInvoked() { dismiss() }
  }

  fun show() {
    val insets = ViewCompat.getRootWindowInsets(host)
    wasStatusVisible = insets?.isVisible(WindowInsetsCompat.Type.statusBars()) != false
    wasNavigationVisible = insets?.isVisible(WindowInsetsCompat.Type.navigationBars()) != false
    for (index in 0 until host.childCount) {
      val view = host.getChildAt(index)
      previousAccessibility[view] = view.importantForAccessibility
      view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    }
    root.isFocusableInTouchMode = true
    ViewCompat.setAccessibilityPaneTitle(root, words["label"])
    root.addView(backdrop, fill())
    root.addView(photo, fill())
    root.addView(chrome, fill())
    photo.contentDescription = words["caption"].takeUnless { it.isNullOrBlank() } ?: words["label"]
    photo.words = words
    photo.onSingleTap = { setControls(!controlsVisible) }
    photo.onZoom = { setControls(false) }
    photo.onDrag = { progress ->
      backdrop.alpha = (1f - progress).coerceAtLeast(0.2f)
      chrome.alpha = (1f - progress * 3f).coerceAtLeast(0f)
    }
    photo.onDismiss = { dismiss() }
    photo.onSettled = {
      backdrop.alpha = 1f
      chrome.alpha = if (controlsVisible) 1f else 0f
      if (photo.zoom == 1f) pendingDrawable?.let { photo.replaceDrawable(it); pendingDrawable = null }
    }
    makeChrome()
    root.setOnApplyWindowInsetsListener { _, nativeInsets ->
      val safe = WindowInsetsCompat.toWindowInsetsCompat(nativeInsets).getInsetsIgnoringVisibility(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      chrome.setPadding(safe.left, safe.top, safe.right, safe.bottom)
      nativeInsets
    }
    photo.setImageDrawable(source.drawable.constantState?.newDrawable()?.mutate() ?: source.drawable)
    root.alpha = 0f
    host.addView(root, fill())
    root.requestApplyInsets()
    root.requestFocus()
    if (Build.VERSION.SDK_INT >= 33) {
      val callback = if (Build.VERSION.SDK_INT >= 34) makePredictiveBack() else OnBackInvokedCallback { dismiss() }
      predictiveBack = callback
      activity.onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY, callback)
    } else {
      activity.onBackPressedDispatcher.addCallback(back)
    }
    controller.isAppearanceLightStatusBars = false
    controller.isAppearanceLightNavigationBars = false
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    root.addOnLayoutChangeListener { _, _, _, right, bottom, _, _, oldRight, oldBottom ->
      if (!entering && !closing && (right != oldRight || bottom != oldBottom)) {
        animation?.cancel()
        backProgress = 0f
        photo.reset()
        photo.clipBounds = null
        backdrop.alpha = 1f
        chrome.alpha = if (controlsVisible) 1f else 0f
      }
    }
    root.post {
      if (disposed) return@post
      photo.reset()
      val destination = Matrix(photo.imageMatrix)
      val origin = sourceMatrix()
      val crop = sourceClip()
      source.alpha = 0f
      root.alpha = 1f
      photo.interactive = false
      animate(0f, 1f, { progress ->
        morph(origin, destination, crop, Rect(0, 0, root.width, root.height), progress)
        backdrop.alpha = progress
        chrome.alpha = progress
      }) {
        entering = false
        photo.clipBounds = null
        photo.interactive = true
        pendingDrawable?.let { photo.replaceDrawable(it); pendingDrawable = null }
        photo.sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_FOCUSED)
      }
      if (uri.isNotEmpty()) {
        val model = if (uri.startsWith("http")) GlideUrl(uri, LazyHeaders.Builder().apply {
          headers.forEach { (key, value) -> addHeader(key, value) }
        }.build()) else uri
        // Bound decode memory while keeping enough pixels for zoom on a phone. Glide owns the bitmap until disposal.
        glide.load(model).override(4096, 4096).downsample(DownsampleStrategy.AT_MOST).dontTransform().into(target)
      }
    }
  }

  private fun makeChrome() {
    close.contentDescription = words["close"]
    close.setImageDrawable(CloseDrawable())
    close.background = android.graphics.drawable.RippleDrawable(
      android.content.res.ColorStateList.valueOf(0x44ffffff),
      GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(0xcc202020.toInt()) },
      null,
    )
    close.setPadding(dp(14), dp(14), dp(14), dp(14))
    close.setOnClickListener { dismiss() }
    chrome.addView(close, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.END).apply {
      topMargin = dp(8); marginEnd = dp(16)
    })
    caption.orientation = LinearLayout.VERTICAL
    caption.setPadding(dp(24), dp(32), dp(24), dp(24))
    caption.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(Color.TRANSPARENT, 0xdd000000.toInt()))
    listOf("caption", "credit").forEach { key ->
      words[key]?.takeIf { it.isNotBlank() }?.let { value ->
        caption.addView(TextView(activity).apply {
          text = value
          setTextColor(if (key == "caption") Color.WHITE else 0xffcccccc.toInt())
          textSize = if (key == "caption") 16f else 13f
          maxLines = if (key == "caption") 4 else 2
          ellipsize = android.text.TextUtils.TruncateAt.END
          if (key == "credit") setPadding(0, dp(8), 0, 0)
        })
      }
    }
    if (caption.childCount > 0) chrome.addView(caption, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))
  }

  private fun setControls(visible: Boolean) {
    if (disposed || closing || entering) return
    controlsVisible = visible
    photo.controlsVisible = visible
    chrome.importantForAccessibility = if (visible) View.IMPORTANT_FOR_ACCESSIBILITY_AUTO else View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    close.isClickable = visible
    chrome.animate().alpha(if (visible) 1f else 0f).setDuration(160).start()
    if (visible) controller.show(WindowInsetsCompat.Type.systemBars())
    else controller.hide(WindowInsetsCompat.Type.systemBars())
  }

  private fun sourceMatrix(): Matrix {
    val location = IntArray(2)
    val origin = IntArray(2)
    source.getLocationOnScreen(location)
    root.getLocationOnScreen(origin)
    val original = source.drawable
    val current = photo.drawable
    return Matrix().apply {
      // The fullscreen decode may be larger than the thumbnail's cached drawable.
      setScale(original.intrinsicWidth.toFloat() / current.intrinsicWidth, original.intrinsicHeight.toFloat() / current.intrinsicHeight)
      postConcat(source.imageMatrix)
      postTranslate((location[0] - origin[0] + source.paddingLeft).toFloat(), (location[1] - origin[1] + source.paddingTop).toFloat())
    }
  }

  private fun sourceClip(): Rect {
    val rect = Rect()
    val location = IntArray(2)
    source.getGlobalVisibleRect(rect)
    root.getLocationOnScreen(location)
    rect.offset(-location[0], -location[1])
    return rect
  }

  private fun drawReturn(progress: Float) {
    val destination = if (source.isAttachedToWindow) sourceMatrix() else transitionStart
    val crop = if (source.isAttachedToWindow) sourceClip() else transitionClip
    morph(transitionStart, destination, transitionClip, crop, progress)
    backdrop.alpha = returnBackdrop * (1f - progress)
    chrome.alpha = returnChrome * (1f - progress)
  }

  fun dismiss() {
    if (disposed || closing) return
    closing = true
    animation?.cancel()
    chrome.animate().cancel()
    photo.stopMotion()
    photo.interactive = false
    returnBackdrop = backdrop.alpha
    returnChrome = chrome.alpha
    transitionStart.set(photo.imageMatrix)
    transitionClip.set(photo.clipBounds ?: Rect(0, 0, root.width, root.height))
    backProgress = 0f
    animate(0f, 1f, { drawReturn(it) }) { dispose() }
  }

  private fun morph(from: Matrix, to: Matrix, fromClip: Rect, toClip: Rect, progress: Float) {
    val first = FloatArray(9).also { from.getValues(it) }
    val last = FloatArray(9).also { to.getValues(it) }
    photo.imageMatrix = Matrix().apply { setValues(FloatArray(9) { first[it] + (last[it] - first[it]) * progress }) }
    fun mix(a: Int, b: Int) = (a + (b - a) * progress).roundToInt()
    photo.clipBounds = Rect(mix(fromClip.left, toClip.left), mix(fromClip.top, toClip.top), mix(fromClip.right, toClip.right), mix(fromClip.bottom, toClip.bottom))
  }

  private fun animate(from: Float, to: Float, update: (Float) -> Unit, end: () -> Unit) {
    animation?.cancel()
    animation = ValueAnimator.ofFloat(from, to).apply {
      duration = 280
      interpolator = PathInterpolator(0.2f, 0f, 0f, 1f)
      addUpdateListener { update(it.animatedValue as Float) }
      addListener(object : AnimatorListenerAdapter() {
        private var cancelled = false
        override fun onAnimationCancel(animation: Animator) { cancelled = true }
        override fun onAnimationEnd(animation: Animator) { if (!cancelled && !disposed) end() }
      })
      start()
    }
  }

  fun dispose() {
    if (disposed) return
    disposed = true
    animation?.cancel()
    photo.stopMotion()
    chrome.animate().cancel()
    back.remove()
    if (Build.VERSION.SDK_INT >= 33) predictiveBack?.let { activity.onBackInvokedDispatcher.unregisterOnBackInvokedCallback(it) }
    predictiveBack = null
    source.alpha = sourceAlpha
    host.removeView(root)
    previousAccessibility.forEach { (view, importance) -> view.importantForAccessibility = importance }
    previousAccessibility.clear()
    controller.systemBarsBehavior = previousBehavior
    controller.isAppearanceLightStatusBars = previousLightStatus
    controller.isAppearanceLightNavigationBars = previousLightNavigation
    if (wasStatusVisible) controller.show(WindowInsetsCompat.Type.statusBars()) else controller.hide(WindowInsetsCompat.Type.statusBars())
    if (wasNavigationVisible) controller.show(WindowInsetsCompat.Type.navigationBars()) else controller.hide(WindowInsetsCompat.Type.navigationBars())
    photo.setImageDrawable(null)
    glide.clear(target)
    onDisposed()
  }

  private fun dp(value: Int) = (value * activity.resources.displayMetrics.density).roundToInt()
  private fun fill() = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
}
