<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 企业管理端准入：`manage` 中间件别名（注册见 bootstrap/app.php）。
 *
 * 后端是纯 API（后台页面是前端 vue-router / React Router 的路由），因此只走 JSON 分支：
 *   - 未登录 → 401 JSON；
 *   - 已登录但非管理员 → 403 JSON。
 * 前端 useForgeApi 的 error 分支可直接消费，不必解析重定向。
 *
 * @see config/forge.php manage.endpoint_middleware —— 本中间件同时挂在
 *      GET /_forge/routes/manage 上，未登录者连管理端有哪些路由都读不到。
 */
class EnsureManageAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json(['message' => '管理端需先登录。'], 401);
        }

        if (! $user->is_manager) {
            return response()->json(['message' => '当前账号没有管理端权限。'], 403);
        }

        return $next($request);
    }
}
