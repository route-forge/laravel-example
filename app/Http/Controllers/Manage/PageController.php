<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogPageResource;
use App\Models\Catalog;
use App\Models\CatalogPage;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * 管理端页面（画册内页）维护 + 拖拽排序。
 */
class PageController extends Controller
{
    public function index(Catalog $catalog)
    {
        return CatalogPageResource::collection($catalog->pages);
    }

    public function store(Request $request, Catalog $catalog): CatalogPageResource
    {
        $data = $this->validated($request);
        // 未指定页序时追加到末尾，避免和已有 sort_order 撞车
        $data['sort_order'] ??= ((int) $catalog->pages()->max('sort_order')) + 1;

        return new CatalogPageResource($catalog->pages()->create($data));
    }

    public function update(Request $request, CatalogPage $page): CatalogPageResource
    {
        $page->update($this->validated($request));

        return new CatalogPageResource($page->fresh());
    }

    public function destroy(CatalogPage $page): void
    {
        $page->delete();
    }

    /**
     * 整批回写页序：ids 的顺序即最终页序（1..n）。
     *
     * 只接受属于本画册的页面 id，越权 id 直接拒绝而不是静默忽略 ——
     * 静默会让「拖拽没生效」这类问题彻底无从排查。
     */
    public function reorder(Request $request, Catalog $catalog)
    {
        $data = $request->validate(
            [
                'ids'   => ['required', 'array', 'min:1'],
                'ids.*' => ['required', 'integer'],
            ],
            [
                'ids.required' => '缺少页序数据。',
            ],
        );

        $ids = array_values($data['ids']);

        $owned = CatalogPage::query()
            ->where('catalog_id', $catalog->id)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($owned) !== count($ids)) {
            return response()->json(['message' => '存在不属于本画册的页面 id。'], 422);
        }

        foreach ($ids as $index => $id) {
            CatalogPage::query()->whereKey($id)->update(['sort_order' => $index + 1]);
        }

        return CatalogPageResource::collection($catalog->pages()->get());
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate(
            [
                'title'      => ['nullable', 'string', 'max:200'],
                'body'       => ['nullable', 'string', 'max:20000'],
                'image'      => ['nullable', 'string', 'max:500'],
                'layout'     => ['required', Rule::in(CatalogPage::LAYOUTS)],
                'tone'       => ['required', Rule::in(CatalogPage::TONES)],
                'sort_order' => ['nullable', 'integer', 'min:1', 'max:200'],
            ],
            [
                'layout.required' => '请选择版式。',
                'tone.required'   => '请选择页面明暗。',
            ],
        );
    }
}
