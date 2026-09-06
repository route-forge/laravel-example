import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { App, Button, Card, Form, Input } from 'antd';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';

/**
 * 管理端登录页（SPA 内前端路由，独立于后台布局）。
 *
 * - 登录接口 api.auth.login 归 public 层级（登录时还没有会话），故用 public 实例、写全名；
 * - 已登录者访问本页会被 bootstrap 探测发现，直接送回仪表盘；
 * - 服务端只回 JSON，成功后跳哪由前端决定。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const publicApi = useForgeApi({ level: 'public' });
  const manageApi = useForgeApi({ level: 'manage', prefix: 'api.manage' });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 已登录就直接进后台
    (async () => {
      const res = await manageApi.call('bootstrap').catch((error) => ({ error }));
      if (!res.error) navigate('/manage/dashboard', { replace: true });
    })();
  }, [manageApi.call, navigate]);

  async function submit(values) {
    setSubmitting(true);
    try {
      const res = await publicApi.call('api.auth.login', { body: { ...values } });
      if (res.error) {
        message.error(messageOf(res.error) || '登录失败，请检查邮箱与密码。');
        return;
      }
      message.success(`欢迎回来，${bodyOf(res)?.user?.name ?? '管理员'}`);
      navigate('/manage/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-96">
        <h1 className="text-lg font-semibold text-gray-900">企业画册 · 管理端</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">请使用管理员账号登录</p>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ email: 'admin@forge.example', password: 'password' }}
          onFinish={submit}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, message: '请填写邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input type="email" placeholder="admin@forge.example" autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请填写密码' }]}>
            <Input.Password placeholder="••••••••" autoComplete="current-password" onPressEnter={() => form.submit()} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-2 text-center text-xs text-gray-400">演示账号 admin@forge.example / password</p>
      </Card>
    </div>
  );
}
