import * as React from 'react';
import {useEffect, useState} from 'react';
import {Alert, Button, message, Popconfirm, Table, Typography} from 'antd';
import {http} from '../../../utils/http';

interface AuthorizedApp {
  clientId: string;
  name: string;
  scopes: string[];
  authorizedAt: number;
  expiresAt: number;
}

export default function McpAuthorizations() {
  const [applications, setApplications] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    http.get<AuthorizedApp[]>('/admin/api/mcp').subscribe(res => {
      setLoading(false);
      if (res.errno === 0 && Array.isArray(res.data)) setApplications(res.data);
      else message.error('读取已授权应用失败');
    }, () => {
      setLoading(false);
      message.error('读取已授权应用失败');
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const revoke = (clientId: string) => {
    setRevoking(clientId);
    http.delete<any>('/admin/api/mcp/' + encodeURIComponent(clientId)).subscribe(res => {
      setRevoking(null);
      if (res.errno !== 0) {
        message.error('撤销授权失败');
        return;
      }
      message.success('授权已撤销');
      refresh();
    }, () => {
      setRevoking(null);
      message.error('撤销授权失败');
    });
  };

  return <div style={{padding: 24}}>
    <Typography.Title level={4}>已授权 AI 应用</Typography.Title>
    <Alert type="info" showIcon message="这些应用通过 Firekylin OAuth 登录获得访问权限。撤销后，该应用的 Access Token 和 Refresh Token 将失效。" />
    <div style={{margin: '16px 0'}}>
      <Button onClick={refresh} loading={loading}>刷新</Button>
    </div>
    <Table<AuthorizedApp>
      rowKey="clientId"
      loading={loading}
      dataSource={applications}
      pagination={false}
      columns={[
        {title: '应用', dataIndex: 'name', key: 'name'},
        {title: '授权范围', dataIndex: 'scopes', key: 'scopes',
          render: (scopes: string[]) => scopes.join('、')},
        {title: '授权时间', dataIndex: 'authorizedAt', key: 'authorizedAt',
          render: (value: number) => value ? new Date(value).toLocaleString() : '—'},
        {title: '操作', key: 'actions',
          render: (_: unknown, record: AuthorizedApp) =>
            <Popconfirm title={'确定撤销 ' + record.name + ' 的授权？'}
              onConfirm={() => revoke(record.clientId)}
              okText="撤销" cancelText="取消">
              <Button danger loading={revoking === record.clientId}>撤销授权</Button>
            </Popconfirm>}
      ]}
    />
  </div>;
}
