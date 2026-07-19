# Community Module (`lib/modules/community/`)

Module quản lý thảo luận cộng đồng — posts, comments, likes.

## Cấu trúc

```
community/
├── models/
│   └── Post.ts              # Post model (embedded Comments, likes, tags)
├── utils.ts                 # validatePostRequest() authorization
└── index.ts                 # registerModel() bootstrap
```

## Post Model

```typescript
interface IPost {
  _id: ObjectId
  title: string
  content: string
  authorId: ObjectId         // ref: User
  authorName: string         // denormalized
  tags: string[]
  likes: ObjectId[]          // ref: User[]
  comments: IComment[]       // embedded subdocuments
  createdAt: Date
  updatedAt: Date
}

interface IComment {
  _id: ObjectId
  authorId: ObjectId
  authorName: string         // denormalized
  content: string
  createdAt: Date
}
```

## Indexes

- Text index: `{ title, tags }` — full-text search
- `{ createdAt: -1 }` — sort by newest

## API

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/community/posts` | Student |
| POST | `/api/community/posts` | Student |
| GET | `/api/community/posts/[id]` | Student |
| PUT | `/api/community/posts/[id]` | Student |
| DELETE | `/api/community/posts/[id]` | Student |
| POST | `/api/community/posts/[id]/comments` | Student |
| POST | `/api/community/posts/[id]/like` | Student |

## Authorization

`validatePostRequest(postId)` — kiểm tra:
1. Post tồn tại
2. User là author → full CRUD
3. Không phải author → read-only

## Module Rules

- Không import model từ module khác
- `index.ts` chỉ chứa `registerModel()` call
- Không dùng DI container (legacy pattern)
