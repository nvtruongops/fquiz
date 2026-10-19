# Web client stores

This directory contains client-side Zustand state that is shared across Web components, including quiz-session and toast state.

Use a store for client state that needs coordination across components. Server records remain authoritative; persistence and optimistic state must be reconciled with server responses. Check current store types before copying examples into other docs.
