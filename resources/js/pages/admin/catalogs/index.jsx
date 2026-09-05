import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  App,
  Button,
  ColorPicker,
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
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf, pageOf } from '@/support/api.js';
import {
  BRAND_COLOR,
  CATALOG_STATUS_OPTIONS,
  SLUG_PATTERN,
} from '@/support/enums.js';

const { TextArea } = Input;

const EMPTY_FORM = {
  slug: '',
  title: '',
  subtitle: '',
  summary: '',
  cover_image: '',
  category_id: null,
  theme_color: BRAND_COLOR,
  status: 'draft',
  sort_order: 0,
};

/**
 * 画册管理：筛选 + 分页 + 新建/编辑弹窗 + 删除，并作为进入「画册页管理」的入口。
 * 仪表盘「已发布」卡带 ?status=published 跳入，故初始状态从 URL query 预置。
 */
export default function CatalogsPage() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [searchParams] = useSearchParams();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage.' });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [categories, setCategories] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      const res = await call('catalogs.index', {
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

  useEffect(() => {
    (async () => {
      const res = await call('categories.index').catch(() => ({}));
      setCategories(bodyOf(res)?.data ?? []);
    })();
  }, [call]);

  function openCreate() {
    setEditingId(null);
    form.setFieldsValue(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    form.setFieldsValue({
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? '',
      summary: row.summary ?? '',
      cover_image: row.cover_image ?? '',
      category_id: row.category?.id ?? null,
      theme_color: row.theme_color ?? BRAND_COLOR,
      status: row.status,
      sort_order: row.sort_order ?? 0,
    });
    setDialogOpen(true);
  }

  async function save() {
    const values = await form.validateFields();
    const color = typeof values.theme_color === 'string' ? values.theme_color : values.theme_color?.toHexString?.();
    const body = {
      ...values,
      theme_color: color,
      category_id: values.category_id ?? null,
      sort_order: Number(values.sort_order) || 0,
    };

    setSaving(true);
    const res = await (editingId
      ? call('catalogs.update', { params: { catalog: editingId }, body })
      : call('catalogs.store', { body })
    ).catch((error) => ({ error }));
    setSaving(false);

    if (res.error) {
      message.error(messageOf(res.error) || '保存失败。');
      return;
    }
    message.success(editingId ? '画册已更新' : '画册已创建');
    setDialogOpen(false);
    load(meta.current_page || 1);
  }

  function confirmRemove(row) {
    modal.confirm({
      title: '删除画册',
      content: `确定删除「${row.title}」？其全部画册页会一并删除。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await call('catalogs.destroy', { params: { catalog: row.id } }).catch((error) => ({ error }));
        if (res.error) {
          message.error(messageOf(res.error));
          return;
        }
        message.success('已删除');
        load(1);
      },
    });
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (_, row) => (
        <span>
          <span className="font-semibold text-gray-800">{row.title}</span>
          <span className="ml-2 text-xs text-gray-400">{row.slug}</span>
        </span>
      ),
    },
    { title: '分类', width: 120, render: (_, row) => row.category?.name ?? '未分类' },
    {
      title: '状态',
      width: 90,
      render: (_, row) =>
        row.status === 'published' ? <Tag color="success">已发布</Tag> : <Tag>草稿</Tag>,
    },
    { title: '页数', dataIndex: 'page_count', width: 70 },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => navigate(`/manage/catalogs/${row.id}/pages`)}>
            管理页面
          </Button>
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

  return (
    <div>
      <Space className="mb-4" wrap>
        <Input
          allowClear
          style={{ width: 224 }}
          placeholder="按标题 / slug 搜索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => load(1)}
        />
        <Select
          allowClear
          style={{ width: 128 }}
          placeholder="全部状态"
          value={status || undefined}
          onChange={(v) => setStatus(v ?? '')}
          options={CATALOG_STATUS_OPTIONS}
        />
        <Button onClick={() => load(1)}>查询</Button>
        <Button type="primary" onClick={openCreate}>
          新建画册
        </Button>
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
        title={editingId ? '编辑画册' : '新建画册'}
        width={560}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={save}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请填写标题' }]}>
            <Input placeholder="2026 年公司宣传画册" />
          </Form.Item>
          <Form.Item
            label="slug"
            name="slug"
            rules={[
              { required: true, message: '请填写 slug' },
              { pattern: SLUG_PATTERN, message: '小写字母、数字与单个连字符' },
            ]}
          >
            <Input placeholder="company-2026" />
          </Form.Item>
          <Form.Item label="副标题" name="subtitle">
            <Input />
          </Form.Item>
          <Form.Item label="摘要" name="summary">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item label="封面图 URL" name="cover_image">
            <Input placeholder="https://…（留空则用主题色装饰面板）" />
          </Form.Item>
          <Form.Item label="分类" name="category_id">
            <Select
              allowClear
              placeholder="未分类"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            label="主题色"
            name="theme_color"
            tooltip="前台翻页组件的进度条 / 书脊 / 页码取此色"
            rules={[{ required: true, message: '请选择主题色' }]}
          >
            <ColorPicker format="hex" showText />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Radio.Group options={CATALOG_STATUS_OPTIONS} optionType="button" />
          </Form.Item>
          <Form.Item label="排序" name="sort_order">
            <InputNumber min={0} max={999} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
