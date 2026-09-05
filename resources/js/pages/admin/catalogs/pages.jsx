import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Sortable from 'sortablejs';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, HolderOutlined } from '@ant-design/icons';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';
import { LAYOUT_LABELS, LAYOUT_OPTIONS, TONE_OPTIONS } from '@/support/enums.js';

const { TextArea } = Input;

const sortByOrder = (list) => [...list].sort((a, b) => a.sort_order - b.sort_order);

/**
 * 画册页管理：单本画册全部内页的列表、拖拽排序（sortablejs）与新增/编辑（六版式 + 明暗），
 * 弹窗右侧带实时预览占位。注意：页面编辑/删除用顶层路由名 pages.update / pages.destroy，
 * 排序用 catalogs.pages.reorder（三者不共享前缀结构）。
 */
export default function CatalogPagesPage() {
  const { catalogId } = useParams();
  const id = Number(catalogId);
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage.' });

  const [catalog, setCatalog] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const toneValue = Form.useWatch('tone', form);

  const tableWrapRef = useRef(null);
  const sortableRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await call('catalogs.show', { params: { catalog: id } }).catch((error) => ({ error }));
    setLoading(false);
    if (res.error) {
      message.error(messageOf(res.error));
      return;
    }
    const body = bodyOf(res) ?? {};
    setCatalog(body);
    setPages(sortByOrder(body.pages ?? []));
  }, [call, id, message]);

  useEffect(() => {
    load();
  }, [load]);

  // 拖拽排序：每次 pages 变化后在 tbody 上重建 Sortable 实例
  useEffect(() => {
    const tbody = tableWrapRef.current?.querySelector('.ant-table-tbody');
    if (!tbody) return;

    sortableRef.current?.destroy();
    sortableRef.current = new Sortable(tbody, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: ({ oldIndex, newIndex }) => {
        if (oldIndex === newIndex) return;
        const next = [...pages];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        const ordered = next.map((p, i) => ({ ...p, sort_order: i + 1 }));
        setPages(ordered);
        submitOrder(ordered.map((p) => p.id));
      },
    });
    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, [pages]);

  async function submitOrder(ids) {
    setSavingOrder(true);
    const res = await call('catalogs.pages.reorder', { params: { catalog: id }, body: { ids } }).catch((error) => ({
      error,
    }));
    setSavingOrder(false);
    if (res.error) {
      message.error(messageOf(res.error));
      load(); // 回滚：重拉服务端真实页序
    }
  }

  function openCreate() {
    setEditingId(null);
    form.setFieldsValue({ title: '', body: '', image: '', layout: 'text', tone: 'light', sort_order: pages.length + 1 });
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    form.setFieldsValue({
      title: row.title ?? '',
      body: row.body ?? '',
      image: row.image ?? '',
      layout: row.layout,
      tone: row.tone,
      sort_order: row.sort_order,
    });
    setDialogOpen(true);
  }

  async function save() {
    const values = await form.validateFields();
    const body = { ...values, sort_order: Number(values.sort_order) || 1 };
    setSaving(true);
    const res = await (editingId
      ? call('pages.update', { params: { page: editingId }, body })
      : call('catalogs.pages.store', { params: { catalog: id }, body })
    ).catch((error) => ({ error }));
    setSaving(false);
    if (res.error) {
      message.error(messageOf(res.error) || '保存失败。');
      return;
    }
    message.success(editingId ? '页面已更新' : '页面已新增');
    setDialogOpen(false);
    load();
  }

  function confirmRemove(row) {
    modal.confirm({
      title: '删除页面',
      content: `确定删除页面「${row.title || LAYOUT_LABELS[row.layout] || '未命名'}」？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await call('pages.destroy', { params: { page: row.id } }).catch((error) => ({ error }));
        if (res.error) {
          message.error(messageOf(res.error));
          return;
        }
        message.success('已删除');
        load();
      },
    });
  }

  const columns = [
    {
      title: '',
      width: 44,
      render: () => (
        <HolderOutlined className="drag-handle cursor-move text-gray-400" style={{ cursor: 'move' }} />
      ),
    },
    { title: '页序', dataIndex: 'sort_order', width: 70 },
    {
      title: '版式',
      width: 110,
      render: (_, row) => <Tag>{LAYOUT_LABELS[row.layout] ?? row.layout}</Tag>,
    },
    {
      title: '标题 / 正文',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.title || <span className="text-gray-400">（无标题）</span>}</div>
          {row.body ? <div className="truncate text-xs text-gray-400">{row.body}</div> : null}
        </div>
      ),
    },
    {
      title: '明暗',
      width: 80,
      render: (_, row) =>
        row.tone === 'dark' ? <Tag color="default">深色</Tag> : <Tag color="warning">浅色</Tag>,
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmRemove(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const previewLayout = Form.useWatch('layout', form);
  const previewTitle = Form.useWatch('title', form);
  const previewBody = Form.useWatch('body', form);

  return (
    <div>
      <Space className="mb-4" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/manage/catalogs')}>
            返回画册列表
          </Button>
          <span className="font-semibold text-gray-800">{catalog?.title ?? '画册页管理'}</span>
          {catalog?.slug ? <span className="text-xs text-gray-400">{catalog.slug}</span> : null}
        </Space>
        <Button type="primary" onClick={openCreate}>
          新增页面
        </Button>
      </Space>

      <div ref={tableWrapRef}>
        <Table
          rowKey="id"
          loading={loading || savingOrder}
          columns={columns}
          dataSource={pages}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">拖动行即可排序，松手自动保存。</p>

      <Modal
        title={editingId ? '编辑页面' : '新增页面'}
        width={720}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={save}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <div className="flex gap-6">
          <Form form={form} layout="vertical" requiredMark={false} className="flex-1 min-w-0">
            <Form.Item label="版式" name="layout" rules={[{ required: true, message: '请选择版式' }]}>
              <Select options={LAYOUT_OPTIONS} />
            </Form.Item>
            <Form.Item label="页面明暗" name="tone" rules={[{ required: true, message: '请选择明暗' }]}>
              <Radio.Group options={TONE_OPTIONS} optionType="button" />
            </Form.Item>
            <Form.Item label="标题" name="title">
              <Input placeholder="可留空" />
            </Form.Item>
            <Form.Item label="正文" name="body">
              <TextArea rows={8} placeholder="纯文本；后续支持 HTML 页后此处可写富文本" />
            </Form.Item>
            <Form.Item label="图片 URL" name="image">
              <Input placeholder="https://…（留空则按主题色生成装饰面板）" />
            </Form.Item>
            <Form.Item label="页序" name="sort_order">
              <InputNumber min={1} max={200} />
            </Form.Item>
          </Form>

          <div
            className={`w-48 shrink-0 rounded-lg border border-dashed p-4 text-xs ${
              toneValue === 'dark' ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-300 bg-white text-gray-500'
            }`}
          >
            <div className="mb-2 opacity-60">预览占位</div>
            <div className="font-medium">{LAYOUT_LABELS[previewLayout] ?? previewLayout} · {toneValue === 'dark' ? '深色' : '浅色'}</div>
            {previewTitle ? <div className="mt-2 font-semibold">{previewTitle}</div> : null}
            {previewBody ? <div className="mt-1 line-clamp-6">{previewBody}</div> : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
