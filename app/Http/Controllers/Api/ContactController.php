<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 前台「联系企业」提交口（level = public）。
 *
 * 校验失败走 Laravel 默认的 422 + errors 结构，前端 useForgeApi 的 error 分支
 * 直接把 errors 摊到表单字段上，不做二次约定。
 */
class ContactController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            [
                'name'    => ['required', 'string', 'max:100'],
                'email'   => ['required', 'email', 'max:200'],
                'phone'   => ['nullable', 'string', 'max:50'],
                'company' => ['nullable', 'string', 'max:200'],
                'subject' => ['nullable', 'string', 'max:200'],
                'message' => ['required', 'string', 'min:10', 'max:5000'],
            ],
            [
                'name.required'    => '请填写称呼。',
                'email.required'   => '请填写邮箱。',
                'email.email'      => '邮箱格式不正确。',
                'message.required' => '请填写留言内容。',
                'message.min'      => '留言内容至少 10 个字，方便我们判断需求。',
            ],
        );

        ContactMessage::create($validated);

        return response()->json(['message' => '留言已收到，我们会尽快联系你。'], 201);
    }
}
