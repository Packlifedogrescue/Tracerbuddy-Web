import SwiftUI

struct CommunityPostDetailView: View {
    let postId: UUID

    @StateObject private var vm: PostDetailViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var commentText = ""
    @FocusState private var commentFocused: Bool

    private let reactions = ["🔥", "👍", "🏌️"]

    init(postId: UUID) {
        self.postId = postId
        _vm = StateObject(wrappedValue: PostDetailViewModel(postId: postId))
    }

    var body: some View {
        ScrollView {
            if let post = vm.post {
                VStack(alignment: .leading, spacing: 0) {
                    // Type accent bar
                    Rectangle()
                        .fill(Color(hex: post.type.accentColor))
                        .frame(height: 3)

                    VStack(alignment: .leading, spacing: 16) {
                        // Author
                        HStack(spacing: 10) {
                            AvatarView(name: post.authorName, size: 40)
                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 6) {
                                    Text(post.authorName)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "#111111"))
                                    typeBadge(post)
                                }
                                Text(timeAgo(post.createdAt))
                                    .font(.system(size: 11))
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }

                        // Title
                        Text(post.title)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Color(hex: "#111111"))

                        // Content
                        Text(post.content)
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "#444444"))
                            .lineSpacing(4)

                        // Round stats
                        if post.type == .roundRecap, let score = post.roundScore {
                            roundStatsCard(post: post, score: score)
                        }

                        // Reactions
                        reactionRow(post)

                        Divider()
                            .background(Color(hex: "#F0EBE0"))

                        // Comments header
                        Text("Comments (\(vm.comments.count))")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(Color(hex: "#111111"))

                        // Comment list
                        if vm.comments.isEmpty {
                            Text("No comments yet — be the first!")
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                                .padding(.vertical, 8)
                        } else {
                            ForEach(vm.comments) { comment in
                                commentRow(comment)
                            }
                        }
                    }
                    .padding(16)
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(16)
            } else if vm.loading {
                ProgressView()
                    .tint(Color(hex: "#DF9905"))
                    .padding(40)
            }
        }
        .background(Color(hex: "#F7F4EE"))
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            commentInput
        }
        .task { await vm.load() }
    }

    // MARK: - Type Badge

    private func typeBadge(_ post: CommunityPost) -> some View {
        Text(post.type.label)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(Color(hex: post.type.accentColor))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Color(hex: post.type.accentColor).opacity(0.12))
            .clipShape(Capsule())
    }

    // MARK: - Round Stats

    private func roundStatsCard(post: CommunityPost, score: Int) -> some View {
        HStack(spacing: 0) {
            VStack(spacing: 3) {
                Text("\(score)")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Color(hex: "#111111"))
                if let diff = post.scoreDiff {
                    Text(diff)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(scoreDiffColor(diff))
                }
            }
            .frame(minWidth: 60)

            if let course = post.courseName {
                Divider().frame(height: 44).padding(.horizontal, 14)
                VStack(alignment: .leading, spacing: 3) {
                    Text("COURSE").font(.system(size: 9, weight: .semibold)).foregroundColor(.gray)
                    Text(course).font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: "#111111")).lineLimit(1)
                }
                Spacer()
            }

            if let gir = post.roundGir {
                Divider().frame(height: 44).padding(.horizontal, 14)
                VStack(alignment: .leading, spacing: 3) {
                    Text("GIR").font(.system(size: 9, weight: .semibold)).foregroundColor(.gray)
                    Text("\(gir)%").font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: "#111111"))
                }
            }

            if let putts = post.roundPutts {
                Divider().frame(height: 44).padding(.horizontal, 14)
                VStack(alignment: .leading, spacing: 3) {
                    Text("PUTTS/HOLE").font(.system(size: 9, weight: .semibold)).foregroundColor(.gray)
                    Text(String(format: "%.1f", putts)).font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: "#111111"))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(hex: "#F5EFE0"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Reactions

    private func reactionRow(_ post: CommunityPost) -> some View {
        HStack(spacing: 6) {
            ForEach(reactions, id: \.self) { emoji in
                let count = vm.reactionCounts[emoji] ?? 0
                let isActive = vm.userReaction == emoji

                Button {
                    Task { await vm.react(emoji: emoji) }
                } label: {
                    HStack(spacing: 4) {
                        Text(emoji).font(.system(size: 15))
                        if count > 0 {
                            Text("\(count)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(isActive ? Color(hex: "#E87830") : Color(hex: "#555555"))
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(isActive ? Color(hex: "#FEF3E8") : Color(hex: "#F5EFE0"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isActive ? Color(hex: "#E87830").opacity(0.3) : Color.clear, lineWidth: 1)
                    )
                }
            }
            Spacer()
        }
    }

    // MARK: - Comment Row

    private func commentRow(_ comment: CommunityComment) -> some View {
        HStack(alignment: .top, spacing: 10) {
            AvatarView(name: comment.authorName, size: 30)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.authorName)
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(Color(hex: "#111111"))
                    Text(timeAgo(comment.createdAt))
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                Text(comment.content)
                    .font(.system(size: 13.5))
                    .foregroundColor(Color(hex: "#444444"))
                    .lineSpacing(3)
            }
        }
        .padding(.vertical, 6)
    }

    // MARK: - Comment Input

    private var commentInput: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(spacing: 10) {
                if let name = vm.authorName {
                    AvatarView(name: name, size: 30)
                }
                TextField("Add a comment...", text: $commentText, axis: .vertical)
                    .font(.system(size: 14))
                    .lineLimit(1...4)
                    .focused($commentFocused)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(hex: "#F7F4EE"))
                    .clipShape(RoundedRectangle(cornerRadius: 20))

                Button {
                    Task { await submitComment() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(commentText.trimmingCharacters(in: .whitespaces).isEmpty
                            ? Color.gray.opacity(0.3)
                            : Color(hex: "#DF9905"))
                }
                .disabled(commentText.trimmingCharacters(in: .whitespaces).isEmpty || vm.submitting)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.white)
        }
    }

    private func submitComment() async {
        let text = commentText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        commentText = ""
        commentFocused = false
        await vm.addComment(content: text)
    }

    private func scoreDiffColor(_ diff: String) -> Color {
        if diff == "E" { return .gray }
        return diff.hasPrefix("-") ? Color(hex: "#059669") : Color(hex: "#DC2626")
    }
}

