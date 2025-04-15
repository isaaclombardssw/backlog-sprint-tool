import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";
import type { NextApiRequest, NextApiResponse } from "next";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  stargazers_count: number;
  language: string | null;
}

interface GraphQLResponse {
  user: {
    repositoriesContributedTo: {
      nodes: Array<{
        id: string;
        name: string;
        nameWithOwner: string;
        description: string | null;
        url: string;
        updatedAt: string;
        stargazerCount: number;
        primaryLanguage: {
          name: string;
        } | null;
      }>;
    };
  };
}

const query = `
  query UserContributions($username: String!) {
    user(login: $username) {
      repositoriesContributedTo(
        first: 100,
        contributionTypes: [COMMIT, PULL_REQUEST],
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          id
          name
          nameWithOwner
          description
          url
          updatedAt
          stargazerCount
          primaryLanguage {
            name
          }
        }
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  try {
    // Get the user's GitHub username from their email
    const { data: userData } = await octokit.users.getAuthenticated();
    const githubUsername = userData.login;

    const response = await octokit.graphql<GraphQLResponse>(query, {
      username: githubUsername,
    });

    const repos: Repository[] = response.user.repositoriesContributedTo.nodes.map(repo => ({
      id: parseInt(repo.id),
      name: repo.name,
      full_name: repo.nameWithOwner,
      description: repo.description,
      html_url: repo.url,
      updated_at: repo.updatedAt,
      stargazers_count: repo.stargazerCount,
      language: repo.primaryLanguage?.name || null
    }));

    res.status(200).json(repos);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
} 