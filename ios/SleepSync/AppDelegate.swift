import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import BackgroundTasks

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "SleepSync",
      in: window,
      launchOptions: launchOptions
    )
    
    // Register background tasks
    registerBackgroundTasks()

    return true
  }
  
  // MARK: - Background Task Registration
  private func registerBackgroundTasks() {
    let backgroundTaskIdentifier = "com.sleepsync.background-processing"
    let backgroundFetchIdentifier = "com.sleepsync.background-fetch"
    
    // Register background processing task
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: backgroundTaskIdentifier,
      using: nil
    ) { task in
      self.handleBackgroundProcessing(task: task as! BGProcessingTask)
    }
    
    // Register background fetch task
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: backgroundFetchIdentifier,
      using: nil
    ) { task in
      self.handleBackgroundFetch(task: task as! BGAppRefreshTask)
    }
  }
  
  private func handleBackgroundProcessing(task: BGProcessingTask) {
    // Schedule next task
    scheduleBackgroundTask()
    
    // Perform background work
    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }
    
    // Check for active sleep sessions and collect data
    checkAndUpdateActiveSessions { success in
      task.setTaskCompleted(success: success)
    }
  }
  
  private func handleBackgroundFetch(task: BGAppRefreshTask) {
    // Schedule next fetch
    scheduleBackgroundFetch()
    
    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }
    
    // Quick check for active sessions
    checkAndUpdateActiveSessions { success in
      task.setTaskCompleted(success: success)
    }
  }
  
  private func scheduleBackgroundTask() {
    let backgroundTaskIdentifier = "com.sleepsync.background-processing"
    let request = BGProcessingTaskRequest(identifier: backgroundTaskIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes
    request.requiresNetworkConnectivity = false
    request.requiresExternalPower = false
    
    do {
      try BGTaskScheduler.shared.submit(request)
      print("✅ Background task scheduled")
    } catch {
      print("❌ Failed to schedule background task: \(error)")
    }
  }
  
  private func scheduleBackgroundFetch() {
    let backgroundFetchIdentifier = "com.sleepsync.background-fetch"
    let request = BGAppRefreshTaskRequest(identifier: backgroundFetchIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes
    
    do {
      try BGTaskScheduler.shared.submit(request)
      print("✅ Background fetch scheduled")
    } catch {
      print("❌ Failed to schedule background fetch: \(error)")
    }
  }
  
  private func checkAndUpdateActiveSessions(completion: @escaping (Bool) -> Void) {
    // This would check for active sessions and update them
    // For now, just log
    print("Checking active sleep sessions...")
    completion(true)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
