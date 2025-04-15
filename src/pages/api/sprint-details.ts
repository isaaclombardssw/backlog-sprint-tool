import { getSession } from "next-auth/react";
import { Octokit } from "@octokit/rest";
import type { NextApiRequest, NextApiResponse } from "next";

interface ProjectResponse {
  repository: {
    projectsV2: {
      nodes: Array<{
        id: string;
        title: string;
        number: number;
        closed: boolean;
        fields: {
          nodes: Array<{
            id: string;
            name: string;
            __typename?: string;
            configuration?: {
              iterations: Array<{
                id: string;
                title: string;
                startDate: string;
                duration: number;
              }>;
            };
          }>;
        };
      }>;
    };
  };
}

interface SprintItemsResponse {
  node: {
    items: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: Array<{
        id: string;
        fieldValues: {
          nodes: Array<{
            __typename: string;
            field?: {
              id?: string;
              name?: string;
            };
            title?: string;
            text?: string;
            number?: number;
          }>;
        };
        content: {
          id: string;
          number: number;
          title: string;
          url: string;
          assignees: {
            nodes: Array<{
              login: string;
              avatarUrl: string;
            }>;
          };
          labels: {
            nodes: Array<{
              name: string;
              color: string;
            }>;
          };
        };
      }>;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Starting sprint details request');
  const session = await getSession({ req });
  
  if (!session?.accessToken) {
    console.log('No session or access token found');
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { repo, sprint } = req.query;
  if (!repo || typeof repo !== "string") {
    console.log('Invalid repo parameter:', repo);
    return res.status(400).json({ error: "Repository parameter is required" });
  }

  if (!sprint || typeof sprint !== "string") {
    console.log('Invalid sprint parameter:', sprint);
    return res.status(400).json({ error: "Sprint parameter is required" });
  }

  const [owner, repoName] = repo.split("/");
  console.log('Processing repository:', { owner, repoName, sprint });

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  try {
    console.log('Executing first query to get project details');
    // First query: Get active project and its fields
    const projectQuery = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          projectsV2(first: 100) {
            nodes {
              id
              title
              number
              closed
              fields(first: 20) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                    __typename
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    __typename
                    options {
                      id
                      name
                    }
                  }
                  ... on ProjectV2IterationField {
                    id
                    name
                    __typename
                    configuration {
                      iterations {
                        id
                        title
                        startDate
                        duration
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const projectResponse = await octokit.graphql<ProjectResponse>(projectQuery, {
      owner,
      name: repoName,
    });
    console.log('Project response received:', {
      projectsCount: projectResponse.repository.projectsV2.nodes.length,
      projects: projectResponse.repository.projectsV2.nodes.map(p => ({
        id: p.id,
        title: p.title,
        closed: p.closed,
        fields: p.fields.nodes.map(f => ({
          id: f.id,
          name: f.name,
          __typename: f.__typename
        }))
      }))
    });

    // Find the first active project
    const activeProject = projectResponse.repository.projectsV2.nodes.find(project => !project.closed);
    if (!activeProject) {
      console.log('No active project found');
      return res.status(404).json({ error: "No active project found" });
    }
    console.log('Found active project:', {
      id: activeProject.id,
      title: activeProject.title,
      number: activeProject.number
    });

    // Find all fields that might be sprint-related
    const sprintFields = activeProject.fields.nodes
      .filter(field => 
        field.name.toLowerCase().includes('sprint') ||
        field.name.toLowerCase().includes('iteration')
      );

    console.log('Found sprint-related fields:', sprintFields);

    if (sprintFields.length === 0) {
      console.log('No sprint-related fields found');
      return res.status(404).json({ error: "No sprint-related fields found in project" });
    }

    // Get the first sprint field
    const sprintField = sprintFields[0];
    console.log('Using sprint field:', sprintField);

    // Second query: Get items for the current sprint
    console.log('Executing second query to get sprint items');
    const sprintItemsQuery = `
      query($projectId: ID!, $after: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      field {
                        ... on ProjectV2Field {
                          id
                          name
                        }
                      }
                      text
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      field {
                        ... on ProjectV2SingleSelectField {
                          id
                          name
                        }
                      }
                      name
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      field {
                        ... on ProjectV2IterationField {
                          id
                          name
                        }
                      }
                      title
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      field {
                        ... on ProjectV2Field {
                          id
                          name
                        }
                      }
                      number
                    }
                  }
                }
                content {
                  ... on Issue {
                    id
                    number
                    title
                    url
                    assignees(first: 1) {
                      nodes {
                        login
                        avatarUrl
                      }
                    }
                    labels(first: 5) {
                      nodes {
                        name
                        color
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    let allItems: SprintItemsResponse['node']['items']['nodes'] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    let pageCount = 0;

    while (hasNextPage) {
      pageCount++;
      console.log(`Fetching page ${pageCount} with cursor:`, endCursor);
      
      const sprintItemsResponse: SprintItemsResponse = await octokit.graphql<SprintItemsResponse>(sprintItemsQuery, {
        projectId: activeProject.id,
        after: endCursor
      });

      console.log(`Page ${pageCount} received ${sprintItemsResponse.node.items.nodes.length} items`);

      // Filter items that are in the specified sprint
      const currentSprintItems = sprintItemsResponse.node.items.nodes.filter((item: SprintItemsResponse['node']['items']['nodes'][0]) => {
        const sprintValue = item.fieldValues.nodes.find((node: SprintItemsResponse['node']['items']['nodes'][0]['fieldValues']['nodes'][0]) => 
          node.field?.id === sprintField.id
        );
        if (!sprintValue?.title) return false;
        const matches = sprintValue.title === `Sprint ${sprint}`;
        if (matches) {
          const estimate = item.fieldValues.nodes.find(node => node.field?.name === 'Estimate');
          console.log(`Found matching item: ${item.content.title} (${item.content.number}) in ${sprintValue.title}, estimate:`, estimate?.number || 'unset');
        }
        return matches;
      });

      console.log(`Page ${pageCount} has ${currentSprintItems.length} items matching sprint ${sprint}`);

      allItems = [...allItems, ...currentSprintItems];

      hasNextPage = sprintItemsResponse.node.items.pageInfo.hasNextPage;
      endCursor = sprintItemsResponse.node.items.pageInfo.endCursor;

      // Only stop if we've reached the last page
      if (!hasNextPage) {
        console.log(`Reached last page (${pageCount}), stopping pagination`);
        break;
      }
    }

    console.log(`Total pages processed: ${pageCount}`);
    console.log(`Total items found for sprint ${sprint}: ${allItems.length}`);

    res.status(200).json({
      repository: {
        projectsV2: {
          nodes: [{
            id: activeProject.id,
            title: activeProject.title,
            number: activeProject.number,
            items: {
              nodes: allItems
            }
          }]
        }
      },
      debug: {
        projectTitle: activeProject.title,
        projectNumber: activeProject.number,
        totalItems: allItems.length,
        foundFields: {
          iterationFields: sprintFields.map(f => f.name)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching sprint details:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    if (error instanceof Error && error.message?.includes('rate limit exceeded')) {
      res.status(429).json({ error: "GitHub API rate limit exceeded. Please try again later." });
    } else {
      res.status(500).json({ error: "Failed to fetch sprint details" });
    }
  }
} 