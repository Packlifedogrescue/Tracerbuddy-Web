import SwiftUI

struct CommunityView: View {
    @StateObject private var vm = CommunityViewModel()
    @State private var showNewPost = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Hero banner
                heroBanner

                // Filter tabs
                filterTabs

                // Feed
                if vm.loading && vm.posts.isEmpty {
                    Spacer()
                    ProgressView()
                        .tint(Color(hex: "#DF9905"))
                    Spacer()
                } else if vm.posts.isEmpty {
                    emptyState
                } else {
                    feed
                }
            }
            .background(Color(hex: "#F7F4EE"))
            .navigationBarHidden(true)
            .sheet(isPresented: $showNewPost) {
                NewCommunityPostView { post in
                    vm.posts.insert(post, at: 0)
                }
            }
            .task { await vm.load() }
        }
    }

    // MARK: - Hero

    private var heroBanner: some View {
        ZStack(alignment: .leading) {
            Color(hex: "#0D2818")
            // Dot texture
            Canvas { ctx, size in
                let spacing: CGFloat = 22
                var x: CGFloat = 0
                while x < size.width {
                    var y: CGFloat = 0
                    while y < size.height {
                        let rect = CGRect(x: x, y: y, width: 2, height: 2)
                        ctx.fill(Path(ellipseIn: rect), with: .color(.white.opacity(0.055)))
                        y += spacing
                    }
                    x += spacing
                }
            }

            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    if let name = vm.userName {
                        Text("Welcome back, \(name.components(separatedBy: " ").first ?? name)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: "#7aab8a"))
                    }
                    Text("Community")
                        .font(.system(size: 30, weight: .medium, design: .serif))
                        .foregroundColor(.white)
                    Text("Share rounds, tips, and golf talk.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#8fad9a"))

                    if vm.stats.golfers > 0 {
                        HStack(spacing: 6) {
                            statPill("\(vm.stats.golfers)", "golfers")
                            Text("·").foregroundColor(Color(hex: "#2e5c3e"))
                            statPill("\(vm.stats.rounds)", "rounds")
                            Text("·").foregroundColor(Color(hex: "#2e5c3e"))
                            statPill("\(vm.stats.tips)", "tips")
                        }
                        .padding(.top, 4)
                    }
                }

                Spacer()

                Button {
                    showNewPost = true
                } label: {
                    Label("New Post", systemImage: "plus")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(hex: "#DF9905"))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
        }
        .frame(maxWidth: .infinity)
    }

    private func statPill(_ value: String, _ label: String) -> some View {
        HStack(spacing: 3) {
            Text(value).font(.system(size: 12, weight: .bold)).foregroundColor(.white)
            Text(label).font(.system(size: 12)).foregroundColor(Color(hex: "#6a9477"))
        }
    }

    // MARK: - Filter tabs

    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterTab("All", value: nil)
                ForEach(PostType.allCases, id: \.rawValue) { type in
                    filterTab(type.label + "s", value: type)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color(hex: "#F7F4EE"))
    }

    private func filterTab(_ label: String, value: PostType?) -> some View {
        let active = vm.filter == value
        let count: Int? = {
            if let value {
                return vm.typeCounts[value.rawValue]
            }
            return vm.typeCounts.values.reduce(0, +)
        }()

        return Button {
            Task { await vm.setFilter(value) }
        } label: {
            HStack(spacing: 4) {
                Text(label)
                    .font(.system(size: 12.5, weight: .semibold))
                if let count, count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10.5, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(active ? Color.white.opacity(0.2) : Color.black.opacity(0.07))
                        .clipShape(Capsule())
                }
            }
            .foregroundColor(active ? .white : Color(hex: "#555555"))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(active ? Color(hex: "#0D2818") : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(active ? Color.clear : Color.black.opacity(0.08), lineWidth: 1)
            )
        }
    }

    // MARK: - Feed

    private var feed: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(vm.posts) { post in
                    NavigationLink(destination: CommunityPostDetailView(postId: post.id)) {
                        CommunityPostCard(post: post, currentUserId: vm.userId) { emoji in
                            Task { await vm.react(postId: post.id, emoji: emoji) }
                        }
                    }
                    .buttonStyle(.plain)
                }

                if vm.hasMore {
                    ProgressView()
                        .tint(Color(hex: "#DF9905"))
                        .padding()
                        .task { await vm.loadMore() }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 36))
                .foregroundColor(Color(hex: "#DF9905"))
                .padding(20)
                .background(Color(hex: "#F5EFE0"))
                .clipShape(RoundedRectangle(cornerRadius: 16))

            Text("No posts yet")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(Color(hex: "#111111"))

            Text("Be the first to post in the community")
                .font(.system(size: 13))
                .foregroundColor(.gray)

            Button {
                showNewPost = true
            } label: {
                Label("New Post", systemImage: "plus")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color(hex: "#DF9905"))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.top, 4)
            Spacer()
        }
    }
}

// MARK: - Post Card

struct CommunityPostCard: View {
    let post: CommunityPost
    let currentUserId: UUID?
    let onReact: (String) -> Void

    private let reactions = ["🔥", "👍", "🏌️"]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Type accent line
            Rectangle()
                .fill(Color(hex: post.type.accentColor))
                .frame(height: 2)

