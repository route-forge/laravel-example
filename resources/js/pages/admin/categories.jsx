import { useCallback, useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { App, Button, Form, Input, InputNumber, Modal, Space, Table } from 'antd';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';
import { SLUG_PATTERN } from '@/support/enums.js';

/**
 * 分类管理：表格 + 拖拽排序（sortablejs）+ 弹窗新建/编辑 + 删除。
 * reorder 用 categories.reorder（无 params，只传 ids 顺序）；删除提示名下画册将回到未分类
 * （后端 FK nullOnDelete）。此接口数据同时是画册弹窗的分类下拉源。
 */
export default function CategoriesPage() {
  const { message, modal } = App.useApp();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage' });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const tableWrapRef = useRef(null);
  const sortableRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await call('categories.index').catch((error) => ({ error }));
    setLoading(false);
    if (res.error) {
      message.error(messageOf(res.error));
      return;
    }
    setItems(bodyOf(res)?.data ?? []);
  }, [call, message]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tbody = tableWrapRef.current?.querySelector('.ant-table-tbody');
    if (!tbody) return;
    sortableRef.current?.destroy();
    sortableRef.current = new Sortable(tbody, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: ({ oldIndex, newIndex }) => {
        if (oldIndex === newIndex) return;
        const next = [...items];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        const ordered = next.map((c, i) => ({ ...c, sort_order: i + 1 }));
        setItems(ordered);
        submitOrder(ordered.map((c) => c.id));
      },
    });
    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, [items]);

  async function submitOrder(ids) {
    setSavingOrder(true);
    const res = await call('categories.reorder', { body: { ids } }).catch((error) => ({ error }));
    setSavingOrder(false);
    if (res.error) {
      message.error(messageOf(res.error));
      load();
    }
  }

  function openCreate() {
    setEditingId(null);
    form.setFieldsValue({ name: '', slug: '', sort_order: items.length + 1 });
    setDialogOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, slug: row.slug, sort_order: row.sort_order ?? 0 });
    setDialogOpen(true);
  }

  async function save() {
    const values = await form.validateFields();
    const body = { ...values, sort_order: Number(values.sort_order) || 0 };
    setSaving(true);
    const res = await (editingId
      ? call('categories.update', { params: { category: editingId }, body })
      : call('categories.store', { body })
    ).catch((error) => ({ error }));
    setSaving(false);
    if (res.error) {
      message.error(messageOf(res.error) || '保存失败。');
      return;
    }
    message.success(editingId ? '分类已更新' : '分类已创建');
    setDialogOpen(false);
    load();
  }

  function confirmRemove(row) {
    modal.confirm({
      title: '删除分类',
      content: `确定删除「${row.name}」？名下 ${row.catalogs_count ?? 0} 本画册将变为「未分类」。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await call('categories.destroy', { params: { category: row.id } }).catch((error) => ({ error }));
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
      render: () => <HolderOutlined className="drag-handle" style={{ cursor: 'move', color: '#9ca3af' }} />,
    },
    { title: '名称', dataIndex: 'name' },
    { title: 'slug', dataIndex: 'slug' },
    { title: '画册数', dataIndex: 'catalogs_count', width: 90 },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
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

  return (
    <div>
      <div className="mb-4">
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建分类
        </Button>
      </div>

      <div ref={tableWrapRef}>
        <Table
          rowKey="id"
          loading={loading || savingOrder}
          columns={columns}
          dataSource={items}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">拖动行即可排序，松手自动保存。</p>

      <Modal
        title={editingId ? '编辑分类' : '新建分类'}
        width={440}
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onOk={save}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请填写分类名称' }]}>
            <Input placeholder="公司宣传" />
          </Form.Item>
          <Form.Item
            label="slug"
            name="slug"
            rules={[
              { required: true, message: '请填写 slug' },
              { pattern: SLUG_PATTERN, message: '小写字母、数字与单个连字符' },
            ]}
          >
            <Input placeholder="company" />
          </Form.Item>
          <Form.Item label="排序" name="sort_order">
            <InputNumber min={0} max={999} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
