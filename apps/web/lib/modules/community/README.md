# Community Module (`lib/modules/community/`)

Community discussions module — posts, comments, and likes.

## Structure

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
- Index: `{ createdAt: -1 }` — sort by newest

## API Endpoints

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

`validatePostRequest(postId)` — validates:
1. Post existence
2. If user is author $\rightarrow$ full CRUD permissions
3. If not author $\rightarrow$ read-only access

## Module Invariants

- No cross-module model imports
- `index.ts` exclusively handles `registerModel()` calls
- Pure service functions without unnecessary DI boilerplate
