<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * 管理端登录（session 态，接口化）。
 *
 * 两个刻意的选择：
 * 1. 只返回 JSON：登录页是 SPA 里的一个前端路由，成功后由前端决定跳去哪，
 *    服务端不再 redirect()->intended()，也不渲染表单页。
 * 2. 登录与登出分属两个层级（见 routes/api.php）：登录 POST /api/auth/login 显式归
 *    public —— 登录时还没有会话，而 manage 层级的明细端点要求登录，不例外处理，
 *    前端连自己的登录接口都解析不出来；登出 POST /api/manage/auth/logout 归 manage，
 *    未登录本来就调不到，语义自洽。
 *
 * 本示例不引入 Sanctum/Breeze：route-forge 关心的不是「用哪种 guard」，而是登录之后
 * 前端仍只按 level + 路由名发请求，鉴权方式变化不外溢到调用点。
 */
class AuthController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate(
            [
                'email'    => ['required', 'email'],
                'password' => ['required', 'string'],
            ],
            [
                'email.required'    => '请填写登录邮箱。',
                'email.email'       => '邮箱格式不正确。',
                'password.required' => '请填写密码。',
            ],
        );

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => ['账号或密码不正确。']]);
        }

        if (! $request->user()->is_manager) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages(['email' => ['该账号没有管理端权限。']]);
        }

        // 防会话固定：登录成功后换 session id
        $request->session()->regenerate();

        return response()->json([
            'user' => [
                'name'  => $request->user()->name,
                'email' => $request->user()->email,
            ],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => '已退出登录。']);
    }
}
