import SwiftUI
import AuthenticationServices
import CryptoKit

struct SignInWithAppleButton: View {
    let onSuccess: () -> Void
    @State private var error: String? = nil

    var body: some View {
        VStack(spacing: 8) {
            SignInWithAppleRepresentable(onSuccess: onSuccess, onError: { error = $0 })
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            if let error {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

struct SignInWithAppleRepresentable: UIViewRepresentable {
    let onSuccess: () -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onSuccess: onSuccess, onError: onError)
    }

    func makeUIView(context: Context) -> ASAuthorizationAppleIDButton {
        let button = ASAuthorizationAppleIDButton(type: .signIn, style: .black)
        button.cornerRadius = 12
        button.addTarget(context.coordinator, action: #selector(Coordinator.handleTap), for: .touchUpInside)
        return button
    }

    func updateUIView(_ uiView: ASAuthorizationAppleIDButton, context: Context) {}

    class Coordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        let onSuccess: () -> Void
        let onError: (String) -> Void
        private var currentNonce: String?

        init(onSuccess: @escaping () -> Void, onError: @escaping (String) -> Void) {
            self.onSuccess = onSuccess
            self.onError = onError
        }

        @objc func handleTap() {
            let nonce = randomNonce()
            currentNonce = nonce

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = sha256(nonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }

        func authorizationController(controller: ASAuthorizationController,
                                     didCompleteWithAuthorization authorization: ASAuthorization) {
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData   = credential.identityToken,
                let idToken     = String(data: tokenData, encoding: .utf8),
                let nonce       = currentNonce
            else {
                onError("Apple sign-in failed. Please try again.")
                return
            }

            Task {
                do {
                    try await SupabaseClient.shared.auth.signInWithIdToken(
                        credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
                    )

                    // Save display name on first sign-in
                    if let fullName = credential.fullName,
                       let user = try? await SupabaseClient.shared.auth.session.user {
                        let name = [fullName.givenName, fullName.familyName]
                            .compactMap { $0 }.joined(separator: " ")
                        if !name.isEmpty {
                            try? await SupabaseClient.shared
                                .from("user_profiles")
                                .upsert(["id": user.id.uuidString, "display_name": name])
                                .execute()
                        }
                    }

                    await MainActor.run { onSuccess() }
                } catch {
                    await MainActor.run { onError("Sign in failed. Please try again.") }
                }
            }
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            if (error as? ASAuthorizationError)?.code != .canceled {
                onError("Apple sign-in failed. Please try again.")
            }
        }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first ?? UIWindow()
        }

        private func randomNonce(length: Int = 32) -> String {
            var bytes = [UInt8](repeating: 0, count: length)
            _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
            let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
            return String(bytes.map { charset[Int($0) % charset.count] })
        }

        private func sha256(_ input: String) -> String {
            SHA256.hash(data: Data(input.utf8))
                .compactMap { String(format: "%02x", $0) }.joined()
        }
    }
}
