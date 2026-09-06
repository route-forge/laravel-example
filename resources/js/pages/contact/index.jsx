import { useState } from 'react';
import { App, Alert, Button, Card, Form, Input } from 'antd';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

const { TextArea } = Input;

const EMPTY_FORM = { name: '', email: '', phone: '', company: '', subject: '', message: '' };

/**
 * 前台 · 联系与留言：左侧联系方式（站点基础资料）+ 右侧留言表单（api.contact.store）。
 *
 * 校验规则与 ContactController::store 逐条对齐 —— 这不是「顺手加个 required」，而是唯一
 * 有效的防线：core 的 HTTPError 不携带响应体，服务端 422 的 errors 到不了具体字段，
 * 只能作为兜底文案（限制记录在 support/api.js）。
 *
 * CSRF：POST 走 forge 请求链，X-XSRF-TOKEN 由 forge-options.js 的拦截器统一注入。
 */
export default function ContactPage() {
  const { message } = App.useApp();
  const { call } = useForgeApi({ level: 'public' });
  const { siteName, contacts, intro } = useSiteSettings();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  async function submit(values) {
    setSubmitting(true);
    setSentMessage('');

    const res = await call('api.contact.store', { body: { ...values } }).catch((error) => ({ error }));
    setSubmitting(false);

    if (res.error) {
      message.error(messageOf(res.error));
      return;
    }

    // 成功文案取服务端返回（后端是唯一真值源），拿不到才退回本地文案
    const text = bodyOf(res)?.message || '留言已收到，我们会尽快联系你。';
    setSentMessage(text);
    message.success(text);
    form.resetFields();
  }

  return (
    <div className="shell py-10 sm:py-14">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">联系我们</h1>
        <p className="lead mt-2">想要纸质画册、定制版本或某个行业的落地案例，留言给我们即可。</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* 联系方式 */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="text-base font-semibold text-gray-900">{siteName}</h2>
            {intro ? <p className="lead mt-2 text-sm">{intro}</p> : null}
            <ul className="mt-5 space-y-3 text-sm">
              {contacts.phone ? (
                <li className="flex gap-3">
                  <span className="w-14 shrink-0 text-gray-400">电话</span>
                  <a className="text-gray-800 hover:text-brand-600" href={`tel:${contacts.phone}`}>
                    {contacts.phone}
                  </a>
                </li>
              ) : null}
              {contacts.email ? (
                <li className="flex gap-3">
                  <span className="w-14 shrink-0 text-gray-400">邮箱</span>
                  <a className="text-gray-800 hover:text-brand-600" href={`mailto:${contacts.email}`}>
                    {contacts.email}
                  </a>
                </li>
              ) : null}
              {contacts.address ? (
                <li className="flex gap-3">
                  <span className="w-14 shrink-0 text-gray-400">地址</span>
                  <span className="text-gray-800">{contacts.address}</span>
                </li>
              ) : null}
              {!contacts.phone && !contacts.email && !contacts.address ? (
                <li className="text-gray-400">联系方式待后台补充</li>
              ) : null}
            </ul>
          </Card>

          <Card title="留言后会怎样">
            <p className="lead text-sm">
              留言进入后台「留言管理」，管理员可标记处理状态；我们会通过你留下的邮箱或电话回复。
            </p>
          </Card>
        </div>

        {/* 表单 */}
        <Card className="lg:col-span-3">
          {sentMessage ? <Alert className="mb-5" type="success" showIcon message={sentMessage} /> : null}

          <Form
            form={form}
            layout="vertical"
            initialValues={EMPTY_FORM}
            onFinish={submit}
          >
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item
                label="称呼"
                name="name"
                rules={[
                  { required: true, message: '请填写称呼' },
                  { max: 100, message: '称呼不超过 100 字' },
                ]}
              >
                <Input placeholder="怎么称呼你" />
              </Form.Item>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请填写邮箱' },
                  { type: 'email', message: '邮箱格式不正确' },
                  { max: 200, message: '邮箱不超过 200 字' },
                ]}
              >
                <Input placeholder="用于回复你" />
              </Form.Item>
              <Form.Item label="电话" name="phone" rules={[{ max: 50, message: '电话不超过 50 字' }]}>
                <Input placeholder="选填" />
              </Form.Item>
              <Form.Item label="公司" name="company" rules={[{ max: 200, message: '公司名不超过 200 字' }]}>
                <Input placeholder="选填" />
              </Form.Item>
            </div>
            <Form.Item label="主题" name="subject" rules={[{ max: 200, message: '主题不超过 200 字' }]}>
              <Input placeholder="例如：索取 2026 品牌画册纸质版" />
            </Form.Item>
            <Form.Item
              label="留言内容"
              name="message"
              rules={[
                { required: true, message: '请填写留言内容' },
                { min: 10, message: '留言内容至少 10 个字，方便我们判断需求' },
                { max: 5000, message: '留言内容不超过 5000 字' },
              ]}
            >
              <TextArea rows={5} maxLength={5000} showCount placeholder="至少 10 个字，说明场景与需求即可" />
            </Form.Item>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">带 * 的为必填项</span>
              <Button type="primary" htmlType="submit" loading={submitting}>
                提交留言
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
