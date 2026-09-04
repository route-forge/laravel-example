<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogResource;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * 管理端画册 CRUD（level = manage，web + manage 中间件保护）。
 *
 * 与公开接口的关键差别：这里能看到 draft，且默认不带 pages（编辑时单独取）。
 */
class CatalogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Catalog::query()->with(['category'])->withCount('pages');

        if ($keyword = trim((string) $request->query('keyword'))) {
            $query->where(fn($q) => $q
                ->where('title', 'like', "%{$keyword}%")
                ->orWhere('slug', 'like', "%{$keyword}%"));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return CatalogResource::collection(
            $query->orderBy('sort_order')->orderByDesc('id')->paginate(10)->withQueryString(),
        );
    }

    public function show(Catalog $catalog): CatalogResource
    {
        return new CatalogResource($catalog->load(['pages', 'category']));
    }

    public function store(Request $request): CatalogResource
    {
        $catalog = Catalog::create($this->validated($request));

        return new CatalogResource($catalog);
    }

    public function update(Request $request, Catalog $catalog): CatalogResource
    {
        $catalog->update($this->validated($request, $catalog));

        return new CatalogResource($catalog->fresh('pages'));
    }

    public function destroy(Catalog $catalog): void
    {
        $catalog->delete();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Catalog $catalog = null): array
    {
        $data = $request->validate(
            [
                'slug'        => [
                    'required', 'string', 'max:120',
                    'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/',
                    Rule::unique('catalogs', 'slug')->ignore($catalog?->id),
                ],
                'title'       => ['required', 'string', 'max:200'],
                'subtitle'    => ['nullable', 'string', 'max:200'],
                'summary'     => ['nullable', 'string', 'max:2000'],
                'cover_image' => ['nullable', 'string', 'max:500'],
                'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')],
                'theme_color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
                'status'      => ['required', Rule::in([Catalog::STATUS_DRAFT, Catalog::STATUS_PUBLISHED])],
                'sort_order'  => ['nullable', 'integer', 'min:0', 'max:999'],
            ],
            [
                'slug.regex'        => 'slug 只能用小写字母、数字与单个连字符。',
                'slug.unique'       => '该 slug 已被占用。',
                'title.required'    => '请填写画册标题。',
                'theme_color.regex' => '主题色需为 #rrggbb 形式的十六进制值。',
            ],
        );

        $data['sort_order'] ??= 0;

        // 首次发布时补发布时间；草稿状态保留历史 published_at，便于判断曾经发布过
        if (($data['status'] ?? null) === Catalog::STATUS_PUBLISHED && $catalog?->published_at === null) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
