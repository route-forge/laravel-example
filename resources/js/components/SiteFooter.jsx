import { Link } from 'react-router';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

/**
 * 前台页脚：品牌简介 + 联系方式 + 快速导航 + 备案号。
 *
 * 联系方式全部来自站点基础资料；后台没填的字段整行隐藏，不留「电话：」这类半截标签。
 * 「管理入口」是示例项目的自用链接（访客进 /manage 会被后台门闩送回登录页），右下角弱化处理。
 */
export default function SiteFooter() {
  const { siteName, intro, contacts, icp } = useSiteSettings();
  const year = new Date().getFullYear();
  const hasContacts = Boolean(contacts.phone || contacts.email || contacts.address);

  return (
    <footer className="mt-20 border-t border-gray-200 bg-gray-50">
      <div className="shell grid gap-10 py-12 md:grid-cols-3">
        {/* 品牌 */}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{siteName}</h3>
          <p className="lead mt-3 line-clamp-4">{intro || '在线企业画册示例站，内容全部由后台维护。'}</p>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">联系我们</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {contacts.phone ? (
              <li>
                <a className="hover:text-brand-600" href={`tel:${contacts.phone}`}>
                  {contacts.phone}
                </a>
              </li>
            ) : null}
            {contacts.email ? (
              <li>
                <a className="hover:text-brand-600" href={`mailto:${contacts.email}`}>
                  {contacts.email}
                </a>
              </li>
            ) : null}
            {contacts.address ? <li className="leading-6">{contacts.address}</li> : null}
            {!hasContacts ? <li className="text-gray-400">联系方式待后台补充</li> : null}
          </ul>
          {hasContacts ? (
            <Link className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700" to="/contact">
              在线留言 →
            </Link>
          ) : null}
        </div>

        {/* 快速导航 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">快速导航</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>
              <Link className="hover:text-brand-600" to="/">
                首页
              </Link>
            </li>
            <li>
              <Link className="hover:text-brand-600" to="/catalogs">
                企业画册
              </Link>
            </li>
            <li>
              <Link className="hover:text-brand-600" to="/contact">
                联系我们
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* 版权与备案 */}
      <div className="border-t border-gray-200">
        <div className="shell flex flex-wrap items-center gap-x-4 gap-y-1 py-4 text-xs text-gray-500">
          <span>© {year} {siteName}</span>
          {icp ? <span>{icp}</span> : null}
          <Link className="ml-auto text-gray-400 hover:text-gray-600" to="/manage/dashboard">
            管理入口
          </Link>
        </div>
      </div>
    </footer>
  );
}
