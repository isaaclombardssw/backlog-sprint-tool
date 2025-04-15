import { useState } from 'react';
import { Table, Space, Avatar, Tag, Spin, Button, Input, message } from 'antd';
import { CopyOutlined, CheckOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface SprintItem {
  id: string;
  content: {
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
  fieldValues: {
    nodes: Array<{
      field?: {
        name?: string;
      };
      text?: string;
      date?: string;
      name?: string;
      number?: number;
    }>;
  };
}

interface SprintDetailsProps {
  repo: string;
}

export default function SprintDetails({ repo }: SprintDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintItems, setSprintItems] = useState<SprintItem[]>([]);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [sprintNumber, setSprintNumber] = useState<string>('');

  const fetchSprintDetails = async () => {
    if (!sprintNumber) {
      setError("Please enter a sprint number");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/sprint-details?repo=${repo}&sprint=${sprintNumber}`);
      if (!response.ok) throw new Error("Failed to fetch sprint details");
      const data = await response.json();
      
      // Get the first project's items
      const items = data.repository.projectsV2.nodes[0]?.items.nodes || [];
      setSprintItems(items);

      // Log debug information
      console.log('Sprint Details Debug:', {
        projectTitle: data.debug.projectTitle,
        projectNumber: data.debug.projectNumber,
        totalItems: data.debug.totalItems,
        currentSprintItems: data.debug.currentSprintItems,
        foundFields: data.debug.foundFields
      });
    } catch (error) {
      console.error("Error fetching sprint details:", error);
      setError("Failed to fetch sprint details");
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (item: SprintItem, fieldName: string) => {
    const fieldValue = item.fieldValues.nodes.find(node => node.field?.name === fieldName);
    if (!fieldValue) return null;
    return fieldValue.text || fieldValue.name || fieldValue.number || 
           (fieldValue.date ? new Date(fieldValue.date).toLocaleDateString() : null);
  };

  const copySprintDetails = async (format: 'markdown' | 'email') => {
    if (!sprintItems.length) return;
    
    if (format === 'markdown') {
      const headers = ['ID', 'Title', 'Assignee', 'Status', 'Estimate'];
      const rows = sprintItems.map(item => [
        `[#${item.content.number}](${item.content.url})`,
        item.content.title,
        item.content.assignees.nodes[0]?.login || 'Unassigned',
        getFieldValue(item, 'Status') || 'Not set',
        getFieldValue(item, 'Estimate') || 'Not set'
      ]);

      const markdownTable = [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map(row => `| ${row.join(' | ')} |`)
      ].join('\n');

      await navigator.clipboard.writeText(markdownTable);
    } else {
      // Create HTML table
      const htmlTable = `
        <table style="border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ID</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Title</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Assignee</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Estimate</th>
            </tr>
          </thead>
          <tbody>
            ${sprintItems.map(item => {
              const assignee = item.content.assignees.nodes[0]?.login || 'Unassigned';
              const status = getFieldValue(item, 'Status') || 'Not set';
              const estimate = getFieldValue(item, 'Estimate') || 'Not set';
              
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    <a href="${item.content.url}" style="color: #0366d6; text-decoration: none;">#${item.content.number}</a>
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.content.title}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${assignee}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${status}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${estimate}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      const blob = new Blob([htmlTable], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      
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

  const columns: ColumnsType<SprintItem> = [
    {
      title: 'ID',
      key: 'id',
      render: (_, item) => <a href={item.content.url} target="_blank" rel="noopener noreferrer">#{item.content.number}</a>,
    },
    {
      title: 'Title',
      key: 'title',
      render: (_, item) => (
        <a href={item.content.url} target="_blank" rel="noopener noreferrer">
          {item.content.title}
        </a>
      ),
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, item) => {
        const assignee = item.content.assignees.nodes[0];
        return assignee ? (
          <Space>
            <Avatar src={assignee.avatarUrl} size="small" />
            {assignee.login}
          </Space>
        ) : (
          <span style={{ color: '#00000040' }}>Unassigned</span>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, item) => {
        const status = getFieldValue(item, 'Status');
        return status || 'Not set';
      },
    },
    {
      title: 'Estimate',
      key: 'estimate',
      render: (_, item) => {
        const estimate = getFieldValue(item, 'Estimate');
        return estimate || 'Not set';
      },
    },
    {
      title: 'Labels',
      key: 'labels',
      render: (_, item) => (
        <Space wrap>
          {item.content.labels.nodes.map(label => (
            <Tag key={label.name} color={`#${label.color}`}>
              {label.name}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  if (loading) return <Spin />;
  if (error) return <div style={{ color: '#ff4d4f' }}>{error}</div>;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Space>
        <Input
          placeholder="Enter sprint number"
          value={sprintNumber}
          onChange={(e) => setSprintNumber(e.target.value)}
          style={{ width: 200 }}
        />
        <Button type="primary" onClick={fetchSprintDetails}>
          Generate Sprint Details
        </Button>
      </Space>
      
      {sprintItems.length > 0 && (
        <>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={copiedMarkdown ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => copySprintDetails('markdown')}
                type="text"
              >
                Copy Markdown
              </Button>
              <Button
                icon={copiedEmail ? <CheckOutlined /> : <MailOutlined />}
                onClick={() => copySprintDetails('email')}
                type="text"
              >
                Copy for Email
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={sprintItems}
            rowKey={item => item.id}
            pagination={false}
          />
        </>
      )}
    </Space>
  );
} 