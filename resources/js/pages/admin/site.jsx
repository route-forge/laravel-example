import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Form, Input } from 'antd';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';

const { TextArea } = Input;

const EMPTY = {
  site_name: '',
  brand_slogan: '',
  logo_url: '',
  intro: '',
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  icp: '',
};

/** 单资源接口信封为 { data: {...} }，个别端点可能直接返回对象，做一次防御性解包。 */
const fieldsOf = (result) => {
  const body = bodyOf(result) ?? {};
  return body.data ?? body;
};

/**
 * 站点基础资料（site_settings 恒有一行的 singleton）：整表读写。
 * 双通道是本页最大特点 —— 读走 public 层的 api.site.show、写走 manage 层的 api.site.update；
 * 保存后以后端规范化后的响应体重新回填，而非用户提交值。
 */
export default function SitePage() {
  const { message } = App.useApp();
  const publicApi = useForgeApi({ level: 'public' });
  const manageApi = useForgeApi({ level: 'manage', prefix: 'api.manage' });
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await publicApi.call('api.site.show').catch((error) => ({ error }));
    setLoading(false);
    if (res.error) {
      message.error(messageOf(res.error));
      return;
    }
    form.setFieldsValue({ ...EMPTY, ...fieldsOf(res) });
  }, [publicApi.call, form, message]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values) {
    setSaving(true);
    const res = await manageApi.call('site.update', { body: { ...values } }).catch((error) => ({ error }));
    setSaving(false);
    if (res.error) {
      message.error(messageOf(res.error) || '保存失败。');
      return;
    }
    form.setFieldsValue({ ...EMPTY, ...fieldsOf(res) });
    message.success('基础资料已保存');
  }

  return (
    <Card
      title={
        <div>
          <div className="text-sm font-semibold">站点基础资料</div>
          <div className="mt-0.5 text-xs font-normal text-gray-400">前台首页品牌区 / 页脚的数据源</div>
        </div>
      }
      loading={loading}
      style={{ maxWidth: 672 }}
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save} initialValues={EMPTY}>
        <Form.Item label="站点名称" name="site_name" rules={[{ required: true, message: '请填写站点名称' }]}>
          <Input placeholder="某某科技" />
        </Form.Item>
        <Form.Item label="品牌口号" name="brand_slogan">
          <Input placeholder="一句话介绍，首页展示" />
        </Form.Item>
        <Form.Item label="Logo URL" name="logo_url">
          <Input placeholder="https://…" />
        </Form.Item>
        <Form.Item label="公司简介" name="intro">
          <TextArea rows={5} />
        </Form.Item>
        <Form.Item label="联系电话" name="contact_phone">
          <Input />
        </Form.Item>
        <Form.Item label="联系邮箱" name="contact_email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="hello@example.com" />
        </Form.Item>
        <Form.Item label="联系地址" name="contact_address">
          <Input />
        </Form.Item>
        <Form.Item label="备案号" name="icp">
          <Input placeholder="苏ICP备XXXXXXXX号（页脚展示）" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            保存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
