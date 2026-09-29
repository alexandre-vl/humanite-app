package fr.humanite.picture

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.ViewConfiguration
import android.view.accessibility.AccessibilityNodeInfo
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.OverScroller
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

internal class CloseDrawable : Drawable() {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
  }
  override fun draw(canvas: Canvas) {
    paint.strokeWidth = bounds.width() / 10f
    val inset = bounds.width() * 0.15f
    canvas.drawLine(bounds.left + inset, bounds.top + inset, bounds.right - inset, bounds.bottom - inset, paint)
    canvas.drawLine(bounds.right - inset, bounds.top + inset, bounds.left + inset, bounds.bottom - inset, paint)
  }
  override fun setAlpha(alpha: Int) { paint.alpha = alpha }
  override fun setColorFilter(filter: ColorFilter?) { paint.colorFilter = filter }
  @Deprecated("Deprecated in Android")
  override fun getOpacity() = PixelFormat.TRANSLUCENT
}

/** Native detectors, matrix and scroller: gesture frames never cross the JavaScript bridge. */
internal class ZoomPicture(context: Context) : ImageView(context) {
  var words: Map<String, String> = emptyMap()
  var onSingleTap: () -> Unit = {}
  var onZoom: () -> Unit = {}
  var onDismiss: () -> Unit = {}
  var onDrag: (Float) -> Unit = {}
  var onSettled: () -> Unit = {}
  var interactive = true
  var controlsVisible = true
  var zoom = 1f
    private set
  private var base = 1f
  private var dx = 0f
  private var dy = 0f
  private var dragX = 0f
  private var dragY = 0f
  private var lastFocusX = 0f
  private var lastFocusY = 0f
  private var multiTouch = false
  private var dragging = false
  private var motion: ValueAnimator? = null
  private val scroller = OverScroller(context)
  private val slop = ViewConfiguration.get(context).scaledTouchSlop

  private val pinch = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
    override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
      stopMotion()
      multiTouch = true
      dragX = 0f
      dragY = 0f
      dragging = false
      lastFocusX = detector.focusX
      lastFocusY = detector.focusY
      onZoom()
      return true
    }
    override fun onScale(detector: ScaleGestureDetector): Boolean {
      val next = (zoom * detector.scaleFactor).coerceIn(1f, 4f)
      val change = next / zoom
      dx = detector.focusX - width / 2f - (lastFocusX - width / 2f - dx) * change
      dy = detector.focusY - height / 2f - (lastFocusY - height / 2f - dy) * change
      zoom = next
      lastFocusX = detector.focusX
      lastFocusY = detector.focusY
      render()
      return true
    }
  }).apply { isQuickScaleEnabled = false }

  private val gestures = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
    override fun onDown(event: MotionEvent): Boolean = true
    override fun onSingleTapConfirmed(event: MotionEvent): Boolean { performClick(); return true }
    override fun onDoubleTap(event: MotionEvent): Boolean {
      if (multiTouch) return true
      onZoom()
      val next = if (zoom > 1.01f) 1f else 2.5f
      val factor = next / zoom
      animateTo(next, (dx + width / 2f - event.x) * factor + event.x - width / 2f,
        (dy + height / 2f - event.y) * factor + event.y - height / 2f)
      return true
    }
    override fun onScroll(first: MotionEvent?, current: MotionEvent, distanceX: Float, distanceY: Float): Boolean {
      if (pinch.isInProgress || multiTouch) return true
      if (zoom > 1.01f) {
        dx -= distanceX
        dy -= distanceY
        render()
      } else {
        dragX -= distanceX
        dragY -= distanceY
        dragging = dragging || (abs(dragY) > slop && abs(dragY) > abs(dragX))
        if (dragging) renderDrag()
      }
      return true
    }
    override fun onFling(first: MotionEvent?, last: MotionEvent, velocityX: Float, velocityY: Float): Boolean {
      if (multiTouch || zoom <= 1.01f) return false
      val horizontal = max(0f, drawable.intrinsicWidth * base * zoom - width) / 2f
      val vertical = max(0f, drawable.intrinsicHeight * base * zoom - height) / 2f
      scroller.fling(dx.roundToInt(), dy.roundToInt(), velocityX.roundToInt(), velocityY.roundToInt(),
        -horizontal.roundToInt(), horizontal.roundToInt(), -vertical.roundToInt(), vertical.roundToInt())
      postInvalidateOnAnimation()
      return true
    }
  })

  init {
    scaleType = ScaleType.MATRIX
    isClickable = true
    isFocusable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    if (drawable != null) reset()
  }

  fun replaceDrawable(value: Drawable) {
    setImageDrawable(value)
    reset()
  }

  fun reset() {
    stopMotion()
    zoom = 1f
    dx = 0f; dy = 0f; dragX = 0f; dragY = 0f
    if (drawable == null || width <= 0 || height <= 0) return
    base = min(width.toFloat() / drawable.intrinsicWidth, height.toFloat() / drawable.intrinsicHeight)
    render()
  }

  private fun render() {
    if (drawable == null) return
    val horizontal = max(0f, drawable.intrinsicWidth * base * zoom - width) / 2f
    val vertical = max(0f, drawable.intrinsicHeight * base * zoom - height) / 2f
    dx = dx.coerceIn(-horizontal, horizontal)
    dy = dy.coerceIn(-vertical, vertical)
    imageMatrix = Matrix().apply {
      setScale(base * zoom, base * zoom)
      postTranslate((width - drawable.intrinsicWidth * base * zoom) / 2f + dx,
        (height - drawable.intrinsicHeight * base * zoom) / 2f + dy)
    }
  }

  private fun renderDrag() {
    render()
    val progress = (abs(dragY) / (height * 0.6f)).coerceIn(0f, 1f)
    imageMatrix = Matrix(imageMatrix).apply {
      postScale(1f - progress * 0.2f, 1f - progress * 0.2f, width / 2f, height / 2f)
      postTranslate(dragX * 0.5f, dragY)
    }
    onDrag(progress)
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!interactive) return true
    // GestureDetector invokes onDoubleTap before onDown for the second tap. Cancel old motion before dispatch,
    // otherwise onDown cancels the zoom animation that onDoubleTap has just started.
    if (event.actionMasked == MotionEvent.ACTION_DOWN) { stopMotion(); multiTouch = false; dragging = false }
    if (event.pointerCount > 1) multiTouch = true
    pinch.onTouchEvent(event)
    gestures.onTouchEvent(event)
    if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
      if (dragging && !multiTouch && event.actionMasked != MotionEvent.ACTION_CANCEL && abs(dragY) > height * 0.16f) {
        onDismiss()
      } else if (dragging) {
        val startX = dragX; val startY = dragY
        animate { progress -> dragX = startX * (1f - progress); dragY = startY * (1f - progress); renderDrag() }
      } else if (zoom <= 1.01f && motion?.isRunning != true) {
        dragX = 0f; dragY = 0f; zoom = 1f; render(); onSettled()
      }
      dragging = false
    }
    return true
  }

  override fun performClick(): Boolean { super.performClick(); onSingleTap(); return true }

  override fun computeScroll() {
    if (scroller.computeScrollOffset()) {
      dx = scroller.currX.toFloat(); dy = scroller.currY.toFloat()
      render()
      postInvalidateOnAnimation()
    }
  }

  fun stopMotion() { motion?.cancel(); scroller.forceFinished(true) }

  fun prepareForBack() {
    stopMotion()
    dragX = 0f; dragY = 0f; dragging = false
    interactive = false
    render()
  }

  private fun animateTo(nextZoom: Float, nextX: Float, nextY: Float) {
    val startZoom = zoom; val startX = dx; val startY = dy
    animate { progress ->
      zoom = startZoom + (nextZoom - startZoom) * progress
      dx = startX + (nextX - startX) * progress
      dy = startY + (nextY - startY) * progress
      render()
    }
  }

  private fun animate(update: (Float) -> Unit) {
    stopMotion()
    motion = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 230
      interpolator = DecelerateInterpolator()
      addUpdateListener {
        val progress = it.animatedValue as Float
        update(progress)
        if (progress == 1f) onSettled()
      }
      start()
    }
  }

  override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
    super.onInitializeAccessibilityNodeInfo(info)
    info.className = ImageView::class.java.name
    info.addAction(AccessibilityNodeInfo.AccessibilityAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD, words["enlarge"]))
    info.addAction(AccessibilityNodeInfo.AccessibilityAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD, words["reduce"]))
    info.addAction(AccessibilityNodeInfo.AccessibilityAction(AccessibilityNodeInfo.ACTION_DISMISS, words["close"]))
    info.addAction(AccessibilityNodeInfo.AccessibilityAction(AccessibilityNodeInfo.ACTION_CLICK, words[if (controlsVisible) "hideControls" else "showControls"]))
  }

  override fun performAccessibilityAction(action: Int, arguments: Bundle?): Boolean = when (action) {
    AccessibilityNodeInfo.ACTION_SCROLL_FORWARD -> { onZoom(); animateTo((zoom * 2f).coerceAtMost(4f), dx, dy); true }
    AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD -> { animateTo((zoom / 2f).coerceAtLeast(1f), dx, dy); true }
    AccessibilityNodeInfo.ACTION_DISMISS -> { onDismiss(); true }
    else -> super.performAccessibilityAction(action, arguments)
  }
}
