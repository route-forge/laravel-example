<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogPage;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

/**
 * 后台首屏引导数据：SPA 只有一个空壳，登录者要的身份与统计数字改由这里给。
 *
 * 刻意放在 manage 层级（而不是塞进 Blade）：未登录者本来就读不到这一层，
 * 壳里也就不该漏出「有几个人在管、还有几条留言没处理」这类内部信息。
 */
class BootstrapController extends Controller
{
    public function __invoke(Request $request): array
    {
        return [
            'user' => [
                'name'       => $request->user()->name,
                'email'      => $request->user()->email,
                'is_manager' => $request->user()->is_manager,
            ],
            'stats' => [
                'catalogs'  => Catalog::query()->count(),
                'published' => Catalog::query()->where('status', Catalog::STATUS_PUBLISHED)->count(),
                'pages'     => CatalogPage::query()->count(),
                'messages'  => ContactMessage::query()->count(),
                'unread'    => ContactMessage::query()->where('status', 'new')->count(),
            ],
            // 前端据此决定退出登录后跳去哪个名字，而不是自己写死路径
            'links' => [
                'login' => route('api.auth.login'),
            ],
        ];
    }
}