// MARK: - ViewModel

@MainActor
class PostDetailViewModel: ObservableObject {
    @Published var post: CommunityPost? = nil
    @Published var comments: [CommunityComment] = []
    @Published var reactionCounts: [String: Int] = [:]
    @Published var userReaction: String? = nil
    @Published var loading = true
    @Published var submitting = false
    @Published var authorName: String? = nil
    @Published var userId: UUID? = nil

    private let postId: UUID
    private let service = CommunityService.shared

    init(postId: UUID) {
        self.postId = postId
    }

    func load() async {
        loading = true
        async let postFetch    = service.fetchPost(id: postId)
        async let commentFetch = service.fetchComments(postId: postId)
        async let reactionFetch = service.fetchReactions(postId: postId)

        post     = try? await postFetch
        comments = (try? await commentFetch) ?? []

        let allReactions = (try? await reactionFetch) ?? []
        var counts: [String: Int] = [:]
        for r in allReactions { counts[r.emoji, default: 0] += 1 }
        reactionCounts = counts

        if let user = try? await SupabaseClient.shared.auth.session.user {
            userId = user.id
            userReaction = allReactions.first(where: { $0.userId == user.id })?.emoji

            if let profile = try? await SupabaseClient.shared
                .from("user_profiles")
                .select("display_name")
                .eq("user_id", value: user.id.uuidString)
                .single()
                .execute()
                .value as [String: String]? {
                authorName = profile["display_name"]
            }
        }
        loading = false
    }

    func react(emoji: String) async {
        guard let userId else { return }
        let prev = userReaction
        try? await service.toggleReaction(postId: postId, userId: userId, emoji: emoji, currentEmoji: prev)

        // Optimistic update
        if prev == emoji {
            reactionCounts[emoji] = max(0, (reactionCounts[emoji] ?? 1) - 1)
            userReaction = nil
        } else {
            if let prev { reactionCounts[prev] = max(0, (reactionCounts[prev] ?? 1) - 1) }
            reactionCounts[emoji, default: 0] += 1
            userReaction = emoji
        }
    }

    func addComment(content: String) async {
        guard let userId, let name = authorName else { return }
        submitting = true
        if let comment = try? await service.addComment(postId: postId, userId: userId, authorName: name, content: content) {
            comments.append(comment)
        }
        submitting = false
    }
}
