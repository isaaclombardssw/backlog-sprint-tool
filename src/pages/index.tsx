import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Layout, Card, Button, Select, Input, Table, Space, Avatar, Divider, message } from 'antd';
import { CopyOutlined, CheckOutlined, MailOutlined } from '@ant-design/icons';
import SprintDetails from "../components/SprintDetails";

const { Header, Content } = Layout;
const { Option } = Select;

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

interface BacklogStats {
  newPBIs: {
    count: number;
    issues: Array<{
      number: number;
      title: string;
      created_at: string;
    }>;
  };
  yakShaverPBIs: {
    count: number;
    issues: Array<{
      number: number;
      title: string;
      created_at: string;
    }>;
  };
  completedPBIs: {
    count: number;
    issues: Array<{
      number: number;
      title: string;
      created_at: string;
      closed_at: string | null;
    }>;
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [customRepo, setCustomRepo] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<BacklogStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (session) {
      fetchRepositories();
    }
  }, [session]);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/repositories");
      if (!response.ok) throw new Error("Failed to fetch repositories");
      const data = await response.json();
      setRepos(data);
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedRepo && !customRepo) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const repo = selectedRepo || customRepo;
      const response = await fetch(`/api/backlog-stats?repo=${repo}`);
      if (!response.ok) throw new Error("Failed to fetch backlog statistics");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error generating stats:", error);
      setError("Failed to generate backlog statistics");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBacklogStats = async (format: 'markdown' | 'email') => {
    if (!stats) return;
    
    if (format === 'markdown') {
      const headers = ['Metric', 'Count'];
      const rows = [
        ['New PBIs', stats.newPBIs.count.toString()],
        ['PBIs with YakShaver Label', stats.yakShaverPBIs.count.toString()],
        ['Completed PBIs', stats.completedPBIs.count.toString()]
      ];

      const content = [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map(row => `| ${row.join(' | ')} |`)
      ].join('\n');

      await navigator.clipboard.writeText(content);
    } else {
      // Create RTF table
      const rtfHeader = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\n{\\colortbl;\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\n\\viewkind4\\uc1\\pard\\f0\\fs22\\par\n`;
      
      const rtfTable = `\\trowd\\trgaph108\\trleft-108\\trbrdrt\\brdrs\\brdrw10\\brdrcf1\\trbrdrl\\brdrs\\brdrw10\\brdrcf1\\trbrdrb\\brdrs\\brdrw10\\brdrcf1\\trbrdrr\\brdrs\\brdrw10\\brdrcf1\\trbrdrh\\brdrs\\brdrw10\\brdrcf1\\trbrdrv\\brdrs\\brdrw10\\brdrcf1\\clbrdrt\\brdrs\\brdrw10\\brdrcf1\\clbrdrl\\brdrs\\brdrw10\\brdrcf1\\clbrdrb\\brdrs\\brdrw10\\brdrcf1\\clbrdrr\\brdrs\\brdrw10\\brdrcf1\\cellx4000\\clbrdrt\\brdrs\\brdrw10\\brdrcf1\\clbrdrl\\brdrs\\brdrw10\\brdrcf1\\clbrdrb\\brdrs\\brdrw10\\brdrcf1\\clbrdrr\\brdrs\\brdrw10\\brdrcf1\\cellx8000\\pard\\intbl\\b Metric\\b0\\cell\\b Count\\b0\\cell\\row\n`;

      const rtfRows = [
        ['New PBIs', stats.newPBIs.count.toString()],
        ['PBIs with YakShaver Label', stats.yakShaverPBIs.count.toString()],
        ['Completed PBIs', stats.completedPBIs.count.toString()]
      ].map(row => `\\trowd\\trgaph108\\trleft-108\\trbrdrt\\brdrs\\brdrw10\\brdrcf1\\trbrdrl\\brdrs\\brdrw10\\brdrcf1\\trbrdrb\\brdrs\\brdrw10\\brdrcf1\\trbrdrr\\brdrs\\brdrw10\\brdrcf1\\trbrdrh\\brdrs\\brdrw10\\brdrcf1\\trbrdrv\\brdrs\\brdrw10\\brdrcf1\\clbrdrt\\brdrs\\brdrw10\\brdrcf1\\clbrdrl\\brdrs\\brdrw10\\brdrcf1\\clbrdrb\\brdrs\\brdrw10\\brdrcf1\\clbrdrr\\brdrs\\brdrw10\\brdrcf1\\cellx4000\\clbrdrt\\brdrs\\brdrw10\\brdrcf1\\clbrdrl\\brdrs\\brdrw10\\brdrcf1\\clbrdrb\\brdrs\\brdrw10\\brdrcf1\\clbrdrr\\brdrs\\brdrw10\\brdrcf1\\cellx8000\\pard\\intbl ${row[0]}\\cell ${row[1]}\\cell\\row\n`).join('');

      const rtfFooter = '\\pard\\par\n}';
      const rtfContent = rtfHeader + rtfTable + rtfRows + rtfFooter;

      const blob = new Blob([rtfContent], { type: 'text/rtf' });
      const data = [new ClipboardItem({ 'text/rtf': blob })];

      await navigator.clipboard.write(data);
    }

    message.success(`Table copied as ${format} format`);
    if (format === 'markdown') {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 3000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    }
  };

  const statsColumns = [
    {
      title: 'Metric',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const statsData = stats ? [
    {
      key: '1',
      metric: 'New PBIs',
      count: stats.newPBIs.count,
    },
    {
      key: '2',
      metric: 'PBIs with YakShaver Label',
      count: stats.yakShaverPBIs.count,
    },
    {
      key: '3',
      metric: 'Completed PBIs',
      count: stats.completedPBIs.count,
    },
  ] : [];

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Avatar src={session.user?.image} size="large" />
          <span>{session.user?.name}</span>
        </Space>
        <Button onClick={() => signOut()} type="primary" danger>
          Sign Out
        </Button>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Card title="Select a Repository">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Select
              placeholder="Choose from your repositories"
              style={{ width: '100%' }}
              value={selectedRepo}
              onChange={(value) => {
                setSelectedRepo(value);
                setCustomRepo("");
                setStats(null);
                setError(null);
              }}
            >
              {repos.map((repo) => (
                <Option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </Option>
              ))}
            </Select>

            <Divider>or</Divider>

            <Input
              placeholder="Enter a repository manually (format: owner/repo)"
              value={customRepo}
              onChange={(e) => {
                setCustomRepo(e.target.value);
                setSelectedRepo("");
                setStats(null);
                setError(null);
              }}
            />

            <Button
              type="primary"
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={!selectedRepo && !customRepo}
              block
            >
              Generate
            </Button>

            {error && (
              <div style={{ color: '#ff4d4f' }}>{error}</div>
            )}

            {stats && (
              <>
                <Card 
                  title="Backlog Statistics (Last 30 Days)"
                  extra={
                    <Space>
                      <Button 
                        icon={copiedMarkdown ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => copyBacklogStats('markdown')}
                        type="text"
                      >
                        Copy Markdown
                      </Button>
                      <Button 
                        icon={copiedEmail ? <CheckOutlined /> : <MailOutlined />}
                        onClick={() => copyBacklogStats('email')}
                        type="text"
                      >
                        Copy for Email
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    columns={statsColumns}
                    dataSource={statsData}
                    pagination={false}
                  />
                </Card>

                <Card title="Sprint Details">
                  <SprintDetails repo={selectedRepo || customRepo} />
                </Card>
              </>
            )}
          </Space>
        </Card>
      </Content>
    </Layout>
  );
} 