package fr.humanite.picture

import android.graphics.Bitmap
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import android.os.SystemClock
import android.view.MotionEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/** Runs the actual Android detectors and matrix on the connected device, not a mock gesture implementation. */
class ZoomPictureTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private lateinit var picture: ZoomPicture
  private lateinit var bitmap: Bitmap
  private var time = 0L
  private var dismissed = 0

  @Before fun prepare() = main {
    bitmap = Bitmap.createBitmap(1600, 900, Bitmap.Config.ARGB_8888)
    picture = ZoomPicture(instrumentation.targetContext).apply {
      setImageDrawable(BitmapDrawable(resources, bitmap))
      layout(0, 0, 1080, 2200)
      reset()
      onDismiss = { dismissed++ }
      words = mapOf("enlarge" to "Agrandir", "reduce" to "Réduire", "close" to "Fermer", "hideControls" to "Masquer", "showControls" to "Afficher")
    }
    time = SystemClock.uptimeMillis()
  }

  @After fun release() = main { picture.stopMotion(); picture.setImageDrawable(null); bitmap.recycle() }
  private fun main(action: () -> Unit) = instrumentation.runOnMainSync(action)
  private fun bounds(): RectF = RectF(0f, 0f, 1600f, 900f).also { picture.imageMatrix.mapRect(it) }
  private fun settle() { SystemClock.sleep(350); instrumentation.waitForIdleSync() }

  private fun touch(action: Int, vararg points: Pair<Float, Float>) {
    time += 20
    val properties = Array(points.size) { index -> MotionEvent.PointerProperties().apply { id = index; toolType = MotionEvent.TOOL_TYPE_FINGER } }
    val coordinates = Array(points.size) { index -> MotionEvent.PointerCoords().apply { x = points[index].first; y = points[index].second; pressure = 1f; size = 1f } }
    val event = MotionEvent.obtain(time - 20, time, action, points.size, properties, coordinates, 0, 0, 1f, 1f, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0)
    picture.onTouchEvent(event)
    event.recycle()
  }

  private fun pinch(from: Float, to: Float) {
    touch(MotionEvent.ACTION_DOWN, (540f - from) to 1100f)
    touch(MotionEvent.ACTION_POINTER_DOWN or (1 shl MotionEvent.ACTION_POINTER_INDEX_SHIFT), (540f - from) to 1100f, (540f + from) to 1100f)
    for (step in 1..20) {
      val distance = from + (to - from) * step / 20
      touch(MotionEvent.ACTION_MOVE, (540f - distance) to 1100f, (540f + distance) to 1100f)
    }
    touch(MotionEvent.ACTION_POINTER_UP or (1 shl MotionEvent.ACTION_POINTER_INDEX_SHIFT), (540f - to) to 1100f, (540f + to) to 1100f)
    touch(MotionEvent.ACTION_UP, (540f - to) to 1100f)
  }

  @Test fun fitsWithoutCroppingAndRecentersAfterResize() = main {
    val fit = bounds()
    assertEquals(1080f, fit.width(), 0.1f)
    assertEquals(607.5f, fit.height(), 0.1f)
    assertEquals(1100f, fit.centerY(), 0.1f)
    picture.layout(0, 0, 2200, 1080)
    assertEquals(1080f, bounds().height(), 0.1f)
    assertEquals(1100f, bounds().centerX(), 0.1f)
  }

  @Test fun nativePinchZoomsClampsAndNeverDismisses() = main {
    pinch(120f, 520f)
    assertTrue("Native ScaleGestureDetector must enlarge the image", picture.zoom > 2f)
    pinch(120f, 520f)
    assertEquals(4f, picture.zoom, 0.01f)
    pinch(520f, 20f)
    pinch(520f, 20f)
    assertEquals(1f, picture.zoom, 0.01f)
    assertEquals(0, dismissed)
    assertEquals(540f, bounds().centerX(), 0.1f)
  }

  @Test fun horizontalBackGestureDoesNotDragOrOverrideTheNativeTransition() = main {
    touch(MotionEvent.ACTION_DOWN, 1f to 1100f)
    touch(MotionEvent.ACTION_MOVE, 250f to 1100f)
    assertEquals(540f, bounds().centerX(), 0.1f)
    picture.prepareForBack()
    val transition = android.graphics.Matrix(picture.imageMatrix).apply { postTranslate(80f, 120f) }
    picture.imageMatrix = transition
    touch(MotionEvent.ACTION_CANCEL, 250f to 1100f)
    assertEquals(620f, bounds().centerX(), 0.1f)
    assertEquals(1220f, bounds().centerY(), 0.1f)
    assertEquals(0, dismissed)
  }

  @Test fun doubleTapZoomsAroundTheTouchedPointThenRestoresFit() {
    main {
      touch(MotionEvent.ACTION_DOWN, 250f to 1100f); touch(MotionEvent.ACTION_UP, 250f to 1100f)
      time += 80
      touch(MotionEvent.ACTION_DOWN, 250f to 1100f); touch(MotionEvent.ACTION_UP, 250f to 1100f)
    }
    settle()
    main {
      assertEquals(2.5f, picture.zoom, 0.01f)
      assertTrue("The tapped point stays fixed", bounds().centerX() > 540f)
      time += 600
      touch(MotionEvent.ACTION_DOWN, 250f to 1100f); touch(MotionEvent.ACTION_UP, 250f to 1100f)
      time += 80
      touch(MotionEvent.ACTION_DOWN, 250f to 1100f); touch(MotionEvent.ACTION_UP, 250f to 1100f)
    }
    settle()
    main { assertEquals(1f, picture.zoom, 0.01f); assertEquals(540f, bounds().centerX(), 0.1f) }
  }

  @Test fun aCancelledDragReturnsAndALongDragDismisses() {
    main {
      touch(MotionEvent.ACTION_DOWN, 540f to 1100f)
      touch(MotionEvent.ACTION_MOVE, 540f to 1350f)
      touch(MotionEvent.ACTION_MOVE, 540f to 1750f)
      touch(MotionEvent.ACTION_CANCEL, 540f to 1750f)
      assertEquals(0, dismissed)
    }
    settle()
    main {
      assertEquals(1100f, bounds().centerY(), 0.1f)
      touch(MotionEvent.ACTION_DOWN, 540f to 1100f)
      touch(MotionEvent.ACTION_MOVE, 540f to 1350f)
      touch(MotionEvent.ACTION_MOVE, 540f to 1750f)
      touch(MotionEvent.ACTION_UP, 540f to 1750f)
      assertEquals(1, dismissed)
    }
  }

  @Test fun zoomedPanStaysInsideTheImageAndDoesNotDismiss() = main {
    pinch(100f, 520f)
    touch(MotionEvent.ACTION_DOWN, 540f to 1100f)
    touch(MotionEvent.ACTION_MOVE, 1050f to 2000f)
    touch(MotionEvent.ACTION_MOVE, 1800f to 2700f)
    touch(MotionEvent.ACTION_UP, 1800f to 2700f)
    assertEquals(0, dismissed)
    val image = bounds()
    assertTrue(image.left <= 0f)
    assertTrue(image.right >= 1080f)
    if (image.height() < 2200) assertEquals(1100f, image.centerY(), 0.1f)
    else { assertTrue(image.top <= 0f); assertTrue(image.bottom >= 2200f) }
  }

  @Test fun accessibilityExposesZoomAndDismissWithoutVisibleZoomButtons() = main {
    val info = AccessibilityNodeInfo.obtain()
    picture.onInitializeAccessibilityNodeInfo(info)
    val actions = info.actionList.map { it.label?.toString() }
    assertTrue(actions.containsAll(listOf("Agrandir", "Réduire", "Fermer", "Masquer")))
    assertTrue(picture.performAccessibilityAction(AccessibilityNodeInfo.ACTION_DISMISS, null))
    assertEquals(1, dismissed)
    info.recycle()
  }
}
