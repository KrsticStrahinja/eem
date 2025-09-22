# Nuxt Minimal Starter

## Supabase setup

Create a local `.env` file in the project root with your project credentials from Supabase (Dashboard → Settings → API). The Nuxt Supabase module reads these automatically:

```env
NUXT_SUPABASE_URL=your-project-url
NUXT_SUPABASE_ANON_KEY=your-anon-key
```

Where to find them: [Supabase API settings](https://supabase.com/dashboard/project/_/settings/api).

After adding the variables, restart the dev server.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
