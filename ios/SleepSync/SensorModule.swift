/**
 * Sensor Module for iOS
 * Provides native access to microphone and light sensors
 * Note: Accelerometer and Gyroscope use react-native-sensors library
 */

import Foundation
import React
import AVFoundation
import CoreMotion

@objc(SensorModule)
class SensorModule: RCTEventEmitter {
  private var audioRecorder: AVAudioRecorder?
  private var audioEngine: AVAudioEngine?
  private var lightSensorTimer: Timer?
  private var isMicrophoneActive = false
  private var isLightSensorActive = false
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return ["AudioData", "LightData"]
  }
  
  // MARK: - Permissions
  
  @objc
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    var granted = true
    
    // Request microphone permission
    AVAudioSession.sharedInstance().requestRecordPermission { allowed in
      if !allowed {
        granted = false
      }
    }
    
    // Note: Light sensor doesn't require explicit permission on iOS
    // It's accessed through ambient light sensor if available
    
    resolve(granted)
  }
  
  // MARK: - Microphone
  
  @objc
  func startMicrophone(_ interval: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if isMicrophoneActive {
      resolve(nil)
      return
    }
    
    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.record, mode: .measurement, options: [])
      try audioSession.setActive(true)
      
      let audioEngine = AVAudioEngine()
      let inputNode = audioEngine.inputNode
      let recordingFormat = inputNode.outputFormat(forBus: 0)
      
      // Configure for low latency
      let bufferSize: AVAudioFrameCount = 1024
      
      inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: recordingFormat) { [weak self] buffer, _ in
        guard let self = self else { return }
        
        // Calculate audio level (RMS)
        let channelData = buffer.floatChannelData?[0]
        let channelDataValue = channelData?.pointee ?? 0
        
        var sum: Float = 0
        var frameCount: Int = 0
        
        for frameIndex in 0..<Int(buffer.frameLength) {
          if let channelData = channelData {
            let sample = channelData[frameIndex]
            sum += sample * sample
            frameCount += 1
          }
        }
        
        let rms = sqrt(sum / Float(frameCount))
        let decibel = 20 * log10(rms)
        let normalizedDecibel = max(0, min(100, decibel + 60)) // Normalize to 0-100
        
        // Simple frequency estimation (peak detection)
        var maxAmplitude: Float = 0
        var maxIndex: Int = 0
        
        if let channelData = channelData {
          for i in 0..<min(Int(buffer.frameLength), 1024) {
            let amplitude = abs(channelData[i])
            if amplitude > maxAmplitude {
              maxAmplitude = amplitude
              maxIndex = i
            }
          }
        }
        
        let sampleRate = Float(recordingFormat.sampleRate)
        let frequency = Float(maxIndex) * sampleRate / Float(buffer.frameLength)
        
        // Detect snoring (200-400 Hz range with sufficient volume)
        let isSnoring = frequency >= 200 && frequency <= 400 && normalizedDecibel > 40
        
        self.sendEvent(withName: "AudioData", body: [
          "decibel": Double(normalizedDecibel),
          "frequency": Double(frequency),
          "isSnoring": isSnoring
        ])
      }
      
      try audioEngine.start()
      self.audioEngine = audioEngine
      self.isMicrophoneActive = true
      
      resolve(nil)
    } catch {
      reject("MICROPHONE_ERROR", "Failed to start microphone: \(error.localizedDescription)", error)
    }
  }
  
  @objc
  func stopMicrophone(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if !isMicrophoneActive {
      resolve(nil)
      return
    }
    
    audioEngine?.inputNode.removeTap(onBus: 0)
    audioEngine?.stop()
    audioEngine = nil
    
    do {
      try AVAudioSession.sharedInstance().setActive(false)
    } catch {
      // Ignore error
    }
    
    isMicrophoneActive = false
    resolve(nil)
  }
  
  // MARK: - Light Sensor
  
  @objc
  func startLightSensor(_ interval: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if isLightSensorActive {
      resolve(nil)
      return
    }
    
    // iOS doesn't have a direct ambient light sensor API
    // We'll use the camera's brightness detection as a workaround
    // Note: This requires camera permission, but we'll use a simpler approach
    
    // For now, we'll simulate light sensor using screen brightness
    // In production, you might want to use a camera-based approach
    
    let intervalSeconds = interval.doubleValue / 1000.0
    
    lightSensorTimer = Timer.scheduledTimer(withTimeInterval: intervalSeconds, repeats: true) { [weak self] _ in
      guard let self = self else { return }
      
      // Use screen brightness as a proxy for ambient light
      // This is a limitation - iOS doesn't expose ambient light sensor directly
      let screenBrightness = Double(UIScreen.main.brightness)
      
      // Convert screen brightness (0-1) to approximate lux (0-1000)
      // This is an approximation and not accurate
      let approximateLux = screenBrightness * 1000
      
      self.sendEvent(withName: "LightData", body: [
        "lux": approximateLux
      ])
    }
    
    isLightSensorActive = true
    resolve(nil)
  }
  
  @objc
  func stopLightSensor(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    lightSensorTimer?.invalidate()
    lightSensorTimer = nil
    isLightSensorActive = false
    resolve(nil)
  }
}

