import SwiftUI

// Present this as a .sheet() from your round summary screen.
// Example:
//   .sheet(isPresented: $showShare) {
//       ShareToCommunitySheet(courseName: round.courseName, score: round.score, par: round.par)
//   }

struct ShareToCommunitySheet: View {
    let courseName: String?
    let score: Int?
    let par: Int?

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var content = ""
    @State private var submitting = false
    @State private var posted = false
    @State private var error: String? = nil

    init(courseName: String? = nil, score: Int? = nil, par: Int? = nil) {
        self.courseName = courseName
        self.score = score
        self.par = par
        let defaultTitle = courseName.map { "Round at \($0)" } ?? "Round Recap"
        _title = State(initialValue: defaultTitle)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // Round stats preview card
                    if let score {
                        roundPreviewCard(score: score)
                    }

                    // Title
                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("TITLE")
                        TextField("Give your post a title...", text: $title)
                            .font(.system(size: 15))
                            .padding(12)
                            .background(Color(hex: "#F7F4EE"))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Content
                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("HOW DID IT GO?")
                        TextField("Share how the round went...", text: $content, axis: .vertical)
                            .font(.system(size: 15))
                            .lineLimit(4...10)
                            .padding(12)
                            .background(Color(hex: "#F7F4EE"))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                    }

                    if posted {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Color(hex: "#059669"))
                            Text("Posted to community!")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "#059669"))
                        }
                    }
                }
                .padding(20)
            }
            .background(Color(hex: "#F7F4EE"))
            .navigationTitle("Share to Community")
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
                    .disabled(!canSubmit)
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
        !content.trimmingCharacters(in: .whitespaces).isEmpty &&
        !submitting && !posted
    }

    private func roundPreviewCard(score: Int) -> some View {
        HStack(spacing: 0) {
            VStack(spacing: 3) {
                Text("\(score)")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundColor(Color(hex: "#111111"))
                if let par {
                    let diff = score - par
                    Text(diff == 0 ? "E" : diff > 0 ? "+\(diff)" : "\(diff)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(diff == 0 ? .gray : diff > 0 ? Color(hex: "#DC2626") : Color(hex: "#059669"))
                }
            }
            .frame(minWidth: 64)

            if let course = courseName {
                Divider().frame(height: 44).padding(.horizontal, 14)
                VStack(alignment: .leading, spacing: 3) {
                    Text("COURSE")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                    Text(course)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "#111111"))
                        .lineLimit(1)
                }
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(hex: "#F5EFE0"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func sectionLabel(_ text: String) -> some View {
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
            _ = try await CommunityService.shared.createPost(
                userId: user.id,
                authorName: displayName,
                type: .roundRecap,
                title: title.trimmingCharacters(in: .whitespaces),
                content: content.trimmingCharacters(in: .whitespaces),
                courseName: courseName,
                roundScore: score,
                roundPar: par
            )
            posted = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            dismiss()
        } catch {
            self.error = "Failed to post. Please try again."
        }
        submitting = false
    }
}
