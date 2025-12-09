import Foundation
import BackgroundTasks
import UIKit

@objc(BackgroundTaskHandler)
public class BackgroundTaskHandler: NSObject {
  
  static let backgroundTaskIdentifier = "com.sleepsync.background-processing"
  static let backgroundFetchIdentifier = "com.sleepsync.background-fetch"
  
  @objc
  public static func registerBackgroundTasks() {
    // Register background processing task
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: backgroundTaskIdentifier,
      using: nil
    ) { task in
      handleBackgroundProcessing(task: task as! BGProcessingTask)
    }
    
    // Register background fetch task
    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: backgroundFetchIdentifier,
      using: nil
    ) { task in
      handleBackgroundFetch(task: task as! BGAppRefreshTask)
    }
  }
  
  @objc
  public static func scheduleBackgroundTask() {
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
  
  @objc
  public static func scheduleBackgroundFetch() {
    let request = BGAppRefreshTaskRequest(identifier: backgroundFetchIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes
    
    do {
      try BGTaskScheduler.shared.submit(request)
      print("✅ Background fetch scheduled")
    } catch {
      print("❌ Failed to schedule background fetch: \(error)")
    }
  }
  
  static func handleBackgroundProcessing(task: BGProcessingTask) {
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
  
  static func handleBackgroundFetch(task: BGAppRefreshTask) {
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
  
  static func checkAndUpdateActiveSessions(completion: @escaping (Bool) -> Void) {
    // This would check for active sessions and update them
    // For now, just log
    print("Checking active sleep sessions...")
    completion(true)
  }
}

