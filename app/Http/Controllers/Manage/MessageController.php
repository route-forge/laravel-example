<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * 管理端留言收件箱：只推进状态，不提供删除（留言是企业线索，删了找不回来）。
 */
class MessageController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::query()->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($keyword = trim((string) $request->query('keyword'))) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$keyword}%")
                ->orWhere('email', 'like', "%{$keyword}%")
                ->orWhere('subject', 'like', "%{$keyword}%")
                ->orWhere('message', 'like', "%{$keyword}%"));
        }

        return ContactMessageResource::collection($query->paginate(10)->withQueryString());
    }

    public function update(Request $request, ContactMessage $message): ContactMessageResource
    {
        $data = $request->validate(
            [
                'status' => ['required', Rule::in(ContactMessage::STATUSES)],
            ],
            [
                'status.required' => '请选择处理状态。',
            ],
        );

        $message->status = $data['status'];
        // 离开 new 记一次处理时间；退回 new 时清空，避免「未处理却有处理时间」
        $message->handled_at = $data['status'] === 'new' ? null : ($message->handled_at ?? now());
        $message->save();

        return new ContactMessageResource($message);
    }
}
