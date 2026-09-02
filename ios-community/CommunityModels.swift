import Foundation
import Supabase

// MARK: - Models

enum PostType: String, Codable, CaseIterable {
    case roundRecap   = "round_recap"
    case tip          = "tip"
    case question     = "question"
    case courseReview = "course_review"

    var label: String {
        switch self {
        case .roundRecap:   return "Round Recap"
        case .tip:          return "Tip"
        case .question:     return "Question"
        case .courseReview: return "Course Review"
        }
    }

    var emoji: String {
        switch self {
        case .roundRecap:   return "🏆"
        case .tip:          return "💡"
        case .question:     return "❓"
        case .courseReview: return "📍"
        }
    }

    var accentColor: String {
        switch self {
        case .roundRecap:   return "#34D399"
        case .tip:          return "#FBBF24"
        case .question:     return "#38BDF8"
        case .courseReview: return "#A78BFA"
        }
    }
}

struct CommunityPost: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: PostType
    let title: String
    let content: String
    let courseName: String?
    let roundScore: Int?
    let roundPar: Int?
    let roundGir: Int?
    let roundPutts: Double?
    let createdAt: Date
    let authorName: String

    var scoreDiff: String? {
        guard let score = roundScore, let par = roundPar else { return nil }
        let d = score - par
        if d == 0 { return "E" }
        return d > 0 ? "+\(d)" : "\(d)"
    }

    enum CodingKeys: String, CodingKey {
        case id, type, title, content
        case userId      = "user_id"
        case courseName  = "course_name"
        case roundScore  = "round_score"
        case roundPar    = "round_par"
        case roundGir    = "round_gir"
        case roundPutts  = "round_putts"
        case createdAt   = "created_at"
        case authorName  = "author_name"
    }
}

struct CommunityComment: Codable, Identifiable {
    let id: UUID
    let postId: UUID
    let userId: UUID
    let authorName: String
    let content: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, content
        case postId     = "post_id"
        case userId     = "user_id"
        case authorName = "author_name"
        case createdAt  = "created_at"
    }
}

struct CommunityReaction: Codable {
    let postId: UUID
    let userId: UUID
    let emoji: String

    enum CodingKeys: String, CodingKey {
        case emoji
        case postId  = "post_id"
        case userId  = "user_id"
    }
}

// MARK: - Service

@MainActor
class CommunityService: ObservableObject {
    static let shared = CommunityService()
    private let client = SupabaseClient.shared  // replace with however you access supabase in your app

    // MARK: Posts

    func fetchPosts(type: PostType? = nil, page: Int = 0) async throws -> [CommunityPost] {
        let pageSize = 20
        var query = client
            .from("community_posts")
            .select("id, user_id, type, title, content, course_name, round_score, round_par, round_gir, round_putts, created_at, author_name")
            .order("created_at", ascending: false)
            .range(from: page * pageSize, to: (page + 1) * pageSize - 1)

        if let type {
            query = query.eq("type", value: type.rawValue)
        }

        return try await query.execute().value
    }

    func fetchPost(id: UUID) async throws -> CommunityPost {
        return try await client
            .from("community_posts")
            .select("id, user_id, type, title, content, course_name, round_score, round_par, round_gir, round_putts, created_at, author_name")
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    func createPost(
        userId: UUID,
        authorName: String,
        type: PostType,
        title: String,
        content: String,
        courseName: String? = nil,
        roundScore: Int? = nil,
        roundPar: Int? = nil
    ) async throws -> CommunityPost {
        struct NewPost: Encodable {
            let user_id: String
            let author_name: String
            let type: String
            let title: String
            let content: String
            let course_name: String?
            let round_score: Int?
            let round_par: Int?
        }
        let body = NewPost(
            user_id: userId.uuidString,
            author_name: authorName,
            type: type.rawValue,
            title: title,
            content: content,
            course_name: courseName,
            round_score: roundScore,
            round_par: roundPar
        )
        return try await client
            .from("community_posts")
            .insert(body)
            .select()
            .single()
            .execute()
            .value
    }

    // MARK: Comments

    func fetchComments(postId: UUID) async throws -> [CommunityComment] {
        return try await client
            .from("community_comments")
            .select("id, post_id, user_id, author_name, content, created_at")
            .eq("post_id", value: postId.uuidString)
            .order("created_at", ascending: true)
            .execute()
            .value
    }

    func addComment(postId: UUID, userId: UUID, authorName: String, content: String) async throws -> CommunityComment {
        struct NewComment: Encodable {
            let post_id: String
            let user_id: String
            let author_name: String
            let content: String
        }
        let body = NewComment(
            post_id: postId.uuidString,
            user_id: userId.uuidString,
            author_name: authorName,
            content: content
        )
        return try await client
            .from("community_comments")
            .insert(body)
            .select()
            .single()
            .execute()
            .value
    }

    // MARK: Reactions

    func fetchReactions(postId: UUID) async throws -> [CommunityReaction] {
        return try await client
            .from("community_reactions")
            .select("post_id, user_id, emoji")
            .eq("post_id", value: postId.uuidString)
            .execute()
            .value
    }

    func toggleReaction(postId: UUID, userId: UUID, emoji: String, currentEmoji: String?) async throws {
        if currentEmoji == emoji {
            try await client
                .from("community_reactions")
                .delete()
                .eq("post_id", value: postId.uuidString)
                .eq("user_id", value: userId.uuidString)
                .execute()
        } else {
            if currentEmoji != nil {
                try await client
                    .from("community_reactions")
                    .delete()
                    .eq("post_id", value: postId.uuidString)
                    .eq("user_id", value: userId.uuidString)
                    .execute()
            }
            struct NewReaction: Encodable {
                let post_id: String
                let user_id: String
                let emoji: String
            }
            try await client
                .from("community_reactions")
                .insert(NewReaction(post_id: postId.uuidString, user_id: userId.uuidString, emoji: emoji))
                .execute()
        }
    }
}

// MARK: - Helpers

func timeAgo(_ date: Date) -> String {
    let s = Int(Date().timeIntervalSince(date))
    if s < 60     { return "just now" }
    if s < 3600   { return "\(s / 60)m ago" }
    if s < 86400  { return "\(s / 3600)h ago" }
    if s < 604800 { return "\(s / 86400)d ago" }
    let f = DateFormatter()
    f.dateFormat = "MMM d"
    return f.string(from: date)
}

func avatarColor(for name: String) -> String {
    let colors = ["#0D2818", "#1a3a4a", "#2d1b4e", "#4a1942", "#1a4a2e"]
    let idx = Int(name.unicodeScalars.first?.value ?? 0) % colors.count
    return colors[idx]
}
