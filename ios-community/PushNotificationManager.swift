import SwiftUI
import UserNotifications

// MARK: - Manager

@MainActor
class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    // Call this on app launch (e.g. in TracerBuddyApp.init or after sign-in)
    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings()
        guard status.authorizationStatus == .notDetermined else {
            if status.authorizationStatus == .authorized {
                UIApplication.shared.registerForRemoteNotifications()
            }
            return
        }
        let granted = (try? await center.requestAuthorization(options: [.alert, .badge, .sound])) ?? false
        if granted {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    // Call from AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
    func registerToken(_ tokenData: Data) async {
        let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        guard let user = try? await SupabaseClient.shared.auth.session.user else { return }

        struct Payload: Encodable {
            let user_id: String
            let token: String
            let platform: String
        }

        try? await SupabaseClient.shared
            .from("user_push_tokens")
            .upsert(Payload(user_id: user.id.uuidString, token: token, platform: "ios"))
            .execute()
    }

    // Call on sign-out to stop notifications for this device
    func removeToken() async {
        guard let user = try? await SupabaseClient.shared.auth.session.user else { return }
        if let tokenData = UserDefaults.standard.data(forKey: "apns_token") {
            let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
            try? await SupabaseClient.shared
                .from("user_push_tokens")
                .delete()
                .eq("user_id", value: user.id.uuidString)
                .eq("token", value: token)
                .execute()
        }
    }
}

// MARK: - AppDelegate additions
//
// Add this to your AppDelegate (or create one if you don't have one):
//
// class AppDelegate: NSObject, UIApplicationDelegate {
//     func application(_ application: UIApplication,
//                      didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
//         UserDefaults.standard.set(deviceToken, forKey: "apns_token")
//         Task { await PushNotificationManager.shared.registerToken(deviceToken) }
//     }
//
//     func application(_ application: UIApplication,
//                      didFailToRegisterForRemoteNotificationsWithError error: Error) {
//         print("APNs registration failed: \(error)")
//     }
// }
//
// In TracerBuddyApp.swift add:
//   @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
// and call:
//   Task { await PushNotificationManager.shared.requestPermission() }
// inside .onAppear or after sign-in succeeds.
