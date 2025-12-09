#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BackgroundTaskHandler, NSObject)

RCT_EXTERN_METHOD(registerBackgroundTasks)
RCT_EXTERN_METHOD(scheduleBackgroundTask)
RCT_EXTERN_METHOD(scheduleBackgroundFetch)

@end

