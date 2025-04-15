import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";
import type { NextApiRequest, NextApiResponse } from "next";

interface Issue {
  title: string;
  number: number;
  created_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
}

interface IssueOptions {
  state: "all" | "open" | "closed";
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  labels?: string;
}

async function getAllIssues(octokit: Octokit, owner: string, repo: string, options: IssueOptions): Promise<Issue[]> {
  let allIssues: Issue[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      ...options,
      per_page: 100, // Maximum allowed per page
      page,
    });

    // Transform the issues to match our Issue interface and filter out PRs
    const transformedIssues = issues
      .filter(issue => !issue.pull_request) // Filter out PRs
      .map(issue => ({
        title: issue.title,
        number: issue.number,
        created_at: issue.created_at,
        closed_at: issue.closed_at,
        labels: issue.labels.map(label => ({
          name: typeof label === 'string' ? label : label.name || ''
        }))
      }));

    allIssues = [...allIssues, ...transformedIssues];
    
    // If we got less than 100 issues, we've reached the end
    if (issues.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allIssues;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { repo } = req.query;
  if (!repo || typeof repo !== "string") {
    return res.status(400).json({ error: "Repository parameter is required" });
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  try {
    const [owner, repoName] = repo.split("/");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all issues and filter them in memory
    const allIssues = await getAllIssues(octokit, owner, repoName, {
      state: "all",
      sort: "created",
      direction: "desc",
    });

    // Filter for issues created in the last 30 days
    const newIssues = allIssues.filter(issue => 
      new Date(issue.created_at) >= thirtyDaysAgo
    );

    // Get PBIs with YakShaver label
    const yakShaverIssues = allIssues.filter(issue => 
      issue.labels.some(label => label.name === "YakShaver") &&
      new Date(issue.created_at) >= thirtyDaysAgo
    );

    // Get completed PBIs (issues closed in the last 30 days)
    const completedIssues = allIssues.filter(issue => 
      issue.closed_at && new Date(issue.closed_at) >= thirtyDaysAgo
    );

    res.status(200).json({
      newPBIs: {
        count: newIssues.length,
        issues: newIssues.map(issue => ({
          number: issue.number,
          title: issue.title,
          created_at: issue.created_at,
        })),
      },
      yakShaverPBIs: {
        count: yakShaverIssues.length,
        issues: yakShaverIssues.map(issue => ({
          number: issue.number,
          title: issue.title,
          created_at: issue.created_at,
        })),
      },
      completedPBIs: {
        count: completedIssues.length,
        issues: completedIssues.map(issue => ({
          number: issue.number,
          title: issue.title,
          created_at: issue.created_at,
          closed_at: issue.closed_at,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching backlog statistics:", error);
    res.status(500).json({ error: "Failed to fetch backlog statistics" });
  }
} 