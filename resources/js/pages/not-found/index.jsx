import { useNavigate } from 'react-router';
import { Button, Result } from 'antd';

/**
 * 前台 · 404。
 *
 * 服务端 catch-all 会把任意非 /api、/_forge 请求送进 SPA 壳页，所以「地址不存在」只有
 * react-router 能判定。没有这一页时未匹配路径会渲染成「页头页脚 + 中间空白」，
 * 访客与搜索引擎都会以为站点坏了 —— 必须给明确去向。
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="shell py-20 sm:py-28">
      <Result
        status="404"
        title="这个地址上没有内容"
        subTitle="链接可能写错或已经失效。从画册列表找，或者直接告诉我们你想要哪本画册。"
        extra={
          <div className="flex justify-center gap-3">
            <Button type="primary" shape="round" onClick={() => navigate('/catalogs')}>
              浏览画册
            </Button>
            <Button shape="round" onClick={() => navigate('/')}>
              回首页
            </Button>
          </div>
        }
      />
    </div>
  );
}
