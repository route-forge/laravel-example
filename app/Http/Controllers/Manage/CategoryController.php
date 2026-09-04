<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * 管理端分类维护（level = manage，web + manage 中间件保护）。
 *
 * 公开侧只有只读 index（见 Api\CategoryController）；这里提供全量 CRUD + 拖拽排序。
 */
class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->withCount('catalogs')
                ->get(),
        );
    }

    public function store(Request $request): CategoryResource
    {
        $category = Category::create($this->validated($request));

        return new CategoryResource($category);
    }

    public function update(Request $request, Category $category): CategoryResource
    {
        $category->update($this->validated($request, $category));

        return new CategoryResource($category->fresh());
    }

    public function destroy(Category $category): void
    {
        // 名下画册通过 FK nullOnDelete 自动回到「未分类」，无需额外处理
        $category->delete();
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer'],
        ]);

        $ids = array_values($data['ids']);

        $owned = Category::query()->whereIn('id', $ids)->pluck('id')->all();

        if (count($owned) !== count($ids)) {
            return response()->json(['message' => '存在未知分类 id。'], 422);
        }

        foreach ($ids as $index => $id) {
            Category::query()->whereKey($id)->update(['sort_order' => $index + 1]);
        }

        return response()->json(['message' => '已保存排序。']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Category $category = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'required', 'string', 'max:100',
                'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/',
                Rule::unique('categories', 'slug')->ignore($category?->id),
            ],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ], [
            'slug.regex'  => 'slug 只能用小写字母、数字与单个连字符。',
            'slug.unique' => '该 slug 已被占用。',
            'name.required' => '请填写分类名称。',
        ]);

        $data['sort_order'] ??= 0;

        return $data;
    }
}
