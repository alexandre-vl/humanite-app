import ExpoModulesCore
import UIKit
import UIKit.UIGestureRecognizerSubclass

/// The tab bar of iOS 26 as a reader expects it: it slips away while they read down, and comes back as soon as they
/// pull the page back up — not only once they are back at the top, which is all `.onScrollDown` does on iOS 26 and 27.
public final class HumaTabBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HumaTabBar")
    View(TabBarRevealView.self) {}
  }
}

/// A view with no size, set beside the tabs, that finds their controller and hands it a `ScrollUpReveal`.
///
/// It is found from the view up: the first controller up the responder chain is the screen that holds the tabs, and
/// the tab bar controller is among its descendants. The tabs mount a moment after this view does, so a miss is tried
/// again a few times before giving up.
public final class TabBarRevealView: ExpoView {
  private static let attempts = 10

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    attach()
  }

  private func attach(attempt: Int = 0) {
    guard #available(iOS 26.0, *), window != nil else {
      return
    }
    guard let tabs = tabBarController() else {
      if attempt < Self.attempts {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1 * Double(attempt + 1)) { [weak self] in
          self?.attach(attempt: attempt + 1)
        }
      }
      return
    }
    ScrollUpReveal.install(on: tabs)
  }

  private func tabBarController() -> UITabBarController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let controller = current as? UIViewController {
        return controller as? UITabBarController ?? controller.tabBarController ?? Self.descendant(of: controller)
      }
      responder = current.next
    }
    return nil
  }

  private static func descendant(of controller: UIViewController) -> UITabBarController? {
    var queue = controller.children
    while !queue.isEmpty {
      let child = queue.removeFirst()
      if let tabs = child as? UITabBarController {
        return tabs
      }
      queue.append(contentsOf: child.children)
    }
    return nil
  }
}

/// Follows every drag of a scroll view inside the tabs, and brings the bar back once the reader pulls the page down
/// by `distance` from the deepest point of that drag, or lets go of it flicked down at `speed` — once per drag.
///
/// The bar is brought back through public API alone: the behaviour is set to `.never`, which shows the bar, and back
/// to `.onScrollDown` at once, which leaves it shown and lets the next scroll down tuck it away again. UIKit keeps
/// to itself both whether the bar is minimised and the call that expands it with its own animation — `_setMinimized:`
/// raises "This can only be called by an approved app" — so the change is made inside an animation of its own.
@available(iOS 26.0, *)
private final class ScrollUpReveal: NSObject {
  private static var key: UInt8 = 0
  private static let distance: CGFloat = 24
  private static let speed: CGFloat = 300

  private weak var tabs: UITabBarController?
  private let followed = NSHashTable<UIScrollView>.weakObjects()
  private var deepest: CGFloat = 0
  private var revealed = false

  static func install(on tabs: UITabBarController) {
    guard objc_getAssociatedObject(tabs, &key) == nil else {
      return
    }
    let reveal = ScrollUpReveal(tabs: tabs)
    objc_setAssociatedObject(tabs, &key, reveal, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    tabs.view.addGestureRecognizer(ScrollViewFinder { [weak reveal] scrollView in
      reveal?.follow(scrollView)
    })
  }

  private init(tabs: UITabBarController) {
    self.tabs = tabs
  }

  /// A target on the scroll view's own pan recognizer: nothing competes with the scroll for the touch.
  private func follow(_ scrollView: UIScrollView) {
    guard !followed.contains(scrollView) else {
      return
    }
    followed.add(scrollView)
    scrollView.panGestureRecognizer.addTarget(self, action: #selector(dragged(_:)))
  }

  @objc private func dragged(_ pan: UIPanGestureRecognizer) {
    guard let scrollView = pan.view as? UIScrollView else {
      return
    }
    let offset = scrollView.contentOffset.y
    switch pan.state {
    case .began:
      deepest = offset
      revealed = false
    case .changed:
      deepest = max(deepest, offset)
      if deepest - offset >= Self.distance {
        reveal()
      }
    case .ended:
      if pan.velocity(in: scrollView).y >= Self.speed {
        reveal()
      }
    default:
      break
    }
  }

  private func reveal() {
    guard !revealed, let tabs, tabs.tabBarMinimizeBehavior == .onScrollDown else {
      return
    }
    revealed = true
    UIView.animate(withDuration: 0.35, delay: 0, usingSpringWithDamping: 0.9, initialSpringVelocity: 0) {
      tabs.tabBarMinimizeBehavior = .never
      tabs.tabBarMinimizeBehavior = .onScrollDown
      tabs.view.layoutIfNeeded()
    }
  }
}

/// Learns which scroll views lie under a finger without ever taking the touch: it fails in `touchesBegan`, so React
/// Native's touch handler, which waits for recognizers outside its root view to fail, is never held up.
private final class ScrollViewFinder: UIGestureRecognizer, UIGestureRecognizerDelegate {
  private let found: (UIScrollView) -> Void

  init(found: @escaping (UIScrollView) -> Void) {
    self.found = found
    super.init(target: nil, action: nil)
    cancelsTouchesInView = false
    delaysTouchesBegan = false
    delaysTouchesEnded = false
    delegate = self
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    for touch in touches {
      var current = touch.view
      while let view = current, view !== self.view {
        if let scrollView = view as? UIScrollView {
          found(scrollView)
        }
        current = view.superview
      }
    }
    state = .failed
  }

  override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool {
    false
  }

  override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool {
    false
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    true
  }
}
