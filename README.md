# Email Generator for GitHub Backlog & Sprint Management 🚀

A Next.js application that helps teams generate email-friendly reports for GitHub backlog statistics and sprint details. Built with ❤️ and fully vibe coded.

## Features ✨

- **GitHub Authentication**: Secure login using GitHub OAuth
- **Backlog Statistics**: Generate 30-day reports including:
  - New PBIs created
  - PBIs with YakShaver label
  - Completed PBIs
- **Sprint Details**: View and export sprint information including:
  - Issue details
  - Assignees
  - Status
  - Estimates
- **Export Options**:
  - Copy as Markdown for documentation
  - Copy as HTML for email-friendly tables
- **Modern UI**: Built with Ant Design for a polished user experience

## Tech Stack 🛠️

- **Frontend**: Next.js, React, TypeScript
- **UI**: Ant Design
- **Authentication**: NextAuth.js
- **API**: GitHub GraphQL API
- **Styling**: CSS-in-JS

## Getting Started 🚀

### Prerequisites

- Node.js (v18 or later)
- pnpm (recommended) or npm/yarn
- GitHub OAuth App credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/email-gen.git
cd email-gen
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with the following variables:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-a-random-string>
GITHUB_ID=<your-github-client-id>
GITHUB_SECRET=<your-github-client-secret>
```

4. Run the development server:
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables 🔑

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | The base URL of your application |
| `NEXTAUTH_SECRET` | A random string used to encrypt the JWT |
| `GITHUB_ID` | Your GitHub OAuth app client ID |
| `GITHUB_SECRET` | Your GitHub OAuth app client secret |

## GitHub OAuth Setup 🔐

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Create a new OAuth App
3. Set the following:
   - Application name: Your app name
   - Homepage URL: Your app URL
   - Authorization callback URL: `{NEXTAUTH_URL}/api/auth/callback/github`
4. Copy the Client ID and generate a new Client Secret

## Contributing 🤝

This project was vibe coded with love. Feel free to contribute by:

1. Forking the repository
2. Creating a feature branch
3. Making your changes
4. Submitting a pull request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Built with Next.js
- Styled with Ant Design
- Powered by GitHub's API
- Made possible by the amazing open-source community

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