            VStack(alignment: .leading, spacing: 10) {
                // Author row
                HStack(spacing: 10) {
                    AvatarView(name: post.authorName, size: 36)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(post.authorName)
                                .font(.system(size: 13.5, weight: .bold))
                                .foregroundColor(Color(hex: "#111111"))
                            typeBadge
                        }
                        Text(timeAgo(post.createdAt))
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                    Spacer()
                }

                // Title
                Text(post.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "#111111"))
                    .multilineTextAlignment(.leading)

                // Content preview
                Text(post.content)
                    .font(.system(size: 13.5))
                    .foregroundColor(Color(hex: "#555555"))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                // Round stats
                if post.type == .roundRecap, let score = post.roundScore {
                    roundStats(score: score)
                }

                // Reaction buttons
                HStack(spacing: 4) {
                    ForEach(reactions, id: \.self) { emoji in
                        Button {
                            onReact(emoji)
                        } label: {
                            Text(emoji)
                                .font(.system(size: 14))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(Color(hex: "#F5EFE0"))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    Spacer()
                    Image(systemName: "bubble.left")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
                .padding(.top, 4)
            }
            .padding(16)
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
    }

    private var typeBadge: some View {
        Text(post.type.label)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(Color(hex: post.type.accentColor))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Color(hex: post.type.accentColor).opacity(0.12))
            .clipShape(Capsule())
    }

    private func roundStats(score: Int) -> some View {
        HStack(spacing: 16) {
            VStack(spacing: 2) {
                Text("\(score)")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(Color(hex: "#111111"))
                if let diff = post.scoreDiff {
                    Text(diff)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(scoreDiffColor(diff))
                }
            }

            if let course = post.courseName {
                Divider().frame(height: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text("COURSE")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                    Text(course)
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(Color(hex: "#111111"))
                        .lineLimit(1)
                }
            }

            if let gir = post.roundGir {
                Divider().frame(height: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text("GIR")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                    Text("\(gir)%")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(Color(hex: "#111111"))
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color(hex: "#F5EFE0"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func scoreDiffColor(_ diff: String) -> Color {
        if diff == "E" { return .gray }
        if diff.hasPrefix("-") { return Color(hex: "#059669") }
        return Color(hex: "#DC2626")
    }
}

// MARK: - Avatar

struct AvatarView: View {
    let name: String
    let size: CGFloat

    private let colors = ["#0D2818", "#1a3a4a", "#2d1b4e", "#4a1942", "#1a4a2e"]

    var body: some View {
        let idx = Int(name.unicodeScalars.first?.value ?? 0) % colors.count
        ZStack {
            Circle()
                .fill(Color(hex: colors[idx]))
                .frame(width: size, height: size)
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: size * 0.38, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - ViewModel

@MainActor
class CommunityViewModel: ObservableObject {
    @Published var posts: [CommunityPost] = []
    @Published var filter: PostType? = nil
    @Published var loading = false
    @Published var hasMore = true
    @Published var userName: String? = nil
    @Published var userId: UUID? = nil
    @Published var stats = (golfers: 0, rounds: 0, tips: 0)
    @Published var typeCounts: [String: Int] = [:]

    private var page = 0
    private let service = CommunityService.shared
    private let pageSize = 20

    func load() async {
        loading = true
        page = 0
        posts = []

        // Load user info
        if let user = try? await SupabaseClient.shared.auth.session.user {
            userId = user.id
            // Fetch display name
            if let profile = try? await SupabaseClient.shared
                .from("user_profiles")
                .select("display_name")
                .eq("user_id", value: user.id.uuidString)
                .single()
                .execute()
                .value as [String: String]? {
                userName = profile["display_name"]
            }
        }

        // Load stats + type counts
        if let allPosts = try? await SupabaseClient.shared
            .from("community_posts")
            .select("user_id, type")
            .execute()
            .value as [[String: String]]? {
            let golfers = Set(allPosts.compactMap { $0["user_id"] }).count
            let rounds  = allPosts.filter { $0["type"] == "round_recap" }.count
            let tips    = allPosts.filter { $0["type"] == "tip" }.count
            stats = (golfers: golfers, rounds: rounds, tips: tips)

            var counts: [String: Int] = [:]
            for p in allPosts { counts[p["type"] ?? "", default: 0] += 1 }
            typeCounts = counts
        }

        // Load first page of posts
        if let fetched = try? await service.fetchPosts(type: filter, page: 0) {
            posts = fetched
            hasMore = fetched.count == pageSize
        }
        loading = false
    }

    func setFilter(_ type: PostType?) async {
        filter = type
        await load()
    }

    func loadMore() async {
        guard !loading, hasMore else { return }
        loading = true
        page += 1
        if let fetched = try? await service.fetchPosts(type: filter, page: page) {
            posts.append(contentsOf: fetched)
            hasMore = fetched.count == pageSize
        }
        loading = false
    }

    func react(postId: UUID, emoji: String) async {
        guard let userId else { return }
        try? await service.toggleReaction(postId: postId, userId: userId, emoji: emoji, currentEmoji: nil)
    }
}

// MARK: - Color extension

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int         & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
