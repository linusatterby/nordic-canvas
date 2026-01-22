# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

The following environment variables can be configured:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DEMO_DEBUG` | `false` | Enable debug panels and technical info in demo mode. Set to `true` for development. |
| `VITE_DEMO_ENABLED` | `true` | Master switch for demo functionality. Set to `false` to completely disable demo features. |
| `VITE_ALLOW_DEMO_SEED` | `false` | Allow demo scenario seeding. Set to `true` in development to enable "Återställ demo" button. |

### Development Setup

For local development with demo features enabled, create a `.env.local` file:

```sh
VITE_DEMO_DEBUG=true
VITE_DEMO_ENABLED=true
VITE_ALLOW_DEMO_SEED=true
```

### Production Setup

For production builds, use these recommended settings:

```sh
VITE_DEMO_DEBUG=false
VITE_DEMO_ENABLED=false
VITE_ALLOW_DEMO_SEED=false
```

## Production Readiness Checklist

Before going live, ensure the following:

### 1. Environment Variables
- [ ] `VITE_DEMO_DEBUG=false` - Hides debug panels from users
- [ ] `VITE_DEMO_ENABLED=false` - Disables demo mode completely (optional, keep `true` if you want demo)
- [ ] `VITE_ALLOW_DEMO_SEED=false` - Prevents demo data seeding

### 2. Authentication Security (Lovable Cloud)
- [ ] **Leaked Password Protection**: Enable in Lovable Cloud → Auth settings to block compromised passwords
- [ ] **Email Confirmation**: Consider enabling email verification for production (disable auto-confirm)
- [ ] **Rate Limiting**: Review default rate limits for auth endpoints

### 3. Database Security
- [ ] All tables have appropriate RLS policies
- [ ] Demo data is isolated with `is_demo` flags
- [ ] Public views expose only necessary fields

### 4. Admin Health Check
Visit `/admin/health` to verify:
- Environment flag status
- Configuration warnings
- Security recommendations

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
