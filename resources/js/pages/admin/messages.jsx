import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { App, Button, Divider, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useForgeApi } from '@route-forge/react';
import { messageOf, pageOf } from '@/support/api.js';
import { MESSAGE_STATUS_OPTIONS, messageStatusMeta } from '@/support/enums.js';

/**
 * 留言管理：搜索 + 状态筛选 + 分页 + 详情弹窗 + 状态流转（new→read→replied→archived，可退回未读）。
 * 留言不能新建/编辑内容，唯一写接口 messages.update 只推进状态；无删除（企业线索不可找回）。
 * 仪表盘「未读留言」卡带 ?status=new 跳入，故初始状态从 URL query 预置。
 */
export default function MessagesPage() {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage.' });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [detail, setDetail] = useState(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      const res = await call('messages.index', {
        query: { page, keyword: keyword || undefined, status: status || undefined },
      }).catch((error) => ({ error }));
      setLoading(false);
      if (res.error) {
        message.error(messageOf(res.error));
        return;
      }
      const { items, meta: m } = pageOf(res);
      setRows(items);
      setMeta(m);
    },
    [call, keyword, status, message],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setStatusOf(row, next) {
    const res = await call('messages.update', { params: { message: row.id }, body: { status: next } }).catch((error) => ({
      error,
    }));
    if (res.error) {
      message.error(messageOf(res.error));
      return;
    }
    message.success('已更新状态');
    if (detail) setDetail(null);
    load(meta.current_page || 1);
  }

  /** 行内与详情弹窗共用一套条件流转按钮。 */
  function transitionButtons(row, size = 'small') {
    const btns = [];
    if (row.status === 'new') {
      btns.push(
        <Button key="read" type="link" size={size} onClick={() => setStatusOf(row, 'read')}>
          标已读
        </Button>,
      );
    }
    if (row.status === 'new' || row.status === 'read') {
      btns.push(
        <Button key="replied" type="link" size={size} onClick={() => setStatusOf(row, 'replied')}>
          已回复
        </Button>,
      );
    }
    if (row.status !== 'new') {
      btns.push(
        <Button key="unread" type="link" size={size} onClick={() => setStatusOf(row, 'new')}>
          退回未读
        </Button>,
      );
    }
    if (row.status !== 'archived') {
      btns.push(
        <Button key="archived" type="link" size={size} onClick={() => setStatusOf(row, 'archived')}>
          归档
        </Button>,
      );
    }
    return btns;
  }

  const columns = [
    {
      title: '来信人',
      render: (_, row) => (
        <div>
          <div className={row.status === 'new' ? 'font-semibold text-gray-900' : 'font-semibold text-gray-600'}>
            {row.name}
          </div>
          <div className="text-xs text-gray-400">{row.email}</div>
        </div>
      ),
    },
    { title: '公司', dataIndex: 'company' },
    { title: '主题', dataIndex: 'subject' },
    {
      title: '内容',
      render: (_, row) => <span className="block max-w-xs truncate text-sm text-gray-500">{row.message}</span>,
    },
    {
      title: '状态',
      width: 90,
      render: (_, row) => {
        const m = messageStatusMeta(row.status);
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    { title: '时间', width: 120, render: (_, row) => <span className="text-xs text-gray-400">{(row.created_at ?? '').slice(0, 10)}</span> },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setDetail(row)}>
            查看
          </Button>
          {transitionButtons(row)}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space className="mb-4" wrap>
        <Input
          allowClear
          style={{ width: 256 }}
          placeholder="按来信人 / 邮箱 / 主题 / 内容搜索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => load(1)}
        />
        <Select
          allowClear
          style={{ width: 144 }}
          placeholder="全部状态"
          value={status || undefined}
          onChange={(v) => setStatus(v ?? '')}
          options={MESSAGE_STATUS_OPTIONS}
        />
        <Button onClick={() => load(1)}>查询</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: meta.current_page,
          pageSize: meta.per_page ?? 10,
          total: meta.total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page) => load(page),
        }}
      />

      <Modal
        title="留言详情"
        width={560}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={
          detail
            ? [
                ...transitionButtons(detail).map((b) => (
                  <span key={b.key} className="inline-block">
                    {b}
                  </span>
                )),
                <Button key="close" onClick={() => setDetail(null)}>
                  关闭
                </Button>,
              ]
            : null
        }
      >
        {detail ? (
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              {detail.name}
              <span className="font-normal text-gray-500">（{detail.email}）</span>
            </p>
            {detail.phone ? <p className="mt-1">电话：{detail.phone}</p> : null}
            {detail.company ? <p className="mt-1">公司：{detail.company}</p> : null}
            <p className="mt-1">主题：{detail.subject}</p>
            <Divider style={{ margin: '12px 0' }} />
            <p className="whitespace-pre-wrap leading-6">{detail.message}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
