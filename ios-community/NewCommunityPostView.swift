import SwiftUI

struct NewCommunityPostView: View {
    let onPost: (CommunityPost) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedType: PostType = .roundRecap
    @State private var title = ""
    @State private var content = ""
    @State private var courseName = ""
    @State private var score = ""
    @State private var par = ""
    @State private var submitting = false
    @State private var error: String? = nil

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Post type selector
                    VStack(alignment: .leading, spacing: 8) {
                        label("POST TYPE")
                        LazyVGrid(columns: Array(repeating: .init(.flexible()), count: 2), spacing: 8) {
                            ForEach(PostType.allCases, id: \.rawValue) { type in
                                typeOption(type)
                            }
                        }
                    }

                    // Title
                    VStack(alignment: .leading, spacing: 8) {
                        label("TITLE")
                        TextField("Give your post a title...", text: $title)
                            .font(.system(size: 15))
                            .padding(12)
                            .background(Color(hex: "#F7F4EE"))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Content
                    VStack(alignment: .leading, spacing: 8) {
                        label("CONTENT")
                        TextField("Share your thoughts...", text: $content, axis: .vertical)
                            .font(.system(size: 15))
                            .lineLimit(4...10)
                            .padding(12)
                            .background(Color(hex: "#F7F4EE"))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Round recap extras
                    if selectedType == .roundRecap {
                        VStack(alignment: .leading, spacing: 12) {
                            label("ROUND DETAILS (OPTIONAL)")

                            HStack(spacing: 10) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Score").font(.system(size: 12, weight: .medium)).foregroundColor(.gray)
                                    TextField("e.g. 82", text: $score)
                                        .keyboardType(.numberPad)
                                        .font(.system(size: 15))
                                        .padding(12)
                                        .background(Color(hex: "#F7F4EE"))
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Par").font(.system(size: 12, weight: .medium)).foregroundColor(.gray)
                                    TextField("e.g. 72", text: $par)
                                        .keyboardType(.numberPad)
                                        .font(.system(size: 15))
                                        .padding(12)
                                        .background(Color(hex: "#F7F4EE"))
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Course Name").font(.system(size: 12, weight: .medium)).foregroundColor(.gray)
                                TextField("e.g. Pebble Beach", text: $courseName)
                                    .font(.system(size: 15))
                                    .padding(12)
                                    .background(Color(hex: "#F7F4EE"))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                    }
                }
                .padding(20)
            }
            .background(Color(hex: "#F7F4EE"))
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Color(hex: "#555555"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await submit() }
                    } label: {
                        if submitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Post")
                                .font(.system(size: 14, weight: .bold))
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty ||
                              content.trimmingCharacters(in: .whitespaces).isEmpty ||
                              submitting)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(canSubmit ? Color(hex: "#DF9905") : Color.gray.opacity(0.3))
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
    }

    private var canSubmit: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !content.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func typeOption(_ type: PostType) -> some View {
        let active = selectedType == type
        return Button {
            selectedType = type
        } label: {
            HStack(spacing: 8) {
                Text(type.emoji).font(.system(size: 18))
                Text(type.label)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(active ? Color(hex: "#111111") : Color(hex: "#555555"))
                Spacer()
            }
            .padding(12)
            .background(active ? Color.white : Color(hex: "#F7F4EE"))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(active ? Color(hex: "#0D2818") : Color.clear, lineWidth: 1.5)
            )
        }
    }

    private func label(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10.5, weight: .bold))
            .foregroundColor(Color(hex: "#888888"))
            .tracking(1.2)
    }

    private func submit() async {
        guard let user = try? await SupabaseClient.shared.auth.session.user else {
            error = "Please sign in to post."
            return
        }

        // Get display name
        let displayName: String
        if let profile = try? await SupabaseClient.shared
            .from("user_profiles")
            .select("display_name")
            .eq("id", value: user.id.uuidString)
            .single()
            .execute()
            .value as [String: String]?,
           let name = profile["display_name"] {
            displayName = name
        } else {
            displayName = user.email?.components(separatedBy: "@").first ?? "Golfer"
        }

        submitting = true
        error = nil

        do {
            let post = try await CommunityService.shared.createPost(
                userId: user.id,
                authorName: displayName,
                type: selectedType,
                title: title.trimmingCharacters(in: .whitespaces),
                content: content.trimmingCharacters(in: .whitespaces),
                courseName: courseName.isEmpty ? nil : courseName,
                roundScore: Int(score),
                roundPar: Int(par)
            )
            onPost(post)
            dismiss()
        } catch {
            self.error = "Failed to post. Please try again."
        }
        submitting = false
    }
}
