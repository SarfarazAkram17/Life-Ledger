# Messenger Clone

## Overview

Full-stack real-time messenger application with dark theme, built using a pnpm workspace monorepo. Uses custom email/password authentication (JWT-based, no Clerk).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod` (in shared packages)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS
- **Authentication**: Custom JWT (bcryptjs + jsonwebtoken), stored in localStorage
- **Real-time**: Socket.IO (WebSocket) with JWT auth on connection
- **Calling**: WebRTC (peer-to-peer)
- **File uploads**: Multer (disk storage)

## Features

- Custom email/password authentication with name field on signup
- Profile update (name, username, avatar photo upload)
- Real-time messaging via WebSocket (socket.io)
- File attachment uploads (images, documents, audio) — with or without caption text
- Voice and video calling (WebRTC + socket.io signaling)
- User info modal on click
- Real-time online status (via socket user_online/user_offline events)
- Auto mark messages as read when opening chat
- Separate private conversations
- Delete chat and message with modal confirmations
- Typing indicators
- Online/offline status with last-seen time
- Search users for new conversations
- Fully responsive (320px+)
- Dark theme by default

## Architecture

### Auth Flow
- Register: POST /api/auth/register → {name, username, email, password} → JWT token
- Login: POST /api/auth/login → {email, password} → JWT token
- Token stored in localStorage as `messenger_auth_token`
- All API calls use `Authorization: Bearer <token>`
- Socket.io connections verified with JWT in handshake auth

### Database Schema
- **users** - email, passwordHash, username, displayName, avatarUrl, isOnline, lastSeen, (clerkId nullable for compat)
- **conversations** - user1Id, user2Id pairs
- **messages** - conversationId, senderId, content, attachmentUrl/Name/Type, isRead

### WebSocket Events
- **Server → Client**: new_message, message_deleted, conversation_updated, user_online, user_offline, typing, call_offer, call_answer, ice_candidate, call_ended, profile_updated
- **Client → Server**: typing (with toUserId), call_offer, call_answer, ice_candidate, end_call
- Online status updates: real-time cache updates in React Query on user_online/user_offline events

### API Routes
- `/api/auth/register` - Register (name, username, email, password)
- `/api/auth/login` - Login → JWT token
- `/api/auth/me` - Get current user (requires auth)
- `/api/auth/profile` - Update profile (PATCH, requires auth)
- `/api/users/search` - Search users
- `/api/conversations` - CRUD conversations
- `/api/conversations/:id/messages` - CRUD messages (supports content + attachment together)
- `/api/conversations/:id/read` - Mark as read
- `/api/conversations/unread-counts` - Get unread counts
- `/api/upload` - File uploads
- `/api/files/:filename` - Serve uploaded files
- `/api/healthz` - Health check

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
